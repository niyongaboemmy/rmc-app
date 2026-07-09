import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GoodConductService } from './good-conduct.service';
import {
  GoodConductRequest,
  GoodConductStatus,
  GoodConductMotif,
  PaymentStatus,
} from './entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from './entities/good-conduct-status-history.entity';
import { GoodConductTransaction } from './entities/good-conduct-transaction.entity';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { CreateGoodConductRequestDto } from './dto/create-good-conduct-request.dto';
import { GoodConductStatusAction } from './dto/update-good-conduct-status.dto';
import { User } from '../users/entities/user.entity';
import { MosqueImam } from '../mosques/entities/mosque-imam.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { District } from '../locations/entities/district.entity';
import { Sector } from '../locations/entities/sector.entity';
import { ConfigService } from '@nestjs/config';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import { getDataSourceToken } from '@nestjs/typeorm';

const makeRequest = (overrides: Partial<GoodConductRequest> = {}): GoodConductRequest =>
  Object.assign(new GoodConductRequest(), {
    id: 'req-uuid-1',
    applicantId: 'applicant-1',
    fullNames: 'Jane Doe',
    phone: '+250781234567',
    motif: GoodConductMotif.EMPLOYMENT,
    status: GoodConductStatus.DRAFT,
    paymentStatus: PaymentStatus.UNPAID,
    amountDue: 2000,
    amountPaid: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

const baseDto: CreateGoodConductRequestDto = {
  fullNames: 'Jane Doe',
  phone: '+250781234567',
  motif: GoodConductMotif.EMPLOYMENT,
} as CreateGoodConductRequestDto;

describe('GoodConductService', () => {
  let service: GoodConductService;
  let requestRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let statusHistoryRepo: { create: jest.Mock; save: jest.Mock };
  let transactionRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let mosqueImamRepo: { findOne: jest.Mock };
  let mosqueRepo: { findOne: jest.Mock };
  let districtRepo: { findOne: jest.Mock };
  let sectorRepo: { findOne: jest.Mock };
  let dataSource: { query: jest.Mock };
  let paymentSettings: { getActiveRates: jest.Mock; getRawSettings: jest.Mock };
  let configService: { get: jest.Mock };
  let intouchPay: { requestPayment: jest.Mock; getTransactionStatus: jest.Mock };
  let notifSettings: { isSmsEnabled: jest.Mock; isEmailEnabled: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    requestRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
      create: jest.fn((d) => Object.assign(new GoodConductRequest(), d)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    statusHistoryRepo = {
      create: jest.fn((d) => Object.assign(new GoodConductStatusHistory(), d)),
      save: jest.fn((h) => Promise.resolve(h)),
    };
    transactionRepo = {
      create: jest.fn((d) => Object.assign(new GoodConductTransaction(), d)),
      save: jest.fn((t) => Promise.resolve(t)),
      findOne: jest.fn(),
    };
    userRepo = { findOne: jest.fn().mockResolvedValue(null) };
    mosqueImamRepo = { findOne: jest.fn() };
    mosqueRepo = { findOne: jest.fn().mockResolvedValue(null) };
    districtRepo = { findOne: jest.fn().mockResolvedValue(null) };
    sectorRepo = { findOne: jest.fn().mockResolvedValue(null) };
    dataSource = { query: jest.fn().mockResolvedValue([{ seq: '1' }]) };
    paymentSettings = {
      getActiveRates: jest.fn().mockResolvedValue([]),
      getRawSettings: jest.fn().mockResolvedValue({
        username: 'user',
        partnerPassword: 'pass',
        accountNo: 'acc',
        callbackUrl: '',
        gatewayUrl: '',
      }),
    };
    configService = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    intouchPay = { requestPayment: jest.fn(), getTransactionStatus: jest.fn() };
    notifSettings = {
      isSmsEnabled: jest.fn().mockReturnValue(true),
      isEmailEnabled: jest.fn().mockReturnValue(true),
    };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodConductService,
        { provide: getRepositoryToken(GoodConductRequest), useValue: requestRepo },
        { provide: getRepositoryToken(GoodConductStatusHistory), useValue: statusHistoryRepo },
        { provide: getRepositoryToken(GoodConductTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(MosqueImam), useValue: mosqueImamRepo },
        { provide: getRepositoryToken(Mosque), useValue: mosqueRepo },
        { provide: getRepositoryToken(District), useValue: districtRepo },
        { provide: getRepositoryToken(Sector), useValue: sectorRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: PaymentSettingsService, useValue: paymentSettings },
        { provide: ConfigService, useValue: configService },
        { provide: IntouchPayService, useValue: intouchPay },
        { provide: NotificationSettingsService, useValue: notifSettings },
        { provide: SmsService, useValue: smsService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(GoodConductService);
  });

  // ── createDraft ──────────────────────────────────────────────────────────

  describe('createDraft', () => {
    it('creates a draft with the fallback fee when no rate is configured', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      const result = await service.createDraft('applicant-1', baseDto);

      expect(result.status).toBe(GoodConductStatus.DRAFT);
      expect(result.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(result.amountDue).toBe(2000);
      expect(statusHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fromStatus: null, toStatus: GoodConductStatus.DRAFT }),
      );
      // Submission SMS fires on the SUBMITTED transition, not draft creation —
      // draft isn't yet a real commitment.
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it('uses the configured active rate when available', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      paymentSettings.getActiveRates.mockResolvedValue([{ amount: '3500' }]);

      const result = await service.createDraft('applicant-1', baseDto);
      expect(result.amountDue).toBe(3500);
    });

    it('rejects a new draft when an active request already exists', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );

      await expect(service.createDraft('applicant-1', baseDto)).rejects.toThrow(ConflictException);
    });

    it.each([
      GoodConductStatus.DRAFT,
      GoodConductStatus.SUBMITTED,
      GoodConductStatus.UNDER_REVIEW,
      GoodConductStatus.MORE_INFO_REQUESTED,
      GoodConductStatus.APPROVED,
    ])('blocks duplicate creation while an existing request is %s', async (status) => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status }));
      await expect(service.createDraft('applicant-1', baseDto)).rejects.toThrow(ConflictException);
    });

    it.each([GoodConductStatus.REJECTED, GoodConductStatus.CANCELLED, GoodConductStatus.CLOSED])(
      'allows a new draft when the only prior request is %s',
      async (_status) => {
        // findOne with In(ACTIVE_STATUSES) would not match a non-active status — simulate that by returning null
        requestRepo.findOne.mockResolvedValue(null);
        const result = await service.createDraft('applicant-1', baseDto);
        expect(result.status).toBe(GoodConductStatus.DRAFT);
      },
    );
  });

  // ── updateDraft ──────────────────────────────────────────────────────────

  describe('updateDraft', () => {
    it('allows updating a draft request', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      const result = await service.updateDraft('req-uuid-1', 'applicant-1', {
        fullNames: 'Jane Updated',
      });
      expect(result.fullNames).toBe('Jane Updated');
    });

    it('allows updating a more_info_requested request', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.MORE_INFO_REQUESTED }),
      );
      const result = await service.updateDraft('req-uuid-1', 'applicant-1', {
        fullNames: 'Jane Updated',
      });
      expect(result.fullNames).toBe('Jane Updated');
    });

    it.each([
      GoodConductStatus.SUBMITTED,
      GoodConductStatus.UNDER_REVIEW,
      GoodConductStatus.APPROVED,
      GoodConductStatus.REJECTED,
      GoodConductStatus.CANCELLED,
      GoodConductStatus.CLOSED,
    ])('rejects updating a request in status %s', async (status) => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status }));
      await expect(
        service.updateDraft('req-uuid-1', 'applicant-1', { fullNames: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing request', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.updateDraft('missing', 'applicant-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the request belongs to another applicant', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ applicantId: 'someone-else' }));
      await expect(service.updateDraft('req-uuid-1', 'applicant-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── cancel ───────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it.each([GoodConductStatus.DRAFT, GoodConductStatus.SUBMITTED])(
      'allows cancelling from %s',
      async (status) => {
        requestRepo.findOne.mockResolvedValue(makeRequest({ status }));
        const result = await service.cancel('req-uuid-1', 'applicant-1');
        expect(result.status).toBe(GoodConductStatus.CANCELLED);
        expect(statusHistoryRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ toStatus: GoodConductStatus.CANCELLED }),
        );
      },
    );

    it.each([
      GoodConductStatus.UNDER_REVIEW,
      GoodConductStatus.MORE_INFO_REQUESTED,
      GoodConductStatus.APPROVED,
      GoodConductStatus.REJECTED,
      GoodConductStatus.CLOSED,
    ])('rejects cancelling from %s', async (status) => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status }));
      await expect(service.cancel('req-uuid-1', 'applicant-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOwn / listOwn ────────────────────────────────────────────────────

  describe('findOwn', () => {
    it('throws NotFoundException when missing', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.findOwn('missing', 'applicant-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for another applicant', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ applicantId: 'someone-else' }));
      await expect(service.findOwn('req-uuid-1', 'applicant-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the request for its owner', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest());
      const result = await service.findOwn('req-uuid-1', 'applicant-1');
      expect(result.id).toBe('req-uuid-1');
    });
  });

  describe('listOwn', () => {
    it('lists all requests for the applicant', async () => {
      requestRepo.find.mockResolvedValue([makeRequest()]);
      const result = await service.listOwn('applicant-1');
      expect(result).toHaveLength(1);
      expect(requestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { applicantId: 'applicant-1' } }),
      );
    });

    it('filters by status when provided', async () => {
      requestRepo.find.mockResolvedValue([]);
      await service.listOwn('applicant-1', { status: GoodConductStatus.DRAFT });
      expect(requestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicantId: 'applicant-1', status: GoodConductStatus.DRAFT },
        }),
      );
    });
  });

  // ── assertCanApprove ─────────────────────────────────────────────────────

  describe('assertCanApprove', () => {
    it('throws when payment_status is not paid', () => {
      expect(() =>
        service.assertCanApprove(makeRequest({ paymentStatus: PaymentStatus.UNPAID })),
      ).toThrow(BadRequestException);
      expect(() =>
        service.assertCanApprove(makeRequest({ paymentStatus: PaymentStatus.PENDING_CASH })),
      ).toThrow(BadRequestException);
    });

    it('does not throw when payment_status is paid', () => {
      expect(() =>
        service.assertCanApprove(makeRequest({ paymentStatus: PaymentStatus.PAID })),
      ).not.toThrow();
    });
  });

  // ── adminUpdateStatus ────────────────────────────────────────────────────

  describe('adminUpdateStatus', () => {
    it('rejects approve when payment_status is unpaid', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.UNDER_REVIEW,
          paymentStatus: PaymentStatus.UNPAID,
        }),
      );
      await expect(
        service.adminUpdateStatus('req-uuid-1', 'admin-1', {
          action: GoodConductStatusAction.APPROVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves when payment_status is paid', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW, paymentStatus: PaymentStatus.PAID }),
      );
      const result = await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.APPROVE,
      });
      expect(result.status).toBe(GoodConductStatus.APPROVED);
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('APPROVED'),
      );
    });

    it('starts review and sends the under_review SMS', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.SUBMITTED }));
      const result = await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.START_REVIEW,
      });
      expect(result.status).toBe(GoodConductStatus.UNDER_REVIEW);
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('under review'),
      );
    });

    it('rejects a "reject" action without a reason', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      await expect(
        service.adminUpdateStatus('req-uuid-1', 'admin-1', {
          action: GoodConductStatusAction.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.adminUpdateStatus('req-uuid-1', 'admin-1', {
          action: GoodConductStatusAction.REJECT,
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects with a reason succeeds', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      const result = await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.REJECT,
        reason: 'Identity could not be confirmed',
      });
      expect(result.status).toBe(GoodConductStatus.REJECTED);
      expect(result.rejectionReason).toBe('Identity could not be confirmed');
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('Identity could not be confirmed'),
      );
    });

    it('rejects a "request_more_info" action without notes', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      await expect(
        service.adminUpdateStatus('req-uuid-1', 'admin-1', {
          action: GoodConductStatusAction.REQUEST_MORE_INFO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('request_more_info with notes succeeds', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      const result = await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.REQUEST_MORE_INFO,
        notes: 'Please attach a valid phone number',
      });
      expect(result.status).toBe(GoodConductStatus.MORE_INFO_REQUESTED);
      expect(result.moreInfoRequested).toBe('Please attach a valid phone number');
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('Please attach a valid phone number'),
      );
    });

    it('does not send SMS when the event is disabled in notification settings', async () => {
      notifSettings.isSmsEnabled.mockReturnValue(false);
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW, paymentStatus: PaymentStatus.PAID }),
      );
      await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.APPROVE,
      });
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it('does not throw when the applicant has no phone number on file', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.UNDER_REVIEW,
          paymentStatus: PaymentStatus.PAID,
          phone: '',
        }),
      );
      await expect(
        service.adminUpdateStatus('req-uuid-1', 'admin-1', {
          action: GoodConductStatusAction.APPROVE,
        }),
      ).resolves.toBeDefined();
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it('also sends a branded email when the applicant supplied one', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.UNDER_REVIEW,
          paymentStatus: PaymentStatus.PAID,
          email: 'jane@example.com',
        }),
      );
      await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.APPROVE,
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('approved'),
        }),
      );
    });

    it('skips email when the applicant gave no email', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.UNDER_REVIEW,
          paymentStatus: PaymentStatus.PAID,
          email: null,
        }),
      );
      await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.APPROVE,
      });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('skips email when the event is disabled in notification settings', async () => {
      notifSettings.isEmailEnabled.mockReturnValue(false);
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.UNDER_REVIEW,
          paymentStatus: PaymentStatus.PAID,
          email: 'jane@example.com',
        }),
      );
      await service.adminUpdateStatus('req-uuid-1', 'admin-1', {
        action: GoodConductStatusAction.APPROVE,
      });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  // ── adminAssignImam ──────────────────────────────────────────────────────

  describe('adminAssignImam', () => {
    it('sets assigned_imam_id when the MosqueImam is found', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest());
      mosqueImamRepo.findOne.mockResolvedValue({ id: 'imam-1' });
      const result = await service.adminAssignImam('req-uuid-1', 'admin-1', {
        mosqueImamId: 'imam-1',
      });
      expect(result.assignedImamId).toBe('imam-1');
    });

    it('throws NotFoundException when the given MosqueImam does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest());
      mosqueImamRepo.findOne.mockResolvedValue(null);
      await expect(
        service.adminAssignImam('req-uuid-1', 'admin-1', { mosqueImamId: 'missing-imam' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('stores a note when no MosqueImam is matched', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest());
      const result = await service.adminAssignImam('req-uuid-1', 'admin-1', {
        note: 'Called the mosque, imam confirmed by phone',
      });
      expect(result.reviewNotes).toContain('Called the mosque, imam confirmed by phone');
    });
  });

  // ── adminConfirmPayment ──────────────────────────────────────────────────

  describe('adminConfirmPayment', () => {
    it('marks payment as paid and advances draft to submitted', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      const result = await service.adminConfirmPayment('req-uuid-1', 'admin-1', {
        method: 'cash' as never,
        amount: 2000,
      });
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.amountPaid).toBe(2000);
      expect(result.status).toBe(GoodConductStatus.SUBMITTED);
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ confirmedBy: 'admin-1', method: 'cash' }),
      );
      // Both the submission SMS (draft->submitted) and payment-confirmed SMS fire.
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

    it('does not change status when already past draft', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      const result = await service.adminConfirmPayment('req-uuid-1', 'admin-1', {
        method: 'bank' as never,
        amount: 2000,
      });
      expect(result.status).toBe(GoodConductStatus.UNDER_REVIEW);
      // Only payment-confirmed fires — no submission SMS since it wasn't a draft->submitted move.
      expect(smsService.sendSms).toHaveBeenCalledTimes(1);
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('Payment'),
      );
    });
  });

  // ── initiateMomoPayment ──────────────────────────────────────────────────

  describe('initiateMomoPayment', () => {
    it('advances draft -> submitted when the gateway confirms immediately', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      intouchPay.requestPayment.mockResolvedValue({
        transactionId: 'gw-1',
        status: 'SUCCESSFUL',
        responseCode: '01',
        message: 'OK',
      });

      const result = await service.initiateMomoPayment(
        'req-uuid-1',
        'applicant-1',
        '+250781234567',
      );

      expect(result.request.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.request.status).toBe(GoodConductStatus.SUBMITTED);
      expect(result.transaction.status).toBe('completed');
      expect(statusHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: GoodConductStatus.SUBMITTED }),
      );
      expect(smsService.sendSms).toHaveBeenCalledTimes(2);
    });

    it('leaves the request in draft with payment processing while the gateway push is pending', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      intouchPay.requestPayment.mockResolvedValue({
        transactionId: 'gw-2',
        status: 'PENDING',
        responseCode: '1000',
        message: 'Pending',
      });

      const result = await service.initiateMomoPayment(
        'req-uuid-1',
        'applicant-1',
        '+250781234567',
      );

      expect(result.request.status).toBe(GoodConductStatus.DRAFT);
      expect(result.request.paymentStatus).toBe(PaymentStatus.PROCESSING);
      expect(result.transaction.status).toBe('pending');
    });

    it('records a failed transaction without touching the request status when the gateway rejects immediately', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      intouchPay.requestPayment.mockResolvedValue({
        transactionId: 'gw-3',
        status: 'FAILED',
        responseCode: '1008',
        message: 'General Failure',
      });

      const result = await service.initiateMomoPayment(
        'req-uuid-1',
        'applicant-1',
        '+250781234567',
      );

      expect(result.transaction.status).toBe('failed');
      expect(result.request.status).toBe(GoodConductStatus.DRAFT);
    });

    it('rejects when payment is already completed', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ paymentStatus: PaymentStatus.PAID }));
      await expect(
        service.initiateMomoPayment('req-uuid-1', 'applicant-1', '+250781234567'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the request is not in draft status', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.SUBMITTED }));
      await expect(
        service.initiateMomoPayment('req-uuid-1', 'applicant-1', '+250781234567'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when IntouchPay credentials are not configured', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      paymentSettings.getRawSettings.mockResolvedValue({});
      await expect(
        service.initiateMomoPayment('req-uuid-1', 'applicant-1', '+250781234567'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── submitBankTransferNotice ─────────────────────────────────────────────

  describe('submitBankTransferNotice', () => {
    it('sets payment_status to processing and logs a pending bank transaction', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      const result = await service.submitBankTransferNotice('req-uuid-1', 'applicant-1');
      expect(result.paymentStatus).toBe(PaymentStatus.PROCESSING);
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'bank', status: 'pending' }),
      );
    });

    it('rejects when not in draft status', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.SUBMITTED }));
      await expect(service.submitBankTransferNotice('req-uuid-1', 'applicant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── checkMomoPaymentStatus ───────────────────────────────────────────────

  describe('checkMomoPaymentStatus', () => {
    it('short-circuits when already paid', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ paymentStatus: PaymentStatus.PAID }));
      const result = await service.checkMomoPaymentStatus('req-uuid-1', 'applicant-1');
      expect(result.paymentStatus).toBe('paid');
      expect(intouchPay.getTransactionStatus).not.toHaveBeenCalled();
    });

    it('resolves a successful gateway status and advances draft -> submitted', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      transactionRepo.findOne.mockResolvedValue(
        Object.assign(new GoodConductTransaction(), {
          id: 'tx-1',
          requestId: 'req-uuid-1',
          providerRef: 'GC-req-uuid-1-1',
          metadata: {},
        }),
      );
      intouchPay.getTransactionStatus.mockResolvedValue({
        status: 'SUCCESSFUL',
        responseCode: '01',
        message: 'OK',
      });

      const result = await service.checkMomoPaymentStatus('req-uuid-1', 'applicant-1');

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(statusHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: GoodConductStatus.SUBMITTED }),
      );
    });

    it('marks payment failed on a failed gateway status', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      transactionRepo.findOne.mockResolvedValue(
        Object.assign(new GoodConductTransaction(), {
          id: 'tx-1',
          requestId: 'req-uuid-1',
          providerRef: 'GC-req-uuid-1-1',
          metadata: {},
        }),
      );
      intouchPay.getTransactionStatus.mockResolvedValue({
        status: 'FAILED',
        responseCode: '1008',
        message: 'General Failure',
      });

      const result = await service.checkMomoPaymentStatus('req-uuid-1', 'applicant-1');
      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
    });

    it('reports no active transaction when none is pending', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.DRAFT }));
      transactionRepo.findOne.mockResolvedValue(null);
      const result = await service.checkMomoPaymentStatus('req-uuid-1', 'applicant-1');
      expect(result.gatewayStatus).toBe('PENDING');
      expect(intouchPay.getTransactionStatus).not.toHaveBeenCalled();
    });
  });

  // ── adminIssueCertificate ────────────────────────────────────────────────

  describe('adminIssueCertificate', () => {
    it('rejects issuance when the request is not approved', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.UNDER_REVIEW }),
      );
      await expect(service.adminIssueCertificate('req-uuid-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allocates a certificate number, closes the request, and sends the SMS', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.APPROVED, districtId: 'district-1' }),
      );
      districtRepo.findOne.mockResolvedValue({ id: 'district-1', name: 'Gasabo' });
      dataSource.query.mockResolvedValue([{ seq: '13' }]);

      const result = await service.adminIssueCertificate('req-uuid-1', 'admin-1');

      expect(result.status).toBe(GoodConductStatus.CLOSED);
      expect(result.certificateIssuedBy).toBe('admin-1');
      expect(result.certificateNumber).toMatch(/^RMC-GC-02-\d{6}-00013$/);
      expect(statusHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ toStatus: GoodConductStatus.CLOSED }),
      );
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+250781234567',
        expect.stringContaining('Certificate ready'),
      );
    });

    it('falls back to district code "00" when the district is unrecognised or missing', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({ status: GoodConductStatus.APPROVED, districtId: null }),
      );
      dataSource.query.mockResolvedValue([{ seq: '1' }]);

      const result = await service.adminIssueCertificate('req-uuid-1', 'admin-1');
      expect(result.certificateNumber).toMatch(/^RMC-GC-00-\d{6}-00001$/);
    });
  });

  // ── getCertificateData ───────────────────────────────────────────────────

  describe('getCertificateData', () => {
    it('rejects when the request is not closed', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: GoodConductStatus.APPROVED }));
      await expect(service.getCertificateData('req-uuid-1', 'applicant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the render payload for a closed request', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.CLOSED,
          certificateNumber: 'RMC-GC-02-202607-00013',
          districtId: 'district-1',
          sectorId: 'sector-1',
          mosqueId: 'mosque-1',
          cell: 'Kimisagara',
          village: 'Amahoro',
          requestedImamName: 'Sheikh Ali',
        }),
      );
      districtRepo.findOne.mockResolvedValue({ id: 'district-1', name: 'Gasabo' });
      sectorRepo.findOne.mockResolvedValue({ id: 'sector-1', name: 'Kacyiru' });
      mosqueRepo.findOne.mockResolvedValue({ id: 'mosque-1', name: 'Kacyiru Mosque' });

      const data = await service.getCertificateData('req-uuid-1', 'applicant-1');

      expect(data.certificateNumber).toBe('RMC-GC-02-202607-00013');
      expect(data.residence).toBe('Gasabo, Kacyiru, Kimisagara, Amahoro');
      expect(data.mosqueName).toBe('Kacyiru Mosque');
      expect(data.imamName).toBe('Sheikh Ali'); // no assignedImamId — falls back to requestedImamName
    });

    it('prefers the resolved MosqueImam user name over the free-text imam name', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.CLOSED,
          certificateNumber: 'RMC-GC-00-202607-00001',
          assignedImamId: 'imam-1',
          requestedImamName: 'Sheikh Ali',
        }),
      );
      mosqueImamRepo.findOne.mockResolvedValue({ id: 'imam-1', userId: 'user-1' });
      userRepo.findOne.mockResolvedValue({ id: 'user-1', firstName: 'Abdul', lastName: 'Karim' });

      const data = await service.getCertificateData('req-uuid-1', 'applicant-1');
      expect(data.imamName).toBe('Abdul Karim');
    });
  });

  // ── publicVerify ─────────────────────────────────────────────────────────

  describe('publicVerify', () => {
    it('returns minimal verified data for a closed certificate', async () => {
      requestRepo.findOne.mockResolvedValue(
        makeRequest({
          status: GoodConductStatus.CLOSED,
          certificateNumber: 'RMC-GC-02-202607-00013',
          mosqueId: 'mosque-1',
          requestedImamName: 'Sheikh Ali',
          fullNames: 'Jane Doe',
        }),
      );
      mosqueRepo.findOne.mockResolvedValue({ id: 'mosque-1', name: 'Kacyiru Mosque' });

      const result = await service.publicVerify('rmc-gc-02-202607-00013');

      expect(result).toEqual({
        certificateNumber: 'RMC-GC-02-202607-00013',
        fullName: 'Jane Doe',
        mosqueName: 'Kacyiru Mosque',
        imamName: 'Sheikh Ali',
        motif: GoodConductMotif.EMPLOYMENT,
        issuedAt: undefined,
        status: 'valid',
      });
      // Never leaks phone/email/residence
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('residence');
    });

    it('returns an identical 404 for a nonexistent certificate number', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.publicVerify('RMC-GC-99-202607-99999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the same 404 for a real-but-not-yet-issued request (query excludes non-closed status)', async () => {
      // The repo query filters on status=CLOSED at the DB level, so a pending
      // request's certificateNumber (were one ever set early) would not match —
      // simulate that by having findOne (correctly) return null.
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.publicVerify('RMC-GC-02-202607-00013')).rejects.toThrow(
        NotFoundException,
      );
      expect(requestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: GoodConductStatus.CLOSED }),
        }),
      );
    });
  });

  // ── getBankTransferDetails ───────────────────────────────────────────────

  describe('getBankTransferDetails', () => {
    it('returns null when bank transfer settings are not configured', async () => {
      paymentSettings.getRawSettings.mockResolvedValue(null);
      await expect(service.getBankTransferDetails()).resolves.toBeNull();
    });

    it('returns null when settings exist but are incomplete', async () => {
      paymentSettings.getRawSettings.mockResolvedValue({ bankName: 'Bank of Kigali' });
      await expect(service.getBankTransferDetails()).resolves.toBeNull();
    });

    it('returns the real configured details when fully set', async () => {
      paymentSettings.getRawSettings.mockResolvedValue({
        bankName: 'Bank of Kigali',
        accountName: 'Rwanda Muslim Community',
        accountNumber: '00123456789',
      });
      await expect(service.getBankTransferDetails()).resolves.toEqual({
        bankName: 'Bank of Kigali',
        accountName: 'Rwanda Muslim Community',
        accountNumber: '00123456789',
      });
    });
  });
});
