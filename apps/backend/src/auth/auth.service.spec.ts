import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PhoneOtpVerification } from './entities/phone-otp-verification.entity';
import { MemberProfile } from '../members/entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../finance/entities/audit-log.entity';
import { Role } from '../roles/entities/role.entity';
import { REDIS_CLIENT } from '../common/decorators/inject-redis.decorator';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { RegisterDto } from './dto/register.dto';

const mockRepo = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  })),
});

const mockRedis = {
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn(),
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
};

const mockUser = {
  id: 'user-uuid-1',
  email: 'ahmed@example.com',
  phone: '+250781234567',
  passwordHash: '',
  firstName: 'Ahmed',
  lastName: 'Hassan',
  role: 'user',
  status: 'pending',
  mfaEnabled: false,
  mfaSecret: null,
  isPhoneVerified: false,
  isEmailVerified: false,
  lastLoginAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let refreshTokenRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;
  let memberProfileRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;
  let txManager: { getRepository: jest.Mock; query: jest.Mock };

  beforeEach(async () => {
    // register() now runs inside dataSource.transaction(), writing through the
    // transaction's EntityManager rather than the injected repositories. The fake
    // manager routes getRepository() to the same mocks the tests assert on, and
    // query() stands in for the membership_counters upsert.
    userRepo = mockRepo();
    memberProfileRepo = mockRepo();
    txManager = {
      getRepository: jest.fn((entity: unknown) => (entity === User ? userRepo : memberProfileRepo)),
      query: jest.fn().mockResolvedValue([{ last_seq: 1 }]),
    };
    const mockDataSource = {
      transaction: jest.fn((cb: (m: typeof txManager) => Promise<unknown>) => cb(txManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByPhone: jest.fn(),
            findByEmailOrPhone: jest.fn(),
            findById: jest.fn(),
            findByIdRaw: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            updateProfile: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: unknown) => {
              const config: Record<string, unknown> = {
                'app.bcryptRounds': 4, // Fast for tests
                'app.otpExpiryMinutes': 5,
                'app.passwordResetExpiryMinutes': 15,
                'app.frontendUrl': 'http://localhost:3001',
                'app.smtp.host': 'localhost',
                'app.smtp.port': 1025,
                'app.smtp.from': 'noreply@rmc.org.rw',
                'app.mfa.appName': 'RMC Platform',
                'jwt.accessSecret': 'test-secret-very-long-string-for-aes-256',
              };
              return config[key] ?? def;
            }),
          },
        },
        { provide: getRepositoryToken(RefreshToken), useFactory: mockRepo },
        { provide: getRepositoryToken(PasswordResetToken), useFactory: mockRepo },
        { provide: getRepositoryToken(PhoneOtpVerification), useFactory: mockRepo },
        { provide: getRepositoryToken(MemberProfile), useValue: memberProfileRepo },
        { provide: getRepositoryToken(AuditLog), useFactory: mockRepo },
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        {
          provide: NotificationSettingsService,
          useValue: {
            isEmailEnabled: jest.fn().mockReturnValue(true),
            isSmsEnabled: jest.fn().mockReturnValue(true),
          },
        },
        { provide: SmsService, useValue: { sendSms: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => jest.clearAllMocks());

  // ── Register tests ──────────────────────────────────────────────────────────

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'ahmed@example.com',
      phone: '+250781234567',
      password: 'Password1!',
      firstName: 'Ahmed',
      lastName: 'Hassan',
    };

    it('should create user with hashed password', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      memberProfileRepo.save.mockResolvedValue({});
      auditLogRepo.save.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.userId).toBe(mockUser.id);
      expect(result.message).toContain('Registration successful');
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, phone: dto.phone }),
      );
      // Verify password was hashed
      const savedCall = (userRepo.save as jest.Mock).mock.calls[0][0];
      const isHashed = await bcrypt.compare(dto.password, savedCall.passwordHash);
      expect(isHashed).toBe(true);
    });

    it('should throw ConflictException on duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as never);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on duplicate phone', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(mockUser as never);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should generate valid membership number format', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      auditLogRepo.save.mockResolvedValue({});
      txManager.query.mockResolvedValue([{ last_seq: 42 }]);

      await service.register(dto);

      const year = new Date().getFullYear();
      expect(memberProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipNumber: `RMC-${year}-000042`,
        }),
      );
    });

    it('should write to audit log on successful registration', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      memberProfileRepo.save.mockResolvedValue({});

      await service.register(dto);

      expect(auditLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'user', action: 'create' }),
      );
    });

    it('should allocate the membership number from Postgres, not Redis', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      memberProfileRepo.save.mockResolvedValue({});

      await service.register(dto);

      // A Redis INCR would rewind to 1 on a flush and collide with numbers already
      // issued; the counter must come from the same store as its unique constraint.
      expect(txManager.query).toHaveBeenCalledWith(expect.stringContaining('membership_counters'), [
        new Date().getFullYear(),
      ]);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should write both user and member profile through the same transaction', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      memberProfileRepo.save.mockResolvedValue({});

      await service.register(dto);

      expect(txManager.getRepository).toHaveBeenCalledWith(User);
      expect(txManager.getRepository).toHaveBeenCalledWith(MemberProfile);
    });

    it('should surface a failed profile insert rather than stranding a user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      memberProfileRepo.save.mockRejectedValue(new Error('duplicate membership number'));

      // The user insert is rolled back with it, so the caller can register again;
      // previously this left an account with no profile and no way to retry.
      await expect(service.register(dto)).rejects.toThrow('duplicate membership number');
      expect(auditLogRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Login tests ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 4);
      usersService.findByEmailOrPhone.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as never);
      refreshTokenRepo.save.mockResolvedValue({});
      auditLogRepo.save.mockResolvedValue({});
      usersService.update.mockResolvedValue(undefined);

      const result = await service.login({
        identifier: 'ahmed@example.com',
        password: 'Password1!',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should return 401 for wrong password (generic message)', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 4);
      usersService.findByEmailOrPhone.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as never);

      await expect(
        service.login({ identifier: 'ahmed@example.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return 401 for non-existent user (generic message)', async () => {
      usersService.findByEmailOrPhone.mockResolvedValue(null);
      await expect(
        service.login({ identifier: 'nobody@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return requiresMfa:true when MFA enabled and no code provided', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 4);
      usersService.findByEmailOrPhone.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        mfaEnabled: true,
      } as never);

      const result = await service.login({
        identifier: 'ahmed@example.com',
        password: 'Password1!',
      });
      expect(result).toEqual({ requiresMfa: true });
    });

    it('should store refresh token hash in database', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 4);
      usersService.findByEmailOrPhone.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as never);
      refreshTokenRepo.save.mockResolvedValue({});
      auditLogRepo.save.mockResolvedValue({});
      usersService.update.mockResolvedValue(undefined);

      await service.login({ identifier: 'ahmed@example.com', password: 'Password1!' });

      const savedToken = refreshTokenRepo.save.mock.calls[0][0];
      expect(savedToken.tokenHash).toHaveLength(64); // SHA-256 hex
      // Verify it's a hash, not the raw token
      expect(savedToken.tokenHash).not.toMatch(/^[0-9a-f]{8}-/); // not a UUID
    });

    it('should update last_login_at on successful login', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 4);
      usersService.findByEmailOrPhone.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as never);
      refreshTokenRepo.save.mockResolvedValue({});
      auditLogRepo.save.mockResolvedValue({});

      await service.login({ identifier: 'ahmed@example.com', password: 'Password1!' });

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });

  // ── Refresh token tests ─────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('should return new access and refresh tokens for valid refresh token', async () => {
      const future = new Date(Date.now() + 86400000);
      refreshTokenRepo.findOne.mockResolvedValueOnce({
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: future,
        revokedAt: null,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });
      refreshTokenRepo.update.mockResolvedValue(undefined);
      usersService.findById.mockResolvedValue(mockUser as never);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.refreshTokens('some-raw-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw 401 for expired refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── OTP tests ───────────────────────────────────────────────────────────────

  describe('OTP Verification', () => {
    it('should return error if phone already verified', async () => {
      usersService.findByPhone.mockResolvedValue({ ...mockUser, isPhoneVerified: true } as never);
      await expect(service.sendOtp('+250781234567')).rejects.toThrow(BadRequestException);
    });

    it('should hash OTP before storing in database', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as never);
      mockRedis.incr.mockResolvedValue(1);
      const saveSpy = jest.fn().mockResolvedValue({});
      jest.spyOn(service['otpRepo'], 'save').mockImplementation(saveSpy);

      await service.sendOtp('+250781234567');

      const saved = saveSpy.mock.calls[0][0];
      expect(saved.otpHash).toHaveLength(64); // SHA-256
    });

    it('should send the code by SMS, not just log it', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as never);
      mockRedis.incr.mockResolvedValue(1);
      jest.spyOn(service['otpRepo'], 'save').mockResolvedValue({} as never);

      await service.sendOtp('+250781234567');

      const sendSms = service['smsService'].sendSms as jest.Mock;
      expect(sendSms).toHaveBeenCalledWith('+250781234567', expect.stringMatching(/\d{6}/));
    });

    describe('verifyPhone', () => {
      const otp = '123456';
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      const stubOtpRecord = (userId = mockUser.id) => {
        jest.spyOn(service['otpRepo'], 'findOne').mockResolvedValue({
          id: 'otp-1',
          userId,
          otpHash,
          attempts: 0,
          expiresAt: new Date(Date.now() + 60_000),
        } as never);
        jest.spyOn(service['otpRepo'], 'update').mockResolvedValue({} as never);
      };

      it('should promote a pending user to active', async () => {
        stubOtpRecord();
        usersService.findByIdRaw.mockResolvedValue({ ...mockUser, status: 'pending' } as never);

        await service.verifyPhone('+250781234567', otp);

        expect(usersService.update).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({ isPhoneVerified: true, status: 'active' }),
        );
      });

      it('should not resurrect a suspended account', async () => {
        stubOtpRecord();
        usersService.findByIdRaw.mockResolvedValue({ ...mockUser, status: 'suspended' } as never);

        await service.verifyPhone('+250781234567', otp);

        const patch = (usersService.update as jest.Mock).mock.calls[0][1] as Record<
          string,
          unknown
        >;
        expect(patch.isPhoneVerified).toBe(true);
        expect(patch).not.toHaveProperty('status');
      });
    });
  });

  // ── Password Reset tests ────────────────────────────────────────────────────

  describe('Password Reset', () => {
    it('should return 200 for non-existent email (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('nobody@example.com');
      expect(result.message).toContain('If that email');
    });

    it('should store hashed token (never plaintext)', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as never);
      const saveSpy = jest.fn().mockResolvedValue({});
      jest.spyOn(service['passwordResetRepo'], 'save').mockImplementation(saveSpy);

      await service.forgotPassword('ahmed@example.com');

      const saved = saveSpy.mock.calls[0][0];
      expect(saved.tokenHash).toHaveLength(64); // SHA-256 hex
      expect(saved.tokenHash).not.toMatch(/^[0-9a-f]{8}-/); // not UUID
    });
  });

  // ── MFA tests ───────────────────────────────────────────────────────────────

  describe('MFA', () => {
    it('should generate a valid TOTP secret and QR code', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, mfaEnabled: false } as never);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.mfaSetup(mockUser.id);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.manualEntryCode).toHaveLength(32); // base32 20-byte secret
    });

    it('should throw if MFA already enabled', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, mfaEnabled: true } as never);
      await expect(service.mfaSetup(mockUser.id)).rejects.toThrow(BadRequestException);
    });
  });
});
