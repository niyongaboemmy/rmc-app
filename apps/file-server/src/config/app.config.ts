import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim()),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  allowedMimeTypes: (
    process.env.ALLOWED_MIME_TYPES ||
    'image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav'
  )
    .split(',')
    .map((m) => m.trim()),
  presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10),
}));
