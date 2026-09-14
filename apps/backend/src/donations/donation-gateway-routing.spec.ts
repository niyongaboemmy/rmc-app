import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DonationsService } from './donations.service';
import { Donation, DonationStatus } from './entities/donation.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { SmsService } from '../integrations/sms/sms.service';
import { isOnlineDonationMethod, normalizeDonationMethod } from './donation-payment-method';

/**
 * Which donations reach the payment gateway.
 *
 * The rule these cases exist to protect: a donation is only written
 * `completed` without a gateway charge when the donor genuinely paid another
 * way. The previous implementation decided this with `dto.paymentMethod ===
 * 'momo'`, so `'MOMO'`, `'IREMBOPAY'` and `'card'` all fell through to the
 * offline branch and booked money as received that nobody had been asked for.
 */
describe('Donation gateway routing', () => {
  let service: DonationsService;
  let donations: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let paymentGateway: { getStatus: jest.Mock; canCharge: jest.Mock; charge: jest.Mock };

  const chargeResult = {
    status: 'PENDING' as const,
    provider: 'irembopay',
    providerReference: '880519100001',
    domainReference: '',
    responseCode: 'NEW',
    message: 'Invoice created',
    paymentLinkUrl: 'https://pay.example/1',
    publicKey: 'pk_test',
    widgetScriptUrl: 'https://widget.example/inline.js',
  };

  beforeEach(async () => {
    let seq = 0;
    donations = {
      findOne: jest.fn(),
      // `save` must echo an id back: the service builds the `DON-` transaction
      // id from it, which is what the webhook later matches on.
      save: jest.fn((d) =>
        Promise.resolve(
          Array.isArray(d) ? d : { id: `1234abcd-0000-0000-0000-00000000000${++seq}`, ...d },
        ),
      ),
      create: jest.fn((d) => d),
    };
    paymentGateway = {
      getStatus: jest.fn(),
      canCharge: jest.fn().mockResolvedValue(true),
      charge: jest.fn().mockResolvedValue(chargeResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: donations },
        { provide: getRepositoryToken(DonationCampaign), useValue: { findOne: jest.fn() } },
        { provide: PaymentGatewayService, useValue: paymentGateway },
        { provide: SmsService, useValue: { sendSms: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(DonationsService);
  });

  const base = { amount: 5000, donorPhone: '0781234567' };

  describe('classification', () => {
    it.each(['momo', 'MOMO', 'MoMo', ' momo ', 'irembopay', 'IREMBOPAY', 'card', 'CARD'])(
      'treats %j as an online method',
      (value) => {
        expect(isOnlineDonationMethod(value)).toBe(true);
      },
    );

    // Once the offline list, now simply unrecognised. Nothing settles without a
    // gateway any more, so every one of these is refused rather than recorded.
    it.each(['cash', 'bank', 'cheque', 'paypal', 'other', '', '   ', null, undefined])(
      'treats %j as not collectable, so not chargeable',
      (value) => {
        expect(isOnlineDonationMethod(value)).toBe(false);
      },
    );

    it('canonicalises the provider name to the channel it means', () => {
      expect(normalizeDonationMethod('IremboPay')).toBe('momo');
      expect(normalizeDonationMethod('  CARD ')).toBe('card');
      expect(normalizeDonationMethod(null)).toBeNull();
    });
  });

  describe('create()', () => {
    // The regression itself: each of these once produced a `completed`
    // donation with no payment reference.
    it.each(['momo', 'MOMO', 'MoMo', 'irembopay', 'IREMBOPAY', 'card'])(
      'routes %j to the gateway and leaves the donation pending',
      async (paymentMethod) => {
        const saved = await service.create({ ...base, paymentMethod } as never, null);

        expect(paymentGateway.charge).toHaveBeenCalledTimes(1);
        expect(saved.status).toBe(DonationStatus.PENDING);
        expect(saved.paymentReference).toMatch(/^DON-/);
      },
    );

    it('stores the canonical method, not the spelling the client happened to send', async () => {
      const saved = await service.create({ ...base, paymentMethod: 'IREMBOPAY' } as never, null);

      expect(saved.paymentMethod).toBe('momo');
    });

    // These once produced a `completed` donation with no payment reference, and
    // this route is @Public() — so it was an unauthenticated way to record money
    // as received. RMC collects through IremboPay only, so there is no method
    // that legitimately settles without a gateway: they are refused outright.
    it.each(['cash', 'bank', 'paypal'])(
      'refuses %j rather than recording it as already received',
      async (paymentMethod) => {
        await expect(
          service.create({ ...base, paymentMethod } as never, null),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(paymentGateway.charge).not.toHaveBeenCalled();
        expect(donations.save).not.toHaveBeenCalled();
      },
    );

    it('pushes a MoMo prompt only for a MoMo donation', async () => {
      await service.create({ ...base, paymentMethod: 'momo' } as never, null);
      expect(paymentGateway.charge.mock.calls[0][0].pushProvider).toBe('MTN');

      paymentGateway.charge.mockClear();
      await service.create({ ...base, paymentMethod: 'card' } as never, null);
      expect(paymentGateway.charge.mock.calls[0][0].pushProvider).toBeUndefined();
    });

    it('still issues a card invoice when no phone number was given', async () => {
      const saved = await service.create({ amount: 5000, paymentMethod: 'card' } as never, null);

      expect(paymentGateway.charge).toHaveBeenCalledTimes(1);
      expect(saved.status).toBe(DonationStatus.PENDING);
    });

    // The other half of the bug: an online donation the gateway cannot collect
    // must fail, not quietly become a completed one.
    it('refuses an online donation when no gateway can charge', async () => {
      paymentGateway.canCharge.mockResolvedValue(false);

      // 503, not 400: an inactive gateway is ours to fix, not the donor's error.
      await expect(
        service.create({ ...base, paymentMethod: 'momo' } as never, null),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(paymentGateway.charge).not.toHaveBeenCalled();
    });

    it('refuses an offline donation whether or not a gateway could charge', async () => {
      paymentGateway.canCharge.mockResolvedValue(false);

      await expect(
        service.create({ ...base, paymentMethod: 'cash' } as never, null),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createCart()', () => {
    const item = (paymentMethod: string) => ({ ...base, paymentMethod }) as never;

    it('routes a card basket to the gateway', async () => {
      const result = await service.createCart([item('card'), item('card')], null, 'card');

      expect(paymentGateway.charge).toHaveBeenCalledTimes(1);
      expect(result.transactionId).toMatch(/^DON-/);
      expect(result.donations.every((d) => d.status === DonationStatus.PENDING)).toBe(true);
    });

    it('charges a mixed-case basket once, as one payment', async () => {
      const result = await service.createCart([item('MOMO'), item('momo')], null, 'momo');

      expect(paymentGateway.charge).toHaveBeenCalledTimes(1);
      expect(paymentGateway.charge.mock.calls[0][0].amount).toBe(10000);
      expect(result.donations.every((d) => d.paymentReference === result.transactionId)).toBe(true);
    });

    // One bad item fails the whole basket rather than quietly settling the rest
    // — it is one payment, so it cannot be partly collected.
    it('rejects a basket where any item names a method we cannot collect', async () => {
      await expect(
        service.createCart([item('momo'), item('cash')], null, 'momo'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paymentGateway.charge).not.toHaveBeenCalled();
    });

    it('refuses an online basket when no gateway can charge', async () => {
      paymentGateway.canCharge.mockResolvedValue(false);

      await expect(service.createCart([item('momo')], null, 'momo')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('requires a phone number for a MoMo basket', async () => {
      await expect(
        service.createCart([{ amount: 5000, paymentMethod: 'momo' } as never], null, 'momo'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an uncollectable basket rather than recording it without charging', async () => {
      await expect(
        service.createCart([item('cash'), item('bank')], null, 'momo'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(paymentGateway.charge).not.toHaveBeenCalled();
      expect(donations.save).not.toHaveBeenCalled();
    });
  });
});
