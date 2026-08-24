import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { MarriageService } from './marriage.service';
import { MarriageApplication, PaymentStatus } from './entities/marriage-application.entity';
import { MarriageDocument } from './entities/marriage-document.entity';
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import { MarriagePartyConfirmation } from './entities/marriage-party-confirmation.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentGatewayService } from '../payments/payment-gateway.service';

/**
 * The applicant's waiting screen and its admin twin. Both used to call
 * IntouchPay directly with `MOMO_INTOUCH` credentials; both now go through the
 * gateway port, and these cases pin down what that has to keep doing.
 */
describe('MarriageService — payment status polling', () => {
  let service: MarriageService;
  let applicationRepo: { findOne: jest.Mock; save: jest.Mock };
  let transactionRepo: { findOne: jest.Mock; save: jest.Mock };
  let paymentGateway: { getStatus: jest.Mock };
  let smsService: { sendSms: jest.Mock };

  const APPLICANT = 'applicant-1';

  const makeApp = (overrides: Partial<MarriageApplication> = {}): MarriageApplication =>
    ({
      id: 'app-1',
      applicantId: APPLICANT,
      paymentStatus: PaymentStatus.PROCESSING,
      amountDue: 20000,
      amountPaid: 0,
      groomPhone: '+250781234567',
      ...overrides,
    }) as MarriageApplication;

  const makeTx = (overrides: Partial<MarriageTransaction> = {}): MarriageTransaction =>
    ({
      id: 'tx-1',
      applicationId: 'app-1',
      method: 'momo',
      status: 'pending',
      providerRef: 'MAR-app-1-1',
      metadata: {},
      ...overrides,
    }) as MarriageTransaction;

  beforeEach(async () => {
    applicationRepo = { findOne: jest.fn(), save: jest.fn((a) => Promise.resolve(a)) };
    transactionRepo = { findOne: jest.fn(), save: jest.fn((t) => Promise.resolve(t)) };
    paymentGateway = { getStatus: jest.fn() };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarriageService,
        { provide: getRepositoryToken(MarriageApplication), useValue: applicationRepo },
        { provide: getRepositoryToken(MarriageDocument), useValue: {} },
        {
          provide: getRepositoryToken(MarriageStatusHistory),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: getRepositoryToken(MarriageTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(MarriagePartyConfirmation), useValue: {} },
        { provide: getDataSourceToken(), useValue: { query: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: NotificationSettingsService,
          useValue: { isSmsEnabled: jest.fn().mockReturnValue(false) },
        },
        { provide: SmsService, useValue: smsService },
        { provide: PaymentSettingsService, useValue: { getRawSettings: jest.fn() } },
        { provide: PaymentGatewayService, useValue: paymentGateway },
      ],
    }).compile();

    service = module.get(MarriageService);
  });

  describe('checkUserMomoPaymentStatus', () => {
    it('short-circuits an already-paid application without touching the gateway', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp({ paymentStatus: PaymentStatus.PAID }));

      const result = await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      expect(result.paymentStatus).toBe('paid');
      expect(paymentGateway.getStatus).not.toHaveBeenCalled();
    });

    it('reports no active transaction when nothing is pending', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp());
      transactionRepo.findOne.mockResolvedValue(null);

      const result = await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      expect(result.gatewayStatus).toBe('PENDING');
      expect(paymentGateway.getStatus).not.toHaveBeenCalled();
    });

    it('marks the application paid and settles the transaction on success', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);
      const tx = makeTx();
      transactionRepo.findOne.mockResolvedValue(tx);
      paymentGateway.getStatus.mockResolvedValue({
        status: 'SUCCESSFUL',
        providerReference: 'INV-880099',
        responseCode: 'PAID',
        message: 'Paid via MTN_MOMO',
      });

      const result = await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      // Our own transaction id — the value the callback carries back.
      expect(paymentGateway.getStatus).toHaveBeenCalledWith('MAR-app-1-1');
      expect(tx.status).toBe('completed');
      expect(app.paymentStatus).toBe(PaymentStatus.PAID);
      expect(app.amountPaid).toBe(app.amountDue);
      expect(result.gatewayStatus).toBe('SUCCESSFUL');
    });

    it('marks the application failed on a failed gateway status', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);
      transactionRepo.findOne.mockResolvedValue(makeTx());
      paymentGateway.getStatus.mockResolvedValue({
        status: 'FAILED',
        providerReference: 'INV-880099',
        responseCode: 'EXPIRED',
      });

      await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      expect(app.paymentStatus).toBe(PaymentStatus.FAILED);
    });

    it('strips the legacy "|gatewayTxnId" suffix from a historical providerRef', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp());
      transactionRepo.findOne.mockResolvedValue(makeTx({ providerRef: 'MAR-app-1-1|GW-77' }));
      paymentGateway.getStatus.mockResolvedValue({
        status: 'PENDING',
        providerReference: 'INV-880099',
      });

      await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      expect(paymentGateway.getStatus).toHaveBeenCalledWith('MAR-app-1-1');
    });

    /**
     * The waiting screen is a read on a public-facing path. A gateway outage
     * must show "not available right now" and keep polling, never a 500 — and
     * above all it must not resolve the application either way.
     */
    it('degrades to PENDING when the gateway throws, leaving the application alone', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);
      transactionRepo.findOne.mockResolvedValue(makeTx());
      paymentGateway.getStatus.mockRejectedValue(new Error('No payment gateway is active'));

      const result = await service.checkUserMomoPaymentStatus('app-1', APPLICANT);

      expect(result.gatewayStatus).toBe('PENDING');
      expect(app.paymentStatus).toBe(PaymentStatus.PROCESSING);
      expect(applicationRepo.save).not.toHaveBeenCalled();
      expect(transactionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('adminGetMomoPaymentStatus', () => {
    it('re-checks by our own transaction id and settles the application', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);
      const tx = makeTx();
      transactionRepo.findOne.mockResolvedValue(tx);
      paymentGateway.getStatus.mockResolvedValue({
        status: 'SUCCESSFUL',
        providerReference: 'INV-880099',
        responseCode: 'PAID',
        message: 'Paid via MTN_MOMO',
      });

      const result = await service.adminGetMomoPaymentStatus('app-1', 'tx-1');

      expect(paymentGateway.getStatus).toHaveBeenCalledWith('MAR-app-1-1');
      expect(result.status).toBe('SUCCESSFUL');
      expect(app.paymentStatus).toBe(PaymentStatus.PAID);
    });

    /** A transaction that already settled must not be re-applied to the ledger. */
    it('does not re-settle a transaction that is no longer pending', async () => {
      const app = makeApp({ paymentStatus: PaymentStatus.PAID });
      applicationRepo.findOne.mockResolvedValue(app);
      transactionRepo.findOne.mockResolvedValue(makeTx({ status: 'completed' }));
      paymentGateway.getStatus.mockResolvedValue({
        status: 'SUCCESSFUL',
        providerReference: 'INV-880099',
      });

      await service.adminGetMomoPaymentStatus('app-1', 'tx-1');

      expect(transactionRepo.save).not.toHaveBeenCalled();
      expect(applicationRepo.save).not.toHaveBeenCalled();
    });
  });
});
