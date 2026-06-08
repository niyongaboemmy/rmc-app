import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified: Date;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly presignedExpiry: number;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('storage.endpoint');
    const region = this.config.get<string>('storage.region') || 'us-east-1';
    const accessKeyId = this.config.get<string>('storage.accessKeyId') || '';
    const secretAccessKey = this.config.get<string>('storage.secretAccessKey') || '';
    const forcePathStyle = this.config.get<boolean>('storage.forcePathStyle');

    this.bucket = this.config.get<string>('storage.bucket') || 'rmc-files';
    this.presignedExpiry = this.config.get<number>('app.presignedUrlExpiry') || 3600;

    const s3Config: S3ClientConfig = {
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: !!forcePathStyle } : {}),
    };

    this.s3 = new S3Client(s3Config);
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch (err) {
        this.logger.error(`Failed to create bucket "${this.bucket}"`, err);
      }
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<UploadResult> {
    const ext = path.extname(originalName).toLowerCase();
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: `inline; filename="${originalName}"`,
        Metadata: {
          originalName,
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    this.logger.log(`Uploaded: ${key} (${buffer.length} bytes)`);

    return {
      key,
      bucket: this.bucket,
      size: buffer.length,
      mimeType,
      originalName,
    };
  }

  async getPresignedUrl(key: string, expiresIn?: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresIn ?? this.presignedExpiry });
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresIn ?? this.presignedExpiry });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted: ${key}`);
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const result = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      key,
      size: result.ContentLength || 0,
      mimeType: result.ContentType || 'application/octet-stream',
      lastModified: result.LastModified || new Date(),
    };
  }

  buildPublicFileKey(folder: string, filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return `${folder}/${uuidv4()}${ext}`;
  }
}
