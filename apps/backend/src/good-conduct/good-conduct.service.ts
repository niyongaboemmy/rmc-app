import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  GoodConductRequest,
  GoodConductStatus,
  PaymentStatus,
} from './entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from './entities/good-conduct-status-history.entity';
import { GoodConductTransaction } from './entities/good-conduct-transaction.entity';
import { CreateGoodConductRequestDto } from './dto/create-good-conduct-request.dto';
import {
  UpdateGoodConductStatusDto,
  GoodConductStatusAction,
} from './dto/update-good-conduct-status.dto';
import { AssignImamDto } from './dto/assign-imam.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { SmsTemplates } from './sms-templates';
import { EmailTemplates } from './email-templates';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentTypeKey } from '../payment-settings/entities/payment-type.entity';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { EmailService } from '../integrations/email/email.service';
import { districtCode } from '../common/district-codes';
import { User } from '../users/entities/user.entity';
import { MosqueImam } from '../mosques/entities/mosque-imam.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { District } from '../locations/entities/district.entity';
import { Sector } from '../locations/entities/sector.entity';

// Fallback amount — used if no active PaymentTypeRate is configured yet
const GOOD_CONDUCT_FEE_FALLBACK = 2000;

// A request in any of these statuses counts as "active" for duplicate detection
const ACTIVE_STATUSES: GoodConductStatus[] = [
  GoodConductStatus.DRAFT,
  GoodConductStatus.SUBMITTED,
  GoodConductStatus.UNDER_REVIEW,
  GoodConductStatus.MORE_INFO_REQUESTED,
  GoodConductStatus.APPROVED,
];

@Injectable()
export class GoodConductService {
  private readonly logger = new Logger(GoodConductService.name);

  constructor(
    @InjectRepository(GoodConductRequest)
    private readonly requestRepo: Repository<GoodConductRequest>,
    @InjectRepository(GoodConductStatusHistory)
    private readonly statusHistoryRepo: Repository<GoodConductStatusHistory>,
    @InjectRepository(GoodConductTransaction)
    private readonly transactionRepo: Repository<GoodConductTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MosqueImam)
    private readonly mosqueImamRepo: Repository<MosqueImam>,
    @InjectRepository(Mosque)
    private readonly mosqueRepo: Repository<Mosque>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectRepository(Sector)
    private readonly sectorRepo: Repository<Sector>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly configService: ConfigService,
    private readonly intouchPay: IntouchPayService,
    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  // ── Fee Lookup ───────────────────────────────────────────────────────────────

  /** Returns the configured Good Conduct fee, falling back to a hardcoded constant. */
  private async resolveFee(): Promise<number> {
    try {
      const rates = await this.paymentSettings.getActiveRates(PaymentTypeKey.GOOD_CONDUCT_FEE);
      if (rates.length > 0) return Number(rates[0].amount);
    } catch {
      // fall through to hardcoded fallback
    }
    return GOOD_CONDUCT_FEE_FALLBACK;
  }

  /**
   * Real, admin-configured bank details for the manual bank-transfer flow —
   * never a hardcoded placeholder. Returns null if the admin hasn't
   * configured `BANK_TRANSFER` settings yet, so the frontend can show an
   * honest "not available yet" state instead of a fabricated account number.
   */
  async getBankTransferDetails(): Promise<{
    bankName: string;
    accountName: string;
    accountNumber: string;
  } | null> {
    const settings = await this.paymentSettings.getRawSettings(PaymentMethodCode.BANK_TRANSFER);
    if (!settings?.bankName || !settings?.accountName || !settings?.accountNumber) return null;
    return {
      bankName: settings.bankName,
      accountName: settings.accountName,
      accountNumber: settings.accountNumber,
    };
  }

  // ── Create / Draft ───────────────────────────────────────────────────────────

