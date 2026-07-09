import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoodConductWebhookService } from './good-conduct-webhook.service';
import { GoodConductTransaction } from '../good-conduct/entities/good-conduct-transaction.entity';
import {
  GoodConductRequest,
  GoodConductStatus,
  PaymentStatus,
} from '../good-conduct/entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from '../good-conduct/entities/good-conduct-status-history.entity';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';

const makeRequest = (overrides: Partial<GoodConductRequest> = {}): GoodConductRequest =>
  Object.assign(new GoodConductRequest(), {
    id: 'req-uuid-1',
    applicantId: 'applicant-1',
    phone: '+250781234567',
    status: GoodConductStatus.DRAFT,
    paymentStatus: PaymentStatus.PROCESSING,
    amountDue: 2000,
    amountPaid: 0,
    ...overrides,
  });

const makeTx = (overrides: Partial<GoodConductTransaction> = {}): GoodConductTransaction =>
  Object.assign(new GoodConductTransaction(), {
    id: 'tx-uuid-1',
    requestId: 'req-uuid-1',
    method: 'momo',
    providerRef: 'GC-req-uuid-1-1700000000000',
    amount: 2000,
    status: 'pending',
    ...overrides,
  });

describe('GoodConductWebhookService', () => {
  let service: GoodConductWebhookService;
  let txRepo: { findOne: jest.Mock; save: jest.Mock };
  let requestRepo: { findOne: jest.Mock; save: jest.Mock };
  let statusHistoryRepo: { create: jest.Mock; save: jest.Mock };
  let notifSettings: { isSmsEnabled: jest.Mock };
  let smsService: { sendSms: jest.Mock };

  beforeEach(async () => {
    txRepo = { findOne: jest.fn(), save: jest.fn((t) => Promise.resolve(t)) };
    requestRepo = { findOne: jest.fn(), save: jest.fn((r) => Promise.resolve(r)) };
    statusHistoryRepo = {
      create: jest.fn((d) => Object.assign(new GoodConductStatusHistory(), d)),
      save: jest.fn((h) => Promise.resolve(h)),
    };
    notifSettings = { isSmsEnabled: jest.fn().mockReturnValue(true) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodConductWebhookService,
        { provide: getRepositoryToken(GoodConductTransaction), useValue: txRepo },
        { provide: getRepositoryToken(GoodConductRequest), useValue: requestRepo },
        { provide: getRepositoryToken(GoodConductStatusHistory), useValue: statusHistoryRepo },
        { provide: NotificationSettingsService, useValue: notifSettings },
        { provide: SmsService, useValue: smsService },
      ],
    }).compile();

    service = module.get(GoodConductWebhookService);
  });

  it('safely ignores a payload with no matching provider_ref (no exception, no writes)', async () => {
    txRepo.findOne.mockResolvedValue(null);
    await expect(
      service.handleCallback({
        requesttransactionid: 'unknown-ref',
        status: 'Successfull',
        responsecode: '01',
      }),
    ).resolves.toBeUndefined();
    expect(txRepo.save).not.toHaveBeenCalled();
    expect(requestRepo.save).not.toHaveBeenCalled();
  });

  it('does nothing when the payload has no requesttransactionid at all', async () => {
    await service.handleCallback({ status: 'Successfull', responsecode: '01' });
    expect(txRepo.findOne).not.toHaveBeenCalled();
  });

  it('leaves everything untouched while the gateway status is still pending', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    await service.handleCallback({
      requesttransactionid: 'GC-req-uuid-1-1700000000000',
      status: 'Pending',
      responsecode: '1000',
    });
    expect(txRepo.save).not.toHaveBeenCalled();
    expect(requestRepo.save).not.toHaveBeenCalled();
  });

  it('on success: completes the transaction, marks payment paid, and advances draft -> submitted', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));

    await service.handleCallback({
      requesttransactionid: 'GC-req-uuid-1-1700000000000',
      status: 'Successfull',
      responsecode: '01',
    });

    expect(txRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(requestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.PAID,
        status: GoodConductStatus.SUBMITTED,
      }),
    );
    expect(statusHistoryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-uuid-1',
        fromStatus: GoodConductStatus.DRAFT,
        toStatus: GoodConductStatus.SUBMITTED,
      }),
    );
    // Both the submission SMS (fired on the draft->submitted transition) and
    // the payment-confirmed SMS fire on this path.
    expect(smsService.sendSms).toHaveBeenCalledTimes(2);
    expect(smsService.sendSms).toHaveBeenCalledWith(
      '+250781234567',
      expect.stringContaining('received'),
    );
    expect(smsService.sendSms).toHaveBeenCalledWith(
      '+250781234567',
      expect.stringContaining('Payment'),
    );
  });

  it('on success when the request is already past draft: pays it but does not re-advance status', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.UNDER_REVIEW }));

    await service.handleCallback({
      requesttransactionid: 'GC-req-uuid-1-1700000000000',
      status: 'Successfull',
      responsecode: '01',
    });

    expect(requestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.PAID,
        status: GoodConductStatus.UNDER_REVIEW,
      }),
    );
    expect(statusHistoryRepo.create).not.toHaveBeenCalled();
    // Only the payment-confirmed SMS fires — no submission SMS since it wasn't a draft->submitted move.
    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    expect(smsService.sendSms).toHaveBeenCalledWith(
      '+250781234567',
      expect.stringContaining('Payment'),
    );
  });

  it('on failure: marks the transaction failed and payment_status failed, leaving the request status untouched', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));

    await service.handleCallback({
      requesttransactionid: 'GC-req-uuid-1-1700000000000',
      status: 'Failed',
      responsecode: '1008',
    });

    expect(txRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(requestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.FAILED,
        status: GoodConductStatus.DRAFT,
      }),
    );
    expect(statusHistoryRepo.create).not.toHaveBeenCalled();
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('does not send SMS when the event is disabled in notification settings', async () => {
    notifSettings.isSmsEnabled.mockReturnValue(false);
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));

    await service.handleCallback({
      requesttransactionid: 'GC-req-uuid-1-1700000000000',
      status: 'Successfull',
      responsecode: '01',
    });

    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('does not throw and skips dispatch when the request has no phone number', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(
      makeRequest({ status: GoodConductStatus.DRAFT, phone: '' }),
    );

    await expect(
      service.handleCallback({
        requesttransactionid: 'GC-req-uuid-1-1700000000000',
        status: 'Successfull',
        responsecode: '01',
      }),
    ).resolves.toBeUndefined();
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('does nothing further if the request behind the transaction cannot be found', async () => {
    txRepo.findOne.mockResolvedValue(makeTx());
    requestRepo.findOne.mockResolvedValue(null);

    await expect(
      service.handleCallback({
        requesttransactionid: 'GC-req-uuid-1-1700000000000',
        status: 'Successfull',
        responsecode: '01',
      }),
    ).resolves.toBeUndefined();
    expect(requestRepo.save).not.toHaveBeenCalled();
  });
});
