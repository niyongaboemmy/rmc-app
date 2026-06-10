export declare enum ApprovalAction {
    APPROVE = "approve",
    REJECT = "reject"
}
export declare class ApproveMemberDto {
    action: ApprovalAction;
    reason?: string;
}
