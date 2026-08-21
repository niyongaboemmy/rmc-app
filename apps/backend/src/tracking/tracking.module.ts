import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TrackingOtp } from './entities/tracking-otp.entity';
import { TrackingVerificationService } from './tracking-verification.service';
import { SmsModule } from '../integrations/sms/sms.module';
import { RedisModule } from '../redis/redis.module';

/**
 * Reusable phone-OTP tracking verification. Any feature module can import this
 * and inject TrackingVerificationService to secure a public "track by code"
 * lookup (see job-applications for a reference integration).
 */
@Module({
  imports: [
    SmsModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('TRACKING_TOKEN_SECRET') || config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([TrackingOtp]),
  ],
  providers: [TrackingVerificationService],
  exports: [TrackingVerificationService],
})
export class TrackingModule {}