  async createDraft(
    applicantId: string,
    dto: CreateGoodConductRequestDto,
  ): Promise<GoodConductRequest> {
    // Duplicate-request detection: block a new draft if the applicant already
    // has an active request in flight. This is the friendlier UX per plan §9
    // point 3 — a rejected/cancelled/closed request never blocks a new one
    // (closed = reissue case), so only truly "in progress" requests count.
    const existing = await this.requestRepo.findOne({
      where: { applicantId, status: In(ACTIVE_STATUSES) },
    });
    if (existing) {
      throw new ConflictException(
        `You already have an active Good Conduct request (status: ${existing.status})`,
      );
    }

    const amountDue = await this.resolveFee();

    const request = this.requestRepo.create({
      applicantId,
      fullNames: dto.fullNames,
      fatherName: dto.fatherName ?? null,
      motherName: dto.motherName ?? null,
      districtId: dto.districtId ?? null,
      sectorId: dto.sectorId ?? null,
      cell: dto.cell ?? null,
      village: dto.village ?? null,
      email: dto.email ?? null,
      phone: dto.phone,
      mosqueId: dto.mosqueId ?? null,
      requestedImamName: dto.requestedImamName ?? null,
      motif: dto.motif,
      motifDetail: dto.motifDetail ?? null,
      amountDue,
      status: GoodConductStatus.DRAFT,
      paymentStatus: PaymentStatus.UNPAID,
    });

    const saved = await this.requestRepo.save(request);
    await this.recordStatusChange(
      saved.id,
      null,
      GoodConductStatus.DRAFT,
      applicantId,
      'Request draft created',
    );
    return saved;
  }

  async updateDraft(
    id: string,
    applicantId: string,
    dto: Partial<CreateGoodConductRequestDto>,
  ): Promise<GoodConductRequest> {
    const request = await this.findOwn(id, applicantId);

    if (
      ![GoodConductStatus.DRAFT, GoodConductStatus.MORE_INFO_REQUESTED].includes(request.status)
    ) {
      throw new ForbiddenException('Only draft or more-info-requested requests can be updated');
    }

    Object.assign(request, {
      fullNames: dto.fullNames ?? request.fullNames,
      fatherName: dto.fatherName ?? request.fatherName,
      motherName: dto.motherName ?? request.motherName,
      districtId: dto.districtId ?? request.districtId,
      sectorId: dto.sectorId ?? request.sectorId,
      cell: dto.cell ?? request.cell,
      village: dto.village ?? request.village,
      email: dto.email ?? request.email,
      phone: dto.phone ?? request.phone,
      mosqueId: dto.mosqueId ?? request.mosqueId,
      requestedImamName: dto.requestedImamName ?? request.requestedImamName,
      motif: dto.motif ?? request.motif,
      motifDetail: dto.motifDetail ?? request.motifDetail,
    });

    await this.saveScalarFields(request);
    return request;
  }

  async cancel(id: string, applicantId: string): Promise<GoodConductRequest> {
    const request = await this.findOwn(id, applicantId);
    if (![GoodConductStatus.DRAFT, GoodConductStatus.SUBMITTED].includes(request.status)) {
      throw new ForbiddenException('Only draft or submitted requests can be cancelled');
    }
    const prev = request.status;
    request.status = GoodConductStatus.CANCELLED;
    await this.saveScalarFields(request);
    await this.recordStatusChange(
      request.id,
      prev,
      GoodConductStatus.CANCELLED,
      applicantId,
      'Cancelled by applicant',
    );
    return request;
  }

  // ── Payment (IntouchPay) ─────────────────────────────────────────────────────

  async initiateMomoPayment(
    id: string,
    applicantId: string,
    mobilePhone: string,
  ): Promise<{
    request: GoodConductRequest;
    transaction: GoodConductTransaction;
    gatewayRef: string | null;
    responseCode: string;
    message: string;
  }> {
    const request = await this.findOwn(id, applicantId);

    if (request.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed for this request');
    }
    if (request.status !== GoodConductStatus.DRAFT) {
      throw new BadRequestException('Request must be in draft status to initiate payment');
    }

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      throw new BadRequestException('MoMo (IntouchPay) credentials are not configured');
    }

