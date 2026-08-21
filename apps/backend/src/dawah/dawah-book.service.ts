import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { DawahBook } from './entities/dawah-book.entity';
import { ContentStatus } from './entities/dawah-course.entity';
import { CreateDawahBookDto } from './dto/create-dawah-book.dto';
import { UpdateDawahBookDto } from './dto/update-dawah-book.dto';
import { QueryBooksDto } from './dto/query-books.dto';
import { slugify } from './dawah-slug.util';
import { PublicUploadService } from '../integrations/storage/public-upload.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FEATURED_LIMIT = 6;

/**
 * The file-server folder holding book PDFs — full files AND preview excerpts.
 * MUST remain in the file-server's DEFAULT_PROTECTED_PREFIXES: it is what makes
 * the backend the only path to the bytes, and therefore the only place the
 * visibility policy can be enforced. See plan §6.
 */
export const DAWAH_LIBRARY_FOLDER = 'dawah-library';

/**
 * 25 MB. PublicUploadService.fetch() buffers the whole file in memory before
 * re-serving it, so this cap is what stops a 100 MB book from spiking the
 * backend's heap on every read. Do not raise it without first replacing the
 * buffer with a streaming pipe.
 */
export const BOOK_MAX_BYTES = 25 * 1024 * 1024;

/** A book is a PDF. The mime type is checked; the extension is not trusted. */
export const BOOK_MIME_TYPES = ['application/pdf'];

/** What a resolved read looks like, whichever route asked for it. */
export interface BookFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * The digital library's catalogue half. Everything here is metadata — the
 * bytes (upload, preview, download) are Phase 2B and live in the file pipeline,
 * which is why this service never touches PublicUploadService.
 */
@Injectable()
export class DawahBookService {
  private readonly logger = new Logger(DawahBookService.name);

  constructor(
    @InjectRepository(DawahBook)
    private readonly books: Repository<DawahBook>,
    private readonly storage: PublicUploadService,
  ) {}

  /**
   * The public projection of a book. `fileKey` is deliberately absent, and this
   * is the single most important line of code in the file: it points into the
   * file-server's PROTECTED `dawah-library/` prefix. The protection means an
   * anonymous request for the raw key is
   * refused — but handing the key out anyway tells an attacker precisely what
   * to request, and turns any future misconfiguration of that prefix (see the
   * plan's §6 warning about PROTECTED_KEY_PREFIXES being an override, not an
   * append) from "harmless" into "every book is downloadable".
   *
   * `coverImageKey` IS exposed, because covers live under the public
   * `dawah-covers/` prefix and the frontend renders them straight from an
   * <img src>.
   *
   * Returning entities directly (as the course routes do) is fine where no
   * column is secret. Here one is, so the narrowing is explicit and central —
   * every public book route funnels through this method.
   */
  toPublic(book: DawahBook) {
    return {
      id: book.id,
      slug: book.slug,
      categoryId: book.categoryId,
      category: book.category ?? null,
      titleEn: book.titleEn,
      titleRw: book.titleRw,
      titleAr: book.titleAr,
      author: book.author,
      descriptionEn: book.descriptionEn,
      descriptionRw: book.descriptionRw,
      descriptionAr: book.descriptionAr,
      language: book.language,
      coverImageKey: book.coverImageKey,
      // Original filename and size — useful on a download button, and neither
      // is a storage key.
      fileName: book.fileName,
      fileSize: book.fileSize,
      mimeType: book.mimeType,
      pageCount: book.pageCount,
      allowDownload: book.allowDownload,
      viewCount: book.viewCount,
      downloadCount: book.downloadCount,
      isFeatured: book.isFeatured,
      publishedAt: book.publishedAt,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 1;
    for (;;) {
      const existing = await this.books.findOne({ where: { slug }, withDeleted: true });
      if (!existing || existing.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  private filteredQuery(query: QueryBooksDto) {
    const qb = this.books.createQueryBuilder('book').leftJoinAndSelect('book.category', 'category');

    if (query.category) {
      // Slug or id — the public URL carries ?category=fiqh, the admin UI has
      // the id. Comparing a non-UUID against a uuid column is a Postgres error,
      // not a miss, so the branch has to happen before the WHERE is built.
      if (UUID_RE.test(query.category)) {
        qb.andWhere('book.category_id = :categoryId', { categoryId: query.category });
      } else {
        qb.andWhere('category.slug = :categorySlug', { categorySlug: query.category });
      }
    }

    if (query.language) qb.andWhere('book.language = :language', { language: query.language });

    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      // Bracketed: without it the ORs escape the surrounding ANDs and a search
      // would defeat the status filter, leaking drafts onto the public listing.
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(book.title_en) LIKE :term', { term })
            .orWhere('LOWER(book.title_rw) LIKE :term', { term })
            .orWhere('LOWER(book.title_ar) LIKE :term', { term })
            .orWhere('LOWER(book.author) LIKE :term', { term });
        }),
      );
    }

    // Property names, not column names: paginating a JOINed query makes TypeORM
    // resolve every ordered term through entity metadata, where `sort_order` is
    // not a property and it dies on `undefined (reading 'databaseName')`.
    return qb.orderBy('book.sortOrder', 'ASC').addOrderBy('book.createdAt', 'DESC');
  }

