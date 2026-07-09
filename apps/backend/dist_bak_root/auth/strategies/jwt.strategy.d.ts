import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly authService;
    constructor(configService: ConfigService, authService: AuthService);
    validate(payload: JwtPayload): Promise<User & {
        permissions: string[];
    }>;
}
export {};
