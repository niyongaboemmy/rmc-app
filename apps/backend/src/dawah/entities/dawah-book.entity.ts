import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { DawahCategory } from './dawah-category.entity';
import { ContentStatus } from './dawah-course.entity';

/**
 * Who may read the book. `members` requires a logged-in caller; the backend —
 * not the file-server — enforces it, because `dawah-library/` is a protected
 * prefix and the bytes can only be reached through us. Mirrored by
 * CHK_dawah_book_visibility.
 */
export enum BookVisibility {
  PUBLIC = 'public',
  MEMBERS = 'members',
}

/**
 * The language the book is *written* in — a separate axis from the tri-lingual
 * catalogue copy. 'other' exists because a library will eventually hold a title
 * in a language the platform does not localise into.
 * Mirrored by CHK_dawah_book_lang.
 */
export const BOOK_LANGUAGES = ['en', 'rw', 'ar', 'other'] as const;
export type BookLanguage = (typeof BOOK_LANGUAGES)[number];

/**
 * A book in the digital library.
 *
 * Three fields carry all the licensing policy (plan §4.4):
 *   · `visibility`       — public reads for anyone, members requires a login
 *   · `allowDownload`    — false hides the button AND 403s the download route
 *   · `previewFileKey`   — an optional excerpt, readable even when the full
 *                          book is members-only
 *
 * Say this out loud when RMC asks: `allowDownload = false` is a **deterrent,
 * not DRM**. Anyone who can render a PDF can save the bytes. It stops casual
 * redistribution and nothing more.
 */
@Entity('dawah_books')
export class DawahBook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Permalink: /dawah/library/:slug. */
  @Column({ type: 'varchar', length: 140, unique: true })
  slug: string;

  @Index('IDX_dawah_books_category')
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => DawahCategory, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: DawahCategory | null;

  @Column({ name: 'title_en', type: 'varchar', length: 200 })
  titleEn: string;

  @Column({ name: 'title_rw', type: 'varchar', length: 200, default: '' })
  titleRw: string;

  @Column({ name: 'title_ar', type: 'varchar', length: 200, default: '' })
  titleAr: string;

  /** Not translated — an author's name is spelled the same in every locale. */
  @Column({ type: 'varchar', length: 160, default: '' })
  author: string;

  @Column({ name: 'description_en', type: 'text', default: '' })
  descriptionEn: string;

  @Column({ name: 'description_rw', type: 'text', default: '' })
  descriptionRw: string;

  @Column({ name: 'description_ar', type: 'text', default: '' })
  descriptionAr: string;

  /** Language the book itself is written in — see BOOK_LANGUAGES. */
  @Column({ type: 'varchar', length: 20, default: 'en' })
  language: BookLanguage;

  /** Public `dawah-covers/` key — safe to put straight in an <img src>. */
  @Column({ name: 'cover_image_key', type: 'varchar', length: 500, nullable: true })
  coverImageKey: string | null;

  /**
   * Protected `dawah-library/` key. Never serialise this to a public response:
   * the whole point of the protected prefix is that the key alone is useless,
   * but leaking it hands an authenticated caller a direct file-server URL that
   * skips the visibility check and the counters.
   */
  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, default: 'application/pdf' })
  mimeType: string;

  @Column({ name: 'page_count', type: 'int', nullable: true })
  pageCount: number | null;

  /**
   * Optional excerpt PDF, also under `dawah-library/`. When set, anonymous
   * visitors preview *this* even if the full book is members-only — it is what
   * makes "show the book without giving it away" possible.
   */
  @Column({ name: 'preview_file_key', type: 'varchar', length: 500, nullable: true })
  previewFileKey: string | null;

  @Column({ type: 'varchar', length: 20, default: BookVisibility.PUBLIC })
  visibility: BookVisibility;

  /** False → the Download button is hidden and the download route returns 403. */
  @Column({ name: 'allow_download', type: 'boolean', default: true })
  allowDownload: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount: number;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Index('IDX_dawah_books_status')
  @Column({ type: 'varchar', length: 20, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