  private async paginate(qb: ReturnType<typeof this.filteredQuery>, query: QueryBooksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  // ── Public ────────────────────────────────────────────────────────────────

  async listPublic(query: QueryBooksDto) {
    const qb = this.filteredQuery(query).andWhere('book.status = :published', {
      published: ContentStatus.PUBLISHED,
    });
    const { items, total, page, limit } = await this.paginate(qb, query);
    return { items: items.map((b) => this.toPublic(b)), total, page, limit };
  }

  async listFeatured() {
    const books = await this.books.find({
      where: { status: ContentStatus.PUBLISHED, isFeatured: true },
      relations: { category: true },
      order: { sortOrder: 'ASC' },
      take: FEATURED_LIMIT,
    });
    return books.map((b) => this.toPublic(b));
  }

  async findBySlugPublic(slug: string) {
    const book = await this.books.findOne({
      where: { slug, status: ContentStatus.PUBLISHED },
      relations: { category: true },
    });
    // Same 404 for "no such book" and "exists but unpublished" — telling an
    // anonymous visitor that a draft slug exists leaks the content pipeline.
    if (!book) throw new NotFoundException('Book not found');
    return this.toPublic(book);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /** Every status. Returns full entities — an admin may see the storage keys. */
  async adminList(query: QueryBooksDto) {
    const qb = this.filteredQuery(query);
    if (query.status) qb.andWhere('book.status = :status', { status: query.status });
    return this.paginate(qb, query);
  }

  async findOne(id: string): Promise<DawahBook> {
    const book = await this.books.findOne({ where: { id }, relations: { category: true } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async create(dto: CreateDawahBookDto): Promise<DawahBook> {
    const base = slugify(dto.slug || dto.titleEn);
    if (!base) {
      throw new BadRequestException('Could not derive a slug from the title — provide one');
    }
    const slug = await this.uniqueSlug(base);

    const status = dto.status ?? ContentStatus.DRAFT;

    const book = this.books.create({
      slug,
      categoryId: dto.categoryId ?? null,
      titleEn: dto.titleEn,
      // NOT NULL DEFAULT '' — the service supplies the empty string, the UI
      // falls back to English until someone fills it in.
      titleRw: dto.titleRw ?? '',
      titleAr: dto.titleAr ?? '',
      author: dto.author ?? '',
      descriptionEn: dto.descriptionEn ?? '',
      descriptionRw: dto.descriptionRw ?? '',
      descriptionAr: dto.descriptionAr ?? '',
      language: dto.language ?? undefined,
      coverImageKey: dto.coverImageKey ?? null,
      fileKey: dto.fileKey,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType ?? undefined,
      pageCount: dto.pageCount ?? null,
      allowDownload: dto.allowDownload ?? true,
      isFeatured: dto.isFeatured ?? false,
      status,
      sortOrder: dto.sortOrder ?? 0,
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
    });

    return this.books.save(book);
  }

  async update(id: string, dto: UpdateDawahBookDto): Promise<DawahBook> {
    const book = await this.findOne(id);

    let slug = book.slug;
    if (dto.slug !== undefined) {
      const requested = await this.uniqueSlug(slugify(dto.slug), book.id);
      // A published book's slug is its permalink — /dawah/library/:slug is what
      // has been shared and indexed. Renaming it 404s every inbound link, so the
      // change is dropped while the rest of the PATCH still lands. Drafts have
      // no audience yet and rename freely. Same rule as courses.
      if (book.status !== ContentStatus.PUBLISHED) slug = requested;
    }

    Object.assign(book, {
      slug,
      // Nullable columns: `undefined` means unchanged, explicit null means
      // clear — so they cannot use the ?? shorthand.
      categoryId: dto.categoryId !== undefined ? dto.categoryId : book.categoryId,
      titleEn: dto.titleEn ?? book.titleEn,
      titleRw: dto.titleRw ?? book.titleRw,
      titleAr: dto.titleAr ?? book.titleAr,
      author: dto.author ?? book.author,
      descriptionEn: dto.descriptionEn ?? book.descriptionEn,
      descriptionRw: dto.descriptionRw ?? book.descriptionRw,
      descriptionAr: dto.descriptionAr ?? book.descriptionAr,
      language: dto.language ?? book.language,
      coverImageKey: dto.coverImageKey !== undefined ? dto.coverImageKey : book.coverImageKey,
      fileKey: dto.fileKey ?? book.fileKey,
      fileName: dto.fileName ?? book.fileName,
      fileSize: dto.fileSize ?? book.fileSize,
      mimeType: dto.mimeType ?? book.mimeType,
      pageCount: dto.pageCount !== undefined ? dto.pageCount : book.pageCount,
      allowDownload: dto.allowDownload ?? book.allowDownload,
      isFeatured: dto.isFeatured ?? book.isFeatured,
      sortOrder: dto.sortOrder ?? book.sortOrder,
    });

    if (dto.status !== undefined && dto.status !== book.status) {
      book.status = dto.status;
      // Stamped on the FIRST publish only — it is when the book went live, not
      // when someone last toggled it.
      if (dto.status === ContentStatus.PUBLISHED && !book.publishedAt) {
        book.publishedAt = new Date();
      }
    }

    return this.books.save(book);
  }

  async remove(id: string): Promise<{ id: string }> {
    const book = await this.findOne(id);
    await this.books.softRemove(book);
    return { id };
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  /**
   * Store a book PDF under the protected prefix.
   *
   * PDF only, 25 MB max — both enforced here rather than inherited from
   * PublicUploadService's anonymous-form defaults (10 MB, images allowed). A
   * book is neither.
   */
  async uploadFile(file: Parameters<PublicUploadService['upload']>[0]) {
    return this.storage.upload(file, DAWAH_LIBRARY_FOLDER, {
      maxBytes: BOOK_MAX_BYTES,
      mimeTypes: BOOK_MIME_TYPES,
      typeErrorMessage: 'A book must be a PDF.',
    });
  }

  /** Fetch bytes from the file server. Only reachable via a policy check above. */
  private async fetchKey(book: DawahBook, fileKey: string): Promise<BookFile> {
    const { buffer, mimeType } = await this.storage.fetch(fileKey);
    return {
      buffer,
      mimeType: mimeType || book.mimeType || 'application/pdf',
      fileName: book.fileName,
    };
  }

  /**
   * Bump a counter without letting it break the read.
   *
   * Deliberately not awaited by the caller and deliberately swallowing its own
   * errors: a view counter is analytics, and a reader who opens a book must
   * never see it fail because a stats UPDATE hit a lock. The read is the
   * product; the number is a nice-to-have.
   */
  private bumpCounter(id: string, column: 'view_count' | 'download_count'): void {
    void this.books
      .increment({ id }, column === 'view_count' ? 'viewCount' : 'downloadCount', 1)
      .catch((err) => this.logger.warn(`Failed to bump ${column} for book ${id}: ${err.message}`));
  }

  /** Published book by slug, or 404. The gate every public file read passes. */
  private async getPublishedBook(slug: string): Promise<DawahBook> {
    const book = await this.books.findOne({
      where: { slug, status: ContentStatus.PUBLISHED },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  /**
   * Read a published book inline. Every book is public, so this is simply:
   * published-or-404, bump the view counter, stream the full PDF. The bytes
   * still flow through here (not a direct file-server URL) because
   * `dawah-library/` is a protected prefix and this is where the counter lives.
   */
  async getPreviewFile(slug: string): Promise<BookFile> {
    const book = await this.getPublishedBook(slug);
    this.bumpCounter(book.id, 'view_count');
    return this.fetchKey(book, book.fileKey);
  }

  /**
   * Download the full book. The only gate left is `allow_download`, which hides
   * the button and 403s the route — a deterrent, NOT DRM: anyone who can render
   * a PDF can save the bytes. Say so plainly to anyone who assumes otherwise.
   */
  async getDownloadFile(slug: string): Promise<BookFile> {
    const book = await this.getPublishedBook(slug);

    if (!book.allowDownload) {
      throw new ForbiddenException('This book is not available for download');
    }

    this.bumpCounter(book.id, 'download_count');
    return this.fetchKey(book, book.fileKey);
  }

  /**
   * The admin's proofing read: the full file regardless of status, visibility
   * or allow_download, so a book can be checked BEFORE it is published. Gated
   * by DAWAH_VIEW on the controller. Counters are not bumped — an admin
   * checking their own upload is not a reader.
   */
  async getAdminFile(id: string): Promise<BookFile> {
    const book = await this.findOne(id);
    return this.fetchKey(book, book.fileKey);
  }
}
