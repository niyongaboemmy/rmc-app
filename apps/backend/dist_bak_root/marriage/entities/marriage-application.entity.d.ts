import { MarriageDocument } from './marriage-document.entity';
import { MarriageStatusHistory } from './marriage-status-history.entity';
import { MarriageTransaction } from './marriage-transaction.entity';
export declare enum MarriageApplicationStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    AMENDMENTS_REQUESTED = "amendments_requested",
    APPROVED = "approved",
    COMPLETED = "completed",
    REJECTED = "rejected",
    CANCELLED = "cancelled",
    CLOSED = "closed"
}
export declare enum PaymentStatus {
    UNPAID = "unpaid",
    PENDING_CASH = "pending_cash",
    PROCESSING = "processing",
    PAID = "paid",
    REFUNDED = "refunded",
    FAILED = "failed"
}
export declare enum VenueType {
    MOSQUE = "mosque",
    OUTSIDE = "outside"
}
export declare class MarriageApplication {
    id: string;
    applicationNumber: string;
    applicantId: string;
    notificationPhone: string | null;
    groomUserId: string | null;
    groomName: string;
    groomFatherName: string | null;
    groomNid: string;
    groomBirthDate: Date | null;
    groomPhone: string | null;
    brideUserId: string | null;
    brideName: string;
    brideFatherName: string | null;
    brideNid: string;
    brideBirthDate: Date | null;
    bridePhone: string | null;
    waliName: string | null;
    waliNid: string | null;
    waliPhone: string | null;
    mahrAmount: number | null;
    mahrCurrency: string;
    mahrDescription: string | null;
    witness1Nid: string;
    witness1Name: string | null;
    witness2Nid: string;
    witness2Name: string | null;
    requestedOfficiant: string | null;
    assignedImamId: string | null;
    venueType: VenueType;
    province: string | null;
    district: string | null;
    mosqueId: string | null;
    venueAddress: string | null;
    preferredDateFrom: Date | null;
    preferredDateTo: Date | null;
    ceremonyDate: Date | null;
    ceremonyScheduledBy: string | null;
    ceremonyScheduledAt: Date | null;
    status: MarriageApplicationStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
    amountPaid: number;
    paymentMethod: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    rejectionReason: string | null;
    amendmentsRequestedText: string | null;
    certificateUrl: string | null;
    certificateQrCode: string | null;
    certificateIssuedAt: Date | null;
    certificateIssuedBy: string | null;
    weddingPhotoUrl: string | null;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    documents: MarriageDocument[];
    statusHistory: MarriageStatusHistory[];
    transactions: MarriageTransaction[];
}
