import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  url: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  fileServerUrl: process.env.FILE_SERVER_URL || 'http://localhost:3002',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  passwordResetExpiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || '15', 10),
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@rmc.org.rw',
  },
  mfa: {
    appName: process.env.MFA_APP_NAME || 'RMC Platform',
  },
}));
