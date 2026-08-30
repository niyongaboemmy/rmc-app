import {
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DonationsService } from './donations.service';
import { Donation, DonationStatus } from './entities/donation.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { SmsService } from '../integrations/sms/sms.service';

/**
 * `refreshPaymentStatus` is the donor-facing "did my payment go through?" path.
 * It used to call IntouchPay directly with `MOMO_INTOUCH` credentials; it now
 * goes through the gateway port, which is what these cases pin down.
 */
describe('DonationsService.refreshPaymentStatus', () => {
  let service: DonationsService;
  let donations: { findOne: jest.Mock; save: jest.Mock };
  let paymentGateway: { getStatus: jest.Mock; canCharge: jest.Mock; charge: jest.Mock };
  let smsService: { sendSms: jest.Mock };

  const makeDonation = (overrides: Partial<Donation> = {}): Donation =>
    ({
      id: 'don-1',
      status: DonationStatus.PENDING,
      paymentReference: 'DON-abc12345-1',
      amount: 5000,
      currency: 'RWF',
      donorName: 'Amina',
      donorPhone: '+250781234567',
      gatewayResponseCode: null,
      gatewayMessage: null,
      ...overrides,
    }) as Donation;

  beforeEach(async () => {
    donations = { findOne: jest.fn(), save: jest.fn((d) => Promise.resolve(d)) };
    paymentGateway = {
      getStatus: jest.fn(),
      canCharge: jest.fn().mockResolvedValue(true),
      charge: jest.fn(),
    };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: donations },
        { provide: getRepositoryToken(DonationCampaign), useValue: { findOne: jest.fn() } },
        { provide: PaymentGatewayService, useValue: paymentGateway },
        { provide: SmsService, useValue: smsService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(DonationsService);
  });

  it('404s on an unknown donation', async () => {
    donations.findOne.mockResolvedValue(null);

    await expect(service.refreshPaymentStatus('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('completes the donation and sends the confirmation SMS on a successful status', async () => {
    donations.findOne.mockResolvedValue(makeDonation());
    paymentGateway.getStatus.mockResolvedValue({
      status: 'SUCCESSFUL',
      providerReference: 'INV-880099',
      responseCode: 'PAID',
      message: 'Paid via MTN_MOMO',
    });

    const result = await service.refreshPaymentStatus('don-1');

    expect(paymentGateway.getStatus).toHaveBeenCalledWith('DON-abc12345-1');
    expect(result.status).toBe(DonationStatus.COMPLETED);
    expect(result.gatewayResponseCode).toBe('PAID');
    expect(donations.save).toHaveBeenCalled();
    expect(smsService.sendSms).toHaveBeenCalledWith('+250781234567', expect.any(String));
  });

  it('fails the donation on a failed status, without sending a confirmation', async () => {
    donations.findOne.mockResolvedValue(makeDonation());
    paymentGateway.getStatus.mockResolvedValue({
      status: 'FAILED',
      providerReference: 'INV-880099',
      responseCode: 'EXPIRED',
      message: 'Invoice expired before payment',
    });

    const result = await service.refreshPaymentStatus('don-1');

    expect(result.status).toBe(DonationStatus.FAILED);
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('leaves a still-pending donation untouched and unsaved', async () => {
    donations.findOne.mockResolvedValue(makeDonation());
    paymentGateway.getStatus.mockResolvedValue({
      status: 'PENDING',
      providerReference: 'INV-880099',
      responseCode: 'NEW',
      message: 'Awaiting payment',
    });

    const result = await service.refreshPaymentStatus('don-1');

    expect(result.status).toBe(DonationStatus.PENDING);
    expect(donations.save).not.toHaveBeenCalled();
  });

  /**
   * Records written before the migration store `requestTxnId|gatewayTxnId`. The
   * gateway resolves our own id, so the legacy suffix has to come off — passing
   * the raw pair would 404 at the provider and strand the donation forever.
   */
  it('strips the legacy "|gatewayTxnId" suffix from a historical reference', async () => {
    donations.findOne.mockResolvedValue(
      makeDonation({ paymentReference: 'DON-abc12345-1|GW-4471' }),
    );
    paymentGateway.getStatus.mockResolvedValue({
      status: 'SUCCESSFUL',
      providerReference: 'INV-880099',
    });

    await service.refreshPaymentStatus('don-1');

    expect(paymentGateway.getStatus).toHaveBeenCalledWith('DON-abc12345-1');
  });

  /**
   * A refresh is a read. If no gateway is active, or the provider is
   * unreachable, the donor gets their donation back unchanged — the
   * reconciliation cron is what eventually resolves it.
   */
  it('returns the donation unchanged when the gateway throws', async () => {
    donations.findOne.mockResolvedValue(makeDonation());
    paymentGateway.getStatus.mockRejectedValue(new Error('No payment gateway is active'));

    const result = await service.refreshPaymentStatus('don-1');

    expect(result.status).toBe(DonationStatus.PENDING);
    expect(donations.save).not.toHaveBeenCalled();
  });

  it('never contacts the gateway for an already-settled donation', async () => {
    donations.findOne.mockResolvedValue(makeDonation({ status: DonationStatus.COMPLETED }));

    await service.refreshPaymentStatus('don-1');

    expect(paymentGateway.getStatus).not.toHaveBeenCalled();
  });

  it('never contacts the gateway for a donation with no payment reference', async () => {
    donations.findOne.mockResolvedValue(makeDonation({ paymentReference: null }));

    await service.refreshPaymentStatus('don-1');

    expect(paymentGateway.getStatus).not.toHaveBeenCalled();
  });
});

/**
 * What happens to a donation when the payment provider does not answer.
 *
 * `charge()` throws only after the client has already retried a 429/5xx three
 * times, so by the time it lands here the provider is genuinely unreachable
 * rather than merely slow. The donation must not stay `pending`: a pending row
 * with no `paymentReference` is skipped forever by the reconciliation sweeper
 * (it filters on that column), so it would never be re-checked or cleaned up
 * while still counting toward campaign totals as money on its way.
 */
describe('DonationsService.create — provider unreachable', () => {
  let service: DonationsService;
  let donations: { create: jest.Mock; save: jest.Mock };
  let paymentGateway: { getStatus: jest.Mock; canCharge: jest.Mock; charge: jest.Mock };

  const dto = {
    amount: 5000,
    paymentMethod: 'momo',
    donorPhone: '+250781234567',
    donorName: 'Amina',
  } as never;

  beforeEach(async () => {
    donations = {
      create: jest.fn((d) => ({ id: 'don-1', ...d })),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    paymentGateway = {
      getStatus: jest.fn(),
      canCharge: jest.fn().mockResolvedValue(true),
      charge: jest.fn().mockRejectedValue(new Error('IremboPay request timed out after 30000ms')),
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

  it('rejects with a 503 rather than the 500 a bare Error would surface', async () => {
    await expect(service.create(dto, null)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  /**
   * The last save is the one failUnreachable performs (the first created the row).
   * It saves the whole batch, so the argument is an array even for a single donation.
   */
  const lastSaved = () => donations.save.mock.calls.at(-1)?.[0][0];

  it('marks the donation failed instead of leaving it pending', async () => {
    await expect(service.create(dto, null)).rejects.toThrow();

    const saved = lastSaved();
    expect(saved).toMatchObject({
      status: DonationStatus.FAILED,
      gatewayResponseCode: 'UNREACHABLE',
    });
  });

  it('records the provider error, trimmed to the column width', async () => {
    paymentGateway.charge.mockRejectedValue(new Error('x'.repeat(400)));

    await expect(service.create(dto, null)).rejects.toThrow();

    expect(lastSaved().gatewayMessage).toHaveLength(255);
  });

  it('leaves paymentReference null — there is no provider-side record to point at', async () => {
    await expect(service.create(dto, null)).rejects.toThrow();

    expect(lastSaved().paymentReference).toBeUndefined();
  });

  it('still 503s when the failed-status write itself fails', async () => {
    donations.save
      .mockImplementationOnce((d) => Promise.resolve(d)) // the initial create
      .mockRejectedValueOnce(new Error('database is down'));

    await expect(service.create(dto, null)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

/**
 * A donation must never be recorded as received when nobody was charged.
 *
 * Both creation routes are `@Public()` and both used to fall back to
 * `status = completed` whenever the gateway could not be used, which meant
 * "we cannot charge you" was written down as "you have paid".
 */
describe('DonationsService — never completed without payment', () => {
  let service: DonationsService;
  let donations: { create: jest.Mock; save: jest.Mock };
  let paymentGateway: { getStatus: jest.Mock; canCharge: jest.Mock; charge: jest.Mock };

  const item = (over: Record<string, unknown> = {}) =>
    ({
      amount: 5000,
      paymentMethod: 'momo',
      donorPhone: '+250781234567',
      ...over,
    }) as never;

  beforeEach(async () => {
    donations = {
      create: jest.fn((d) => ({ id: 'don-1', ...d })),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    paymentGateway = {
      getStatus: jest.fn(),
      canCharge: jest.fn().mockResolvedValue(true),
      charge: jest.fn().mockResolvedValue({ status: 'PENDING', domainReference: 'DON-x' }),
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

  const savedStatuses = () =>
    donations.save.mock.calls.flatMap((c) => (Array.isArray(c[0]) ? c[0] : [c[0]])).map((d) => d.status);

  it('refuses with a 503 when no provider is configured, rather than booking it paid', async () => {
    paymentGateway.canCharge.mockResolvedValue(false);

    await expect(service.create(item(), null)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(savedStatuses()).not.toContain(DonationStatus.COMPLETED);
  });

  it('refuses an unauthenticated "cash" donation instead of minting a completed one', async () => {
    await expect(service.create(item({ paymentMethod: 'cash' }), null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(donations.save).not.toHaveBeenCalled();
  });

  // A single momo donation with no phone is NOT refused: it issues an invoice
  // with no push, which the donor settles from the payment link. What matters
  // here is only that it still reaches the gateway rather than being booked as
  // received. (The cart's momo channel does require a number, since its whole
  // point is the prompt — covered in donation-gateway-routing.spec.ts.)
  it('charges mobile money with no phone rather than booking it paid', async () => {
    await service.create(item({ donorPhone: undefined }), null);

    expect(paymentGateway.charge).toHaveBeenCalled();
    expect(savedStatuses()).not.toContain(DonationStatus.COMPLETED);
  });

  it('records the donation as pending when it can actually be charged', async () => {
    await service.create(item(), null);

    expect(savedStatuses()).toEqual([DonationStatus.PENDING, DonationStatus.PENDING]);
  });

  // The card flow deliberately allows an empty phone. Requiring one made the whole
  // basket fall through to "assume paid" while the donor was told card was unavailable.
  it('charges a card basket that carries no phone, rather than booking it paid', async () => {
    await service.createCart([item({ donorPhone: undefined })], null, 'card');

    expect(paymentGateway.charge).toHaveBeenCalled();
    expect(savedStatuses()).not.toContain(DonationStatus.COMPLETED);
  });

  it('still refuses a momo basket that carries no phone', async () => {
    await expect(
      service.createCart([item({ donorPhone: undefined })], null, 'momo'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentGateway.charge).not.toHaveBeenCalled();
  });
});
