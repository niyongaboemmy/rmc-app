export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    roleId?: string | null;
    permissions: string[];
    iat?: number;
    exp?: number;
}
