import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MarriageApplication } from './entities/marriage-application.entity';
import { MarriageDocument } from './entities/marriage-document.entity';
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import { MarriagePartyConfirmation, PartyRole } from './entities/marriage-party-confirmation.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
export declare class MarriageService {
    private readonly applicationRepo;
    private readonly documentRepo;
    private readonly statusHistoryRepo;
    private readonly transactionRepo;
    private readonly userRepo;
    private readonly confirmationRepo;
    private readonly dataSource;
    private readonly configService;
    private readonly notifSettings;
    private readonly smsService;
    private readonly paymentSettings;
    private readonly intouchPay;
    private readonly logger;
    constructor(applicationRepo: Repository<MarriageApplication>, documentRepo: Repository<MarriageDocument>, statusHistoryRepo: Repository<MarriageStatusHistory>, transactionRepo: Repository<MarriageTransaction>, userRepo: Repository<User>, confirmationRepo: Repository<MarriagePartyConfirmation>, dataSource: DataSource, configService: ConfigService, notifSettings: NotificationSettingsService, smsService: SmsService, paymentSettings: PaymentSettingsService, intouchPay: IntouchPayService);
    getMarriageFees(): Promise<{
        mosque: {
            amount: number;
            label: string;
            description: string;
        };
        outside: {
            amount: number;
            label: string;
            description: string;
        };
    }>;
    private resolveMarriageFee;
    private generateApplicationNumber;
    createDraft(applicantId: string, dto: CreateMarriageApplicationDto): Promise<MarriageApplication>;
    updateDraft(id: string, applicantId: string, dto: Partial<CreateMarriageApplicationDto>): Promise<MarriageApplication>;
    submit(id: string, applicantId: string): Promise<MarriageApplication>;
    initiateUserMomoPayment(id: string, applicantId: string, mobilePhone: string): Promise<{
        application: MarriageApplication;
        transaction: MarriageTransaction;
        gatewayRef: string | null;
        responseCode: string;
        message: string;
    }>;
    devCompletePayment(id: string, applicantId: string): Promise<MarriageApplication>;
    cancel(id: string, applicantId: string): Promise<MarriageApplication>;
    saveDocument(id: string, applicantId: string, dto: SaveDocumentDto): Promise<MarriageDocument>;
    findOwnApplication(id: string, applicantId: string): Promise<MarriageApplication>;
    findByApplicationNumber(applicationNumber: string): Promise<MarriageApplication | null>;
    findAllByApplicant(applicantId: string): Promise<MarriageApplication[]>;
    adminFindAll(filters: {
        status?: string;
        paymentStatus?: string;
        venueType?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        order?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        items: MarriageApplication[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminFindOne(id: string): Promise<MarriageApplication>;
    adminVerifyDocument(applicationId: string, documentId: string, adminId: string, verified: boolean): Promise<MarriageApplication>;
    adminUpdateStatus(id: string, adminId: string, dto: UpdateApplicationStatusDto): Promise<MarriageApplication>;
    adminScheduleCeremony(id: string, adminId: string, dto: ScheduleCeremonyDto): Promise<MarriageApplication>;
    adminSaveWeddingPhoto(id: string, adminId: string, photoUrl: string): Promise<MarriageApplication>;
    adminSaveSignedProvisional(id: string, adminId: string, dto: {
        fileKey: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }): Promise<MarriageApplication>;
    adminConfirmCashPayment(id: string, adminId: string): Promise<MarriageApplication>;
    adminIssueCertificate(id: string, adminId: string): Promise<MarriageApplication>;
    adminInitiateMomoPayment(id: string, adminId: string, mobilePhone: string): Promise<{
        application: MarriageApplication;
        transaction: MarriageTransaction;
        gatewayResponse: unknown;
    }>;
    checkUserMomoPaymentStatus(id: string, applicantId: string): Promise<{
        paymentStatus: string;
        gatewayStatus: string;
        responseCode: string;
        message: string;
    }>;
    adminGetMomoPaymentStatus(id: string, transactionId: string): Promise<{
        status: string;
        responseCode: string;
        message: string;
    }>;
    adminGetStats(): Promise<{
        total: number;
        byStatus: any[];
        revenue: number;
    }>;
    publicVerify(applicationNumber: string): Promise<{
        applicationNumber: string;
        groomName: string;
        brideName: string;
        ceremonyDate: Date | null;
        issuedAt: Date | null;
        status: string;
    }>;
    private recordStatusChange;
    private getRecipientPhone;
    private getApplicantPhone;
    private dispatchSms;
    private sendSubmissionSms;
    private sendStatusChangeSms;
    private buildStatusMessage;
    private sendCeremonyScheduledSms;
    private sendPaymentConfirmedSms;
    addParties(applicationId: string, requesterId: string, parties: Array<{
        role: PartyRole;
        name?: string;
        nid?: string;
        phone?: string;
    }>): Promise<MarriagePartyConfirmation[]>;
    getPartyConfirmations(applicationId: string): Promise<MarriagePartyConfirmation[]>;
    lookupByToken(token: string): Promise<{
        confirmation: MarriagePartyConfirmation;
        application: Partial<MarriageApplication>;
    }>;
    confirmParty(token: string, notes?: string): Promise<MarriagePartyConfirmation>;
}
