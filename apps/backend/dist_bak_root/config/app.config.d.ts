declare const _default: (() => {
    nodeEnv: string;
    port: number;
    url: string;
    frontendUrl: string;
    fileServerUrl: string;
    bcryptRounds: number;
    otpExpiryMinutes: number;
    passwordResetExpiryMinutes: number;
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from: string;
    };
    mfa: {
        appName: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string;
    port: number;
    url: string;
    frontendUrl: string;
    fileServerUrl: string;
    bcryptRounds: number;
    otpExpiryMinutes: number;
    passwordResetExpiryMinutes: number;
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from: string;
    };
    mfa: {
        appName: string;
    };
}>;
export default _default;
