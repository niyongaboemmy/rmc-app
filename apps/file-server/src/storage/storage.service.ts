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
import { createReadStream, promises as fsp } from 'fs';
import { Readable } from 'stream';

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

export interface FileObject {
  body: Readable;
  contentType: string;
  contentLength?: number;
  contentDisposition?: string;
  contentRange?: string;
  acceptRanges?: string;
}

/** Minimal extension → MIME map for serving disk-stored files with the right type. */
const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

function mimeFromKey(key: string): string {
  return EXT_MIME[path.extname(key).toLowerCase()] || 'application/octet-stream';
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'disk' | 's3';
  private readonly diskDir: string;
  private readonly publicBaseUrl: string;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly presignedExpiry: number;

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get<'disk' | 's3'>('storage.driver') || 's3';
    this.diskDir =
      this.config.get<string>('storage.diskDir') || path.resolve(process.cwd(), 'storage-data');
    this.publicBaseUrl = (
      this.config.get<string>('storage.publicBaseUrl') || 'http://localhost:3002'
    ).replace(/\/+$/, '');

    const endpoint = this.config.get<string>('storage.endpoint');
    const region = this.config.get<string>('storage.region') || 'us-east-1';
    const accessKeyId = this.config.get<string>('storage.accessKeyId') || '';
    const secretAccessKey = this.config.get<string>('storage.secretAccessKey') || '';
    const forcePathStyle = this.config.get<boolean>('storage.forcePathStyle');

    this.bucket = this.config.get<string>('storage.bucket') || 'rmc-files';
    this.presignedExpiry = this.config.get<number>('app.presignedUrlExpiry') || 3600;

    // The S3 client is cheap to construct (no network) — build it even in disk
    // mode so the type stays non-null; it's simply never used when driver=disk.
    // requestChecksumCalculation / responseChecksumValidation: newer SDK versions
    // default to 'WHEN_SUPPORTED' which adds x-amz-checksum-* headers that some
    // MinIO versions reject with HTTP 400. Force 'WHEN_REQUIRED' for compatibility.
    const s3Config: S3ClientConfig = {
      region,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED' as any,
      responseChecksumValidation: 'WHEN_REQUIRED' as any,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    };
    this.s3 = new S3Client(s3Config);
  }

  async onModuleInit() {
    if (this.driver === 'disk') {
      await fsp.mkdir(this.diskDir, { recursive: true });
      this.logger.log(`Storage driver: local disk → ${this.diskDir}`);
      return;
    }
    await this.ensureBucketExists();
  }

  // ── Local-disk helpers ──────────────────────────────────────────────────────

  /** Resolve a storage key to an absolute path inside diskDir, refusing traversal. */
  private diskPath(key: string): string {
    const resolved = path.resolve(this.diskDir, key);
    if (resolved !== this.diskDir && !resolved.startsWith(this.diskDir + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  private async ensureBucketExists() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch (headErr: any) {
      const status = headErr?.$metadata?.httpStatusCode;
      // 404 = bucket doesn't exist → create it. Anything else (403, connection error) → log and bail.
      if (status !== 404 && status !== 301) {
        this.logger.error(
          `Cannot access bucket "${this.bucket}" (HTTP ${status ?? 'unknown'}): ` +
          `check S3_ENDPOINT, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY`,
          headErr,
        );
        return;
      }
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch (createErr: any) {
        this.logger.error(
          `Failed to create bucket "${this.bucket}": ` +
          `${createErr?.message ?? createErr}`,
        );
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

    if (this.driver === 'disk') {
      const dest = this.diskPath(key);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, buffer);
      this.logger.log(`Uploaded (disk): ${key} (${buffer.length} bytes)`);
      return { key, bucket: 'local', size: buffer.length, mimeType, originalName };
    }

    // S3/MinIO metadata values must be ASCII. Encode non-ASCII filenames.
    const safeOriginalName = encodeURIComponent(originalName);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          // RFC 5987 encoding for non-ASCII filenames
          ContentDisposition: `inline; filename*=UTF-8''${safeOriginalName}`,
          Metadata: {
            originalName: safeOriginalName,
            uploadedAt: new Date().toISOString(),
          },
        }),
      );
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      const code = err?.Code || err?.name || 'S3Error';
      const msg = status
        ? `S3 upload failed (HTTP ${status} ${code}): check bucket permissions and credentials`
        : `S3 upload failed (${code}): check S3 endpoint, bucket, and credentials`;
      this.logger.error(msg, err);
      throw new Error(msg);
    }

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
    if (this.driver === 'disk') {
      // No object store to presign against — point at this server's own stream route.
      return `${this.publicBaseUrl}/api/v1/files/${key}`;
    }
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresIn ?? this.presignedExpiry });
  }

  /**
   * Fetch an object's bytes from storage so the file server can stream them
   * straight to the browser. Supports byte-range requests (PDF/video seeking).
   * Throws if not found (controller maps to 404).
   */
  async getObject(key: string, range?: string): Promise<FileObject> {
    if (this.driver === 'disk') {
      const filePath = this.diskPath(key);
      const stat = await fsp.stat(filePath); // ENOENT → caught upstream → 404
      const contentType = mimeFromKey(key);
      const size = stat.size;

      const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
      if (m) {
        let start = m[1] ? parseInt(m[1], 10) : 0;
        let end = m[2] ? parseInt(m[2], 10) : size - 1;
        if (Number.isNaN(start) || start < 0) start = 0;
        if (Number.isNaN(end) || end >= size) end = size - 1;
        if (start > end) start = 0;
        return {
          body: createReadStream(filePath, { start, end }),
          contentType,
          contentLength: end - start + 1,
          contentDisposition: 'inline',
          contentRange: `bytes ${start}-${end}/${size}`,
          acceptRanges: 'bytes',
        };
      }

      return {
        body: createReadStream(filePath),
        contentType,
        contentLength: size,
        contentDisposition: 'inline',
        acceptRanges: 'bytes',
      };
    }

    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
    );
    return {
      body: result.Body as Readable,
      contentType: result.ContentType || 'application/octet-stream',
      contentLength: result.ContentLength,
      contentDisposition: result.ContentDisposition,
      contentRange: result.ContentRange,
      acceptRanges: result.AcceptRanges,
    };
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number,
  ): Promise<string> {
    if (this.driver === 'disk') {
      // Direct browser→storage PUT isn't available on disk; callers should POST /upload.
      throw new Error('Presigned uploads are not supported with local-disk storage; use POST /upload');
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresIn ?? this.presignedExpiry });
  }

  async delete(key: string): Promise<void> {
    if (this.driver === 'disk') {
      await fsp.unlink(this.diskPath(key)).catch(() => undefined);
      this.logger.log(`Deleted (disk): ${key}`);
      return;
    }
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted: ${key}`);
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    if (this.driver === 'disk') {
      const stat = await fsp.stat(this.diskPath(key)); // throws if missing
      return { key, size: stat.size, mimeType: mimeFromKey(key), lastModified: stat.mtime };
    }
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