    const requestTxnId = `GC-${request.id}-${Date.now()}`;
    const fallbackCallback = `${this.configService.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;

    const result = await this.intouchPay.requestPayment({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      amount: Number(request.amountDue),
      mobilePhone,
      transactionId: requestTxnId,
      callbackUrl: creds.callbackUrl || fallbackCallback,
      gatewayUrl: creds.gatewayUrl || undefined,
    });

    request.paymentStatus = PaymentStatus.PROCESSING;
    await this.saveScalarFields(request);

    const tx = this.transactionRepo.create({
      requestId: request.id,
      method: 'momo',
      providerRef: requestTxnId,
      amount: request.amountDue,
      status:
        result.status === 'SUCCESSFUL'
          ? 'completed'
          : result.status === 'FAILED'
            ? 'failed'
            : 'pending',
      metadata: {
        gatewayTransactionId: result.transactionId,
        responseCode: result.responseCode,
        mobilePhone,
      },
    });
    const savedTx = await this.transactionRepo.save(tx);

    if (result.status === 'SUCCESSFUL') {
      request.paymentStatus = PaymentStatus.PAID;
      request.amountPaid = request.amountDue;
      savedTx.completedAt = new Date();
      await this.transactionRepo.save(savedTx);
      await this.markSubmittedAfterPayment(request);
      this.sendPaymentConfirmedSms(request);
    }

    return {
      request,
      transaction: savedTx,
      gatewayRef: result.transactionId ?? null,
      responseCode: result.responseCode,
      message: result.message,
    };
  }

  async submitBankTransferNotice(id: string, applicantId: string): Promise<GoodConductRequest> {
    const request = await this.findOwn(id, applicantId);

    if (request.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed for this request');
    }
    if (request.status !== GoodConductStatus.DRAFT) {
      throw new BadRequestException('Request must be in draft status to declare a bank transfer');
    }

    request.paymentStatus = PaymentStatus.PROCESSING;
    await this.saveScalarFields(request);

    const tx = this.transactionRepo.create({
      requestId: id,
      method: 'bank',
      amount: request.amountDue,
      status: 'pending',
    });
    await this.transactionRepo.save(tx);

    return request;
  }

  /** Polls IntouchPay gateway directly and updates DB — used by the applicant's waiting screen. */
  async checkMomoPaymentStatus(
    id: string,
    applicantId: string,
  ): Promise<{
    paymentStatus: string;
    gatewayStatus: string;
    responseCode: string;
    message: string;
  }> {
    const request = await this.findOwn(id, applicantId);

    if (request.paymentStatus === PaymentStatus.PAID) {
      return {
        paymentStatus: 'paid',
        gatewayStatus: 'SUCCESSFUL',
        responseCode: '01',
        message: 'Payment already confirmed',
      };
    }
    if (request.paymentStatus === PaymentStatus.FAILED) {
      return {
        paymentStatus: 'failed',
        gatewayStatus: 'FAILED',
        responseCode: '',
        message: 'Payment failed',
      };
    }

    const tx = await this.transactionRepo.findOne({
      where: { requestId: id, method: 'momo', status: 'pending' },
      order: { initiatedAt: 'DESC' },
    });
    if (!tx) {
      return {
        paymentStatus: request.paymentStatus,
        gatewayStatus: 'PENDING',
        responseCode: '1000',
        message: 'No active MoMo transaction found',
      };
    }

    const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
    if (!creds?.username || !creds?.partnerPassword || !creds?.accountNo) {
      return {
        paymentStatus: request.paymentStatus,
        gatewayStatus: 'PENDING',
        responseCode: '',
        message: 'Credentials not configured',
      };
    }

    const statusResult = await this.intouchPay.getTransactionStatus({
      username: creds.username,
      partnerPassword: creds.partnerPassword,
      accountNo: creds.accountNo,
      requestTransactionId: tx.providerRef ?? '',
      transactionId: String((tx.metadata as Record<string, unknown>)?.gatewayTransactionId ?? ''),
      gatewayBaseUrl: creds.gatewayUrl,
    });

    if (statusResult.status !== 'PENDING') {
      tx.status = statusResult.status === 'SUCCESSFUL' ? 'completed' : 'failed';
      tx.completedAt = new Date();
      await this.transactionRepo.save(tx);

      if (statusResult.status === 'SUCCESSFUL') {
        request.paymentStatus = PaymentStatus.PAID;
        request.amountPaid = request.amountDue;
        await this.saveScalarFields(request);
        await this.markSubmittedAfterPayment(request);
        this.sendPaymentConfirmedSms(request);
      } else {
        request.paymentStatus = PaymentStatus.FAILED;
        await this.saveScalarFields(request);
      }
    }

    return {
      paymentStatus: request.paymentStatus,
      gatewayStatus: statusResult.status,
      responseCode: statusResult.responseCode,
      message: statusResult.message,
    };
  }

  /** Advances a draft request to submitted once payment clears — shared by MoMo, bank/cash confirmation paths. */
  private async markSubmittedAfterPayment(
    request: GoodConductRequest,
    changedBy: string | null = null,
  ): Promise<void> {
    if (request.status !== GoodConductStatus.DRAFT) return;
    const prev = request.status;
    request.status = GoodConductStatus.SUBMITTED;
    request.submittedAt = new Date();
    await this.saveScalarFields(request);
    await this.recordStatusChange(
      request.id,
      prev,
      GoodConductStatus.SUBMITTED,
      changedBy,
      'Payment confirmed — request submitted',
    );
    // Fired on the SUBMITTED transition (not draft creation) — draft isn't yet a real commitment.
    this.sendSubmissionSms(request);
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async findOwn(id: string, applicantId: string): Promise<GoodConductRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['statusHistory', 'transactions'],
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.applicantId !== applicantId) throw new ForbiddenException('Access denied');
    return request;
  }

  async listOwn(
    applicantId: string,
    filters: { status?: string } = {},
  ): Promise<GoodConductRequest[]> {
    return this.requestRepo.find({
      where: {
        applicantId,
        ...(filters.status ? { status: filters.status as GoodConductStatus } : {}),
      },
      relations: ['statusHistory'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Guards ───────────────────────────────────────────────────────────────────

  /**
   * Server-side enforcement that a request cannot be approved without payment.
   * Must be called by admin approval logic — never trust a client-supplied
   * status transition alone.
   */
  assertCanApprove(request: GoodConductRequest): void {
    if (request.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Request cannot be approved until payment_status is "paid"');
    }
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(filters: {
    status?: string;
    paymentStatus?: string;
    mosqueId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      paymentStatus,
      mosqueId,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const qb = this.requestRepo
      .createQueryBuilder('req')
      .orderBy('req.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('req.status = :status', { status });
    if (paymentStatus) qb.andWhere('req.paymentStatus = :paymentStatus', { paymentStatus });
    if (mosqueId) qb.andWhere('req.mosqueId = :mosqueId', { mosqueId });
    if (dateFrom) qb.andWhere('req.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1); // inclusive end date
      qb.andWhere('req.createdAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (search) {
      qb.andWhere('(req.fullNames ILIKE :q OR req.phone ILIKE :q)', { q: `%${search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGetById(id: string): Promise<GoodConductRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['statusHistory', 'transactions'],
    });
    if (!request) throw new NotFoundException('Request not found');

    const applicant = request.applicantId
      ? await this.userRepo.findOne({ where: { id: request.applicantId } })
      : null;
    if (applicant) {
      (request as GoodConductRequest & { applicant?: unknown }).applicant = {
        id: applicant.id,
        name: [applicant.firstName, applicant.lastName].filter(Boolean).join(' '),
        email: applicant.email,
        phone: applicant.phone,
      };
    }

    return request;
  }

  async adminUpdateStatus(
    id: string,
    adminId: string,
    dto: UpdateGoodConductStatusDto,
  ): Promise<GoodConductRequest> {
    const request = await this.adminGetById(id);
    const prev = request.status;

    let toStatus: GoodConductStatus;
    switch (dto.action) {
      case GoodConductStatusAction.START_REVIEW:
        toStatus = GoodConductStatus.UNDER_REVIEW;
        break;
      case GoodConductStatusAction.APPROVE:
        this.assertCanApprove(request);
        toStatus = GoodConductStatus.APPROVED;
        break;
      case GoodConductStatusAction.REJECT:
        if (!dto.reason?.trim()) {
          throw new BadRequestException('A rejection reason is required');
        }
        request.rejectionReason = dto.reason;
        toStatus = GoodConductStatus.REJECTED;
        break;
      case GoodConductStatusAction.REQUEST_MORE_INFO:
        if (!dto.notes?.trim()) {
          throw new BadRequestException('Notes are required when requesting more info');
        }
        request.moreInfoRequested = dto.notes;
        toStatus = GoodConductStatus.MORE_INFO_REQUESTED;
        break;
      default:
        throw new BadRequestException('Unsupported action');
    }

    request.status = toStatus;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (dto.notes) request.reviewNotes = dto.notes;

    await this.saveScalarFields(request);
    await this.recordStatusChange(
      request.id,
      prev,
      toStatus,
      adminId,
      dto.notes ?? dto.reason ?? null,
    );

    switch (toStatus) {
      case GoodConductStatus.UNDER_REVIEW:
        this.sendUnderReviewSms(request);
        break;
      case GoodConductStatus.APPROVED:
        this.sendApprovedSms(request);
        break;
      case GoodConductStatus.REJECTED:
        this.sendRejectedSms(request);
        break;
      case GoodConductStatus.MORE_INFO_REQUESTED:
        this.sendMoreInfoRequestedSms(request);
        break;
    }

    return request;
  }

  /**
   * Resolves the attesting imam for a request. Mirrors marriage's
   * requestedOfficiant / assignedImamId dual-field handling: a matched
   * MosqueImam sets assigned_imam_id directly; otherwise the admin's note is
   * appended to review_notes so the manual resolution is still on record.
   */
  async adminAssignImam(
    id: string,
    adminId: string,
    dto: AssignImamDto,
  ): Promise<GoodConductRequest> {
    const request = await this.adminGetById(id);

    if (dto.mosqueImamId) {
      const imam = await this.mosqueImamRepo.findOne({ where: { id: dto.mosqueImamId } });
      if (!imam) throw new NotFoundException('MosqueImam not found');
      request.assignedImamId = imam.id;
    }

    if (dto.note) {
      const stamp = `[Imam assignment by ${adminId}] ${dto.note}`;
      request.reviewNotes = request.reviewNotes ? `${request.reviewNotes}\n${stamp}` : stamp;
    }

    await this.saveScalarFields(request);
    return request;
  }

  async adminConfirmPayment(
    id: string,
    adminId: string,
    dto: ConfirmPaymentDto,
  ): Promise<GoodConductRequest> {
    const request = await this.adminGetById(id);

    request.paymentStatus = PaymentStatus.PAID;
    request.amountPaid = dto.amount;
    await this.saveScalarFields(request);

    const tx = this.transactionRepo.create({
      requestId: id,
      method: dto.method,
      amount: dto.amount,
      status: 'completed',
      confirmedBy: adminId,
      completedAt: new Date(),
    });
    await this.transactionRepo.save(tx);

    await this.markSubmittedAfterPayment(request, adminId);
    this.sendPaymentConfirmedSms(request);
    return request;
  }

  /**
   * Allocates the certificate number and closes the request. Only callable on
   * an already-approved request — certificate numbers are never allocated on
   * the client, and never for a request that hasn't cleared review/payment.
   */
  async adminIssueCertificate(id: string, adminId: string): Promise<GoodConductRequest> {
    const request = await this.adminGetById(id);
    if (request.status !== GoodConductStatus.APPROVED) {
      throw new BadRequestException('Certificate can only be issued for approved requests');
    }

    const district = request.districtId
      ? await this.districtRepo.findOne({ where: { id: request.districtId } })
      : null;
    const certificateNumber = await this.generateCertificateNumber(district?.name ?? null);

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001');
    request.certificateNumber = certificateNumber;
    request.certificateUrl = `${frontendUrl}/en/certificates/good-conduct/${certificateNumber}`;
    request.certificateQrPayload = `${frontendUrl}/en/verify/good-conduct/${certificateNumber}`;
    request.certificateIssuedAt = new Date();
    request.certificateIssuedBy = adminId;

    const prev = request.status;
    request.status = GoodConductStatus.CLOSED;
    await this.saveScalarFields(request);
    await this.recordStatusChange(
      request.id,
      prev,
      GoodConductStatus.CLOSED,
      adminId,
      'Certificate issued',
    );
    this.sendCertificateReadySms(request);
    return request;
  }

  /** RMC-GC-<district-code>-<YYYYMM>-<5-digit-seq>. '00' stands in for an unrecognised/missing district. */
  private async generateCertificateNumber(districtName: string | null): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('good_conduct_request_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const code = districtCode(districtName) ?? '00';
    return `RMC-GC-${code}-${year}${month}-${seq}`;
  }

  /** Resolves the display name of the imam attesting for a request, if assigned. */
  private async resolveImamName(request: GoodConductRequest): Promise<string | null> {
    if (!request.assignedImamId) return request.requestedImamName;
    const imam = await this.mosqueImamRepo.findOne({ where: { id: request.assignedImamId } });
    if (!imam) return request.requestedImamName;
    const imamUser = await this.userRepo.findOne({ where: { id: imam.userId } });
    if (!imamUser) return request.requestedImamName;
    return (
      [imamUser.firstName, imamUser.lastName].filter(Boolean).join(' ') || request.requestedImamName
    );
  }

  /** Data payload the frontend needs to render the client-side PDF. Only for the owner, once closed. */
  async getCertificateData(id: string, applicantId: string) {
    const request = await this.findOwn(id, applicantId);
    if (request.status !== GoodConductStatus.CLOSED || !request.certificateNumber) {
      throw new BadRequestException('Certificate is not yet issued for this request');
    }

    const [district, sector, mosque, imamName] = await Promise.all([
      request.districtId ? this.districtRepo.findOne({ where: { id: request.districtId } }) : null,
      request.sectorId ? this.sectorRepo.findOne({ where: { id: request.sectorId } }) : null,
      request.mosqueId ? this.mosqueRepo.findOne({ where: { id: request.mosqueId } }) : null,
      this.resolveImamName(request),
    ]);

    return {
      id: request.id,
      certificateNumber: request.certificateNumber,
      fullNames: request.fullNames,
      fatherName: request.fatherName,
      motherName: request.motherName,
      residence: [district?.name, sector?.name, request.cell, request.village]
        .filter(Boolean)
        .join(', '),
      mosqueName: mosque?.name ?? null,
      imamName,
      motif: request.motif,
      motifDetail: request.motifDetail,
      certificateIssuedAt: request.certificateIssuedAt,
      verifyUrl: request.certificateQrPayload,
    };
  }

  /**
   * Public, unauthenticated verification. Returns only the minimal identity
   * confirmation — never phone/email/residence — and only for closed/issued
   * certificates. A nonexistent number and a real-but-pending one both 404
   * identically, so pending/rejected requests can't be enumerated.
   */
  async publicVerify(certificateNumber: string) {
    const request = await this.requestRepo.findOne({
      where: {
        certificateNumber: certificateNumber.toUpperCase(),
        status: GoodConductStatus.CLOSED,
      },
    });
    if (!request) throw new NotFoundException('Certificate not found or not yet issued');

    const [mosque, imamName] = await Promise.all([
      request.mosqueId ? this.mosqueRepo.findOne({ where: { id: request.mosqueId } }) : null,
      this.resolveImamName(request),
    ]);

    return {
      certificateNumber: request.certificateNumber,
      fullName: request.fullNames,
      mosqueName: mosque?.name ?? null,
      imamName,
      motif: request.motif,
      issuedAt: request.certificateIssuedAt,
      status: 'valid',
    };
  }

  async adminGetReports(filters: { dateFrom?: string; dateTo?: string } = {}) {
    const qb = this.requestRepo.createQueryBuilder('req');
    if (filters.dateFrom) qb.andWhere('req.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setDate(end.getDate() + 1);
      qb.andWhere('req.createdAt < :dateTo', { dateTo: end.toISOString() });
    }

    const total = await qb.getCount();

    const byStatus = await qb
      .clone()
      .select('req.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('req.status')
      .getRawMany();

    const revenue = await qb
      .clone()
      .select('SUM(req.amountPaid)', 'total')
      .andWhere('req.paymentStatus = :ps', { ps: PaymentStatus.PAID })
      .getRawOne();

    return { total, byStatus, revenue: Number(revenue?.total ?? 0) };
  }

  /** Builds a CSV export of requests matching the given filters (no pagination). */
  async adminExportCsv(filters: {
    status?: string;
    paymentStatus?: string;
    mosqueId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string> {
    const { items } = await this.adminList({ ...filters, page: 1, limit: Number.MAX_SAFE_INTEGER });

    const header = [
      'id',
      'fullNames',
      'phone',
      'email',
      'mosqueId',
      'motif',
      'status',
      'paymentStatus',
      'amountDue',
      'amountPaid',
      'createdAt',
    ];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((r) =>
      [
        r.id,
        r.fullNames,
        r.phone,
        r.email,
        r.mosqueId,
        r.motif,
        r.status,
        r.paymentStatus,
        r.amountDue,
        r.amountPaid,
        r.createdAt?.toISOString(),
      ]
        .map(escape)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /**
   * Persists scalar column changes on a GoodConductRequest via a targeted
   * `.update()` rather than `.save()` on the loaded entity. This deliberately
   * avoids TypeORM's default `orphanedRowAction: 'nullify'` for the
   * statusHistory/transactions OneToMany relations: whenever an entity is
   * loaded WITH those relations (as findOwn/adminGetById always do, for the
   * API response payload) and later re-saved via `.save()`, TypeORM compares
   * the in-memory (now stale) relation array against the DB and nulls the
   * foreign key of any child row it doesn't see in that array — e.g. a
   * transaction inserted moments earlier via transactionRepo directly. This
   * was an actual production-breaking bug (found while testing certificate
   * issuance end-to-end): confirming a cash payment silently corrupted its
   * own just-created GoodConductTransaction row. `.update()` never touches
   * relations at all, so it can't trigger this.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars -- fields deliberately dropped, see comment above */
  private async saveScalarFields(request: GoodConductRequest): Promise<void> {
    const { statusHistory, transactions, ...rest } = request as GoodConductRequest & {
      applicant?: unknown;
    };
    const { applicant: _applicant, id, ...columns } = rest as Record<string, unknown>;
    await this.requestRepo.update(id as string, columns);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  private async recordStatusChange(
    requestId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<GoodConductStatusHistory> {
    const history = this.statusHistoryRepo.create({
      requestId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.statusHistoryRepo.save(history);
  }

  // ── SMS notifications (via InTouch SmsService) ──────────────────────────────

  /**
   * Short human-readable reference for SMS bodies. Unlike marriage's
   * application_number, this service allocates no friendly identifier until
   * certificate_number is set on approval — so a truncated id stands in for
   * every pre-certificate notification.
   */
  private shortRef(request: GoodConductRequest): string {
    return request.id.slice(0, 8).toUpperCase();
  }

  /**
   * Dispatch an SMS through the InTouch gateway.
   * Skips silently when the recipient phone is missing.
   * Never throws — a failed SMS must not break the caller's operation.
   */
  private dispatchSms(to: string, message: string): void {
    if (!to) {
      this.logger.warn('SMS skipped: no recipient phone number');
      return;
    }
    // Fire-and-forget — SmsService.sendSms() catches all errors internally
    void this.smsService.sendSms(to, message);
  }

  /**
   * Dispatch a branded HTML email. Skips silently when the applicant gave no
   * email (it's optional on the request form) — never throws, so a failed
   * or skipped email must not break the caller's operation.
   */
  private dispatchEmail(
    to: string | null | undefined,
    template: { subject: string; html: string },
  ): void {
    if (!to) return;
    this.emailService
      .sendEmail({ to, subject: template.subject, html: template.html })
      .catch((err) => {
        this.logger.warn(`Good Conduct email to ${to} failed: ${err}`);
      });
  }

  private sendSubmissionSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.submission')) {
      this.dispatchSms(request.phone, SmsTemplates.submission(ref));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.submission')) {
      this.dispatchEmail(request.email, EmailTemplates.submission(request.fullNames, ref));
    }
  }

  private sendPaymentConfirmedSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    const amount = Number(request.amountPaid || request.amountDue).toLocaleString('en-RW');
    if (this.notifSettings.isSmsEnabled('goodConduct.payment_confirmed')) {
      this.dispatchSms(request.phone, SmsTemplates.paymentConfirmed(ref, amount));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.payment_confirmed')) {
      this.dispatchEmail(
        request.email,
        EmailTemplates.paymentConfirmed(request.fullNames, ref, amount),
      );
    }
  }

  private sendUnderReviewSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.under_review')) {
      this.dispatchSms(request.phone, SmsTemplates.underReview(ref));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.under_review')) {
      this.dispatchEmail(request.email, EmailTemplates.underReview(request.fullNames, ref));
    }
  }

  private sendMoreInfoRequestedSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.more_info_requested')) {
      this.dispatchSms(
        request.phone,
        SmsTemplates.moreInfoRequested(ref, request.moreInfoRequested),
      );
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.more_info_requested')) {
      this.dispatchEmail(
        request.email,
        EmailTemplates.moreInfoRequested(request.fullNames, ref, request.moreInfoRequested),
      );
    }
  }

  private sendApprovedSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.approved')) {
      this.dispatchSms(request.phone, SmsTemplates.approved(ref));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.approved')) {
      this.dispatchEmail(request.email, EmailTemplates.approved(request.fullNames, ref));
    }
  }

  private sendRejectedSms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.rejected')) {
      this.dispatchSms(request.phone, SmsTemplates.rejected(ref, request.rejectionReason));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.rejected')) {
      this.dispatchEmail(
        request.email,
        EmailTemplates.rejected(request.fullNames, ref, request.rejectionReason),
      );
    }
  }

  private sendCertificateReadySms(request: GoodConductRequest): void {
    const ref = this.shortRef(request);
    if (this.notifSettings.isSmsEnabled('goodConduct.certificate_ready')) {
      this.dispatchSms(request.phone, SmsTemplates.certificateReady(ref));
    }
    if (this.notifSettings.isEmailEnabled('goodConduct.certificate_ready')) {
      this.dispatchEmail(request.email, EmailTemplates.certificateReady(request.fullNames, ref));
    }
  }
}
