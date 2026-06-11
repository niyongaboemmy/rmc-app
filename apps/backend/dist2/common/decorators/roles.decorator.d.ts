import { SetMetadata } from '@nestjs/common';
export declare enum Role {
    USER = "user",
    OPERATOR = "operator",
    ADMIN = "admin",
    SUPERADMIN = "superadmin"
}
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: Role[]) => ReturnType<typeof SetMetadata>;
