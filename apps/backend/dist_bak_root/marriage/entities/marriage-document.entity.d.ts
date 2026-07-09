import { MarriageApplication } from './marriage-application.entity';
export declare enum DocumentType {
    GROOM_ID = "groom_id",
    BRIDE_ID = "bride_id",
    GROOM_PHOTO = "groom_photo",
    BRIDE_PHOTO = "bride_photo",
    WALI_CONSENT = "wali_consent",
    MAHR_AGREEMENT = "mahr_agreement",
    PORTRAIT = "portrait",
    ADDITIONAL = "additional",
    SIGNED_PROVISIONAL = "signed_provisional"
}
export declare class MarriageDocument {
    id: string;
    applicationId: string;
    application: MarriageApplication;
    documentType: DocumentType;
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string | null;
    verified: boolean;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    uploadedAt: Date;
}
