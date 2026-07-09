import { MarriageService } from './marriage.service';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';
import { User } from '../users/entities/user.entity';
declare class VerifyDocumentDto {
    verified: boolean;
}
declare class InitiateMomoDto {
    mobilePhone: string;
}
declare class SignedProvisionalDto {
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}
export declare class MarriageAdminController {
    private readonly service;
    constructor(service: MarriageService);
    findAll(status?: string, paymentStatus?: string, venueType?: string, search?: string, dateFrom?: string, dateTo?: string, sort?: string, order?: string, page?: string, limit?: string): Promise<{
        items: import("./entities/marriage-application.entity").MarriageApplication[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findOne(id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    updateStatus(user: User, id: string, dto: UpdateApplicationStatusDto): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    schedule(user: User, id: string, dto: ScheduleCeremonyDto): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    confirmPayment(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    initiateMomo(user: User, id: string, dto: InitiateMomoDto): Promise<{
        application: import("./entities/marriage-application.entity").MarriageApplication;
        transaction: import("./entities/marriage-transaction.entity").MarriageTransaction;
        gatewayResponse: unknown;
    }>;
    checkMomoStatus(id: string, txId: string): Promise<{
        status: string;
        responseCode: string;
        message: string;
    }>;
    verifyDocument(user: User, id: string, docId: string, body: VerifyDocumentDto): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    saveWeddingPhoto(user: User, id: string, body: {
        photoUrl: string;
    }): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    saveSignedProvisional(user: User, id: string, dto: SignedProvisionalDto): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    issueCertificate(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    getStats(): Promise<{
        total: number;
        byStatus: any[];
        revenue: number;
    }>;
}
export {};
