import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  // 'disk' stores files on the local filesystem (dev / no-MinIO); 's3' uses S3/MinIO.
  driver: (process.env.STORAGE_DRIVER as 'disk' | 's3') || 's3',
  diskDir: process.env.STORAGE_DISK_DIR || '',
  publicBaseUrl: process.env.FILE_SERVER_PUBLIC_URL || '',
  endpoint: process.env.S3_ENDPOINT || '',
  bucket: process.env.S3_BUCKET_NAME || 'rmc-files',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  forcePathStyle: !!process.env.S3_ENDPOINT,
}));
