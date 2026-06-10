export declare class AppController {
    publicRoute(): Record<string, string>;
    userOnly(user: {
        role: string;
    }): Record<string, string>;
    operatorOnly(): Record<string, string>;
    adminOnly(): Record<string, string>;
    superAdminOnly(): Record<string, string>;
}
