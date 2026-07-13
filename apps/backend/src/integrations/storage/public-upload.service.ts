import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/** What multer hands us. Typed locally — the backend has no @types/multer. */
export interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredDocument {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** A supporting document is a photo or a PDF. Nothing else is accepted. */
export const DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads a supporting document to the file server on behalf of an ANONYMOUS
 * member of the public (a Hajj applicant, a family reporting a death…).
 *
 * The file server's POST /upload requires a JWT, and we deliberately do not make
 * it public — that would open our storage to unauthenticated writes from anywhere.
 * Instead the public form posts to the backend, which validates the file (type +
 * size) and forwards it under a short-lived service token, into a fixed folder.
 *
 * Read-back goes the same way: these folders are listed in the file server's
 * PROTECTED_KEY_PREFIXES, so the documents are not publicly readable — only the
 * backend can fetch them, and it re-serves them to admins who hold the permission.
 */
@Injectable()
export class PublicUploadService {
  private readonly logger = new Logger(PublicUploadService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private get fileServerUrl(): string {
    return (this.config.get<string>('FILE_SERVER_URL') || 'http://localhost:3002').replace(
      /\/+$/,
      '',
    );
  }

  /** Short-lived token the file server accepts (it verifies with the same secret). */
  private mintServiceToken(): string {
    return this.jwt.sign(
      { sub: 'public-document-upload', email: 'system@rmc.rw', role: 'system' },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: '2m' },
    );
  }

  /**
   * Validate and store one document.
   *
   * @param folder file-server folder — must be listed in PROTECTED_KEY_PREFIXES
   *               on the file server, or the document will be publicly readable.
   */
  async upload(file: UploadedDocument | undefined, folder: string): Promise<StoredDocument> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      throw new PayloadTooLargeException('The file must be 10 MB or smaller.');
    }
    if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('The file must be an image (JPG, PNG, WEBP) or a PDF.');
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );

    let res: Response;
    try {
      res = await fetch(`${this.fileServerUrl}/api/v1/upload?folder=${folder}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.mintServiceToken()}` },
        body: form,
      });
    } catch (err) {
      this.logger.error(`File server unreachable: ${(err as Error).message}`);
      throw new InternalServerErrorException('Could not store the file. Please try again.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`File server rejected the upload (${res.status}): ${body.slice(0, 200)}`);
      throw new InternalServerErrorException('Could not store the file. Please try again.');
    }

    const json = (await res.json()) as { data?: { key?: string }; key?: string };
    const key = json.data?.key ?? json.key;
    if (!key) {
      throw new InternalServerErrorException('The file server did not return a storage key.');
    }

    return {
      fileKey: key,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /** Read a stored document back, for an admin who is permitted to inspect it. */
  async fetch(fileKey: string): Promise<{ buffer: Buffer; mimeType: string }> {
    let res: Response;
    try {
      res = await fetch(`${this.fileServerUrl}/api/v1/files/${fileKey}`, {
        headers: { Authorization: `Bearer ${this.mintServiceToken()}` },
      });
    } catch (err) {
      this.logger.error(`File server unreachable: ${(err as Error).message}`);
      throw new InternalServerErrorException('Could not load the file.');
    }

    if (res.status === 404) throw new NotFoundException('The file is missing from storage.');
    if (!res.ok) {
      this.logger.error(`File server refused to serve ${fileKey} (${res.status})`);
      throw new InternalServerErrorException('Could not load the file.');
    }

    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      mimeType: res.headers.get('content-type') ?? 'application/octet-stream',
    };
  }
}
