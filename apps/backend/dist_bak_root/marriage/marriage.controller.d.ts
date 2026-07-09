import { MarriageService } from './marriage.service';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { User } from '../users/entities/user.entity';
export declare class MarriageController {
    private readonly service;
    constructor(service: MarriageService);
    createDraft(user: User, dto: CreateMarriageApplicationDto): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    updateDraft(user: User, id: string, dto: Partial<CreateMarriageApplicationDto>): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    submit(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    checkPaymentStatus(user: User, id: string): Promise<{
        paymentStatus: string;
        gatewayStatus: string;
        responseCode: string;
        message: string;
    }>;
    initiateMomoPayment(user: User, id: string, dto: {
        mobilePhone: string;
    }): Promise<{
        application: import("./entities/marriage-application.entity").MarriageApplication;
        transaction: import("./entities/marriage-transaction.entity").MarriageTransaction;
        gatewayRef: string | null;
        responseCode: string;
        message: string;
    }>;
    devCompletePayment(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    saveDocument(user: User, id: string, dto: SaveDocumentDto): Promise<import("./entities/marriage-document.entity").MarriageDocument>;
    cancel(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
    listMine(user: User): Promise<import("./entities/marriage-application.entity").MarriageApplication[]>;
    getByNumber(number: string): Promise<import("./entities/marriage-application.entity").MarriageApplication | null>;
    getOne(user: User, id: string): Promise<import("./entities/marriage-application.entity").MarriageApplication>;
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
    publicVerify(applicationNumber: string): Promise<{
        applicationNumber: string;
        groomName: string;
        brideName: string;
        ceremonyDate: Date | null;
        issuedAt: Date | null;
        status: string;
    }>;
    addParties(user: User, id: string, dto: {
        parties: Array<{
            role: string;
            name?: string;
            nid?: string;
            phone?: string;
        }>;
    }): Promise<import("./entities/marriage-party-confirmation.entity").MarriagePartyConfirmation[]>;
    getParties(user: User, id: string): Promise<import("./entities/marriage-party-confirmation.entity").MarriagePartyConfirmation[]>;
    getPartiesByNumber(number: string): Promise<{
        role: import("./entities/marriage-party-confirmation.entity").PartyRole;
        confirmedAt: Date | null;
    }[]>;
    lookupToken(token: string): Promise<{
        confirmation: import("./entities/marriage-party-confirmation.entity").MarriagePartyConfirmation;
        application: Partial<import("./entities/marriage-application.entity").MarriageApplication>;
    }>;
    confirmParty(token: string, dto: {
        notes?: string;
    }): Promise<import("./entities/marriage-party-confirmation.entity").MarriagePartyConfirmation>;
}
