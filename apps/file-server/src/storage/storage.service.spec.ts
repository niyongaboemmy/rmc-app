import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  CreateBucketCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/file.jpg'),
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'storage.endpoint': 'http://localhost:9000',
        'storage.region': 'us-east-1',
        'storage.accessKeyId': 'test',
        'storage.secretAccessKey': 'test',
        'storage.forcePathStyle': true,
        'storage.bucket': 'test-bucket',
        'app.presignedUrlExpiry': 3600,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({
      ContentLength: 1024,
      ContentType: 'image/jpeg',
      LastModified: new Date('2024-01-01'),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    await service.onModuleInit();
  });

  describe('upload', () => {
    it('uploads a file and returns key, size, mimeType, originalName', async () => {
      const buffer = Buffer.from('test image content');
      const result = await service.upload(buffer, 'photo.jpg', 'image/jpeg', 'avatars');

      expect(result.key).toMatch(/^avatars\/[0-9a-f-]+\.jpg$/);
      expect(result.size).toBe(buffer.length);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.originalName).toBe('photo.jpg');
      expect(result.bucket).toBe('test-bucket');
    });

    it('uses default folder "uploads" when folder not specified', async () => {
      const buffer = Buffer.from('data');
      const result = await service.upload(buffer, 'doc.pdf', 'application/pdf');
      expect(result.key).toMatch(/^uploads\//);
    });
  });

  describe('getPresignedUrl', () => {
    it('returns a presigned URL', async () => {
      const url = await service.getPresignedUrl('avatars/test.jpg');
      expect(url).toBe('https://presigned.example.com/file.jpg');
    });
  });

  describe('delete', () => {
    it('sends DeleteObjectCommand', async () => {
      await service.delete('avatars/test.jpg');
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getMetadata', () => {
    it('returns file metadata', async () => {
      const meta = await service.getMetadata('avatars/test.jpg');
      expect(meta.key).toBe('avatars/test.jpg');
      expect(meta.size).toBe(1024);
      expect(meta.mimeType).toBe('image/jpeg');
      expect(meta.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('buildPublicFileKey', () => {
    it('generates a key with uuid and correct extension', () => {
      const key = service.buildPublicFileKey('documents', 'report.pdf');
      expect(key).toMatch(/^documents\/[0-9a-f-]+\.pdf$/);
    });
  });
});
