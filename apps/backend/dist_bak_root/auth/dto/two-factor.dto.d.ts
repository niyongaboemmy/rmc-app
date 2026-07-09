export declare class TwoFactorVerifySetupDto {
    otp: string;
}
export declare class TwoFactorDisableDto {
    password: string;
}
export declare class TwoFactorVerifyLoginDto {
    tempToken: string;
    otp: string;
}
export declare class TwoFactorResendDto {
    tempToken: string;
}
