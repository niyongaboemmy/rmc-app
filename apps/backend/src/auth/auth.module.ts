import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PhoneOtpVerification } from './entities/phone-otp-verification.entity';
import { MemberProfile } from '../members/entities/member-profile.entity';
import { AuditLog } from '../finance/entities/audit-log.entity';
import { Role } from '../roles/entities/role.entity';
import { UsersModule } from '../users/users.module';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    NotificationSettingsModule,
    SmsModule,
    TypeOrmModule.forFeature([
      RefreshToken,
      PasswordResetToken,
      PhoneOtpVerification,
      MemberProfile,
      AuditLog,
      Role,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiry', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
