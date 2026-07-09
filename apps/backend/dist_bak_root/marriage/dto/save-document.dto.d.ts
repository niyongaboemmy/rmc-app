import { DocumentType } from '../entities/marriage-document.entity';
export declare class SaveDocumentDto {
    documentType: DocumentType;
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}
