import { NotFoundException } from '@nestjs/common';
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
