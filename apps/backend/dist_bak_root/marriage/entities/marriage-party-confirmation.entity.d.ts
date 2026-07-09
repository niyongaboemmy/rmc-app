export declare enum PartyRole {
    BRIDE = "bride",
    GROOM = "groom",
    WALI = "wali",
    IMAM = "imam"
}
export declare class MarriagePartyConfirmation {
    id: string;
    applicationId: string;
    role: PartyRole;
    name: string | null;
    nid: string | null;
    phone: string | null;
    confirmationToken: string | null;
    confirmedAt: Date | null;
    notes: string | null;
    createdAt: Date;
}
