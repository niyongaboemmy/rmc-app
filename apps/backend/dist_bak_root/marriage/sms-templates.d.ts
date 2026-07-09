export declare const SmsTemplates: {
    readonly submission: (appNo: string, groomName: string, brideName: string) => string;
    readonly underReview: (appNo: string) => string;
    readonly approved: (appNo: string) => string;
    readonly rejected: (appNo: string, reason?: string | null) => string;
    readonly amendmentsRequested: (appNo: string, notes?: string | null) => string;
    readonly completed: (appNo: string) => string;
    readonly closed: (appNo: string) => string;
    readonly ceremonyScheduled: (appNo: string, date: string) => string;
    readonly paymentConfirmed: (appNo: string, amount: string) => string;
    readonly partyConfirmation: (appNo: string, role: string, confirmLink: string) => string;
};
