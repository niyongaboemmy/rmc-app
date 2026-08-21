import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';

import { ContentStatus, DawahCourse } from './entities/dawah-course.entity';
import { DawahCourseLesson, LessonContentType } from './entities/dawah-course-lesson.entity';
import { CreateDawahCourseDto } from './dto/create-dawah-course.dto';
import { UpdateDawahCourseDto } from './dto/update-dawah-course.dto';
import { CreateDawahLessonDto } from './dto/create-dawah-lesson.dto';
import { UpdateDawahLessonDto } from './dto/update-dawah-lesson.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { slugify } from './dawah-slug.util';
import { PublicUploadService } from '../integrations/storage/public-upload.service';
import {
  DAWAH_MEDIA_FOLDER,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
  applyLessonMediaInvariants,
} from './dawah-media.constants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The landing page shows an outline, not the whole catalogue. */
const FEATURED_LIMIT = 6;

/**
 * Courses and their lessons.
 *
 * Lessons deliberately live HERE rather than in a dawah-lesson.service.ts.
 * Every mutation of the lesson set has to update the denormalised
 * dawah_courses.lesson_count inside the same transaction, and a separate
 * service would either need a circular dependency on this one or would own half
 * of an invariant it cannot see. Keeping the counter next to the only code
 * allowed to write it is what stops it drifting.
 */
@Injectable()
export class DawahCourseService {
  constructor(
    @InjectRepository(DawahCourse)
    private readonly courses: Repository<DawahCourse>,
    @InjectRepository(DawahCourseLesson)
    private readonly lessons: Repository<DawahCourseLesson>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: PublicUploadService,
  ) {}

  // ── Lesson media upload ─────────────────────────────────────────────────────

  /**
   * Upload an audio file for a lesson to the PUBLIC `dawah-media/` prefix and
   * return its key. Video is never uploaded (external URL only), so this accepts
   * audio MIME types only. Mirrors DawahBookService.uploadFile, but public.
   */
  async uploadMedia(file: Parameters<PublicUploadService['upload']>[0]) {
    return this.storage.upload(file, DAWAH_MEDIA_FOLDER, {
      maxBytes: MEDIA_MAX_BYTES,
      mimeTypes: MEDIA_MIME_TYPES,
      typeErrorMessage: 'Lesson media must be an audio file (MP3, M4A, WAV, OGG…) or a PDF.',
    });
  }

  // ── Slugs ─────────────────────────────────────────────────────────────────

  /**
   * `base`, or `base-2`, `base-3`, … until free (ignoring `excludeId`).
   * withDeleted, because the unique index spans soft-deleted rows: a slug
   * released in the UI is not actually free, and reusing it would surface as a
   * raw constraint error rather than a message.
   */
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 1;
    for (;;) {
      const existing = await this.courses.findOne({ where: { slug }, withDeleted: true });
      if (!existing || existing.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  // ── Query building ────────────────────────────────────────────────────────

  private filteredQuery(query: QueryCoursesDto) {
    const qb = this.courses
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category');

    if (query.category) {
      // The filter accepts either form: the public URL carries ?category=fiqh,
      // while the admin UI has the id to hand. Comparing a non-UUID string
      // against a uuid column is a Postgres error, not a miss, so the shape has
      // to be decided before the WHERE is built.
      if (UUID_RE.test(query.category)) {
        qb.andWhere('course.category_id = :categoryId', { categoryId: query.category });
      } else {
        qb.andWhere('category.slug = :categorySlug', { categorySlug: query.category });
      }
    }

    if (query.level) qb.andWhere('course.level = :level', { level: query.level });
    if (query.language) qb.andWhere('course.language = :language', { language: query.language });

    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      // Bracketed so the OR group binds as a unit — without it the ORs would
      // escape the surrounding ANDs and a search would defeat the status filter,
      // leaking drafts onto the public listing.
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(course.title_en) LIKE :term', { term })
            .orWhere('LOWER(course.title_rw) LIKE :term', { term })
            .orWhere('LOWER(course.title_ar) LIKE :term', { term })
            .orWhere('LOWER(course.summary_en) LIKE :term', { term });
        }),
      );
    }

    // Property names, not column names. WHERE clauses tolerate either (an
    // unresolved `course.sort_order` is just passed through as raw SQL, which
    // happens to be valid), but ORDER BY does not: paginating a joined query
    // makes TypeORM build a DISTINCT-id subquery and resolve every ordered term
    // through entity metadata, where `sort_order` is not a property and it dies
    // on `Cannot read properties of undefined (reading 'databaseName')`.
    return qb.orderBy('course.sortOrder', 'ASC').addOrderBy('course.createdAt', 'DESC');
  }

  private async paginate(qb: ReturnType<typeof this.filteredQuery>, query: QueryCoursesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  // ── Public reads ──────────────────────────────────────────────────────────

  /** Published courses only. `query.status` is ignored here, deliberately. */
  async listPublic(query: QueryCoursesDto) {
    const qb = this.filteredQuery(query).andWhere('course.status = :published', {
      published: ContentStatus.PUBLISHED,
    });
    return this.paginate(qb, query);
  }

  /** The landing page's "outline of courses". */
  async listFeatured(): Promise<DawahCourse[]> {
    return this.courses.find({
      where: { status: ContentStatus.PUBLISHED, isFeatured: true },
      relations: { category: true },
      order: { sortOrder: 'ASC' },
      take: FEATURED_LIMIT,
    });
  }

  /** The detail page: the course plus its outline, in order. */
  async findBySlugPublic(slug: string): Promise<DawahCourse> {
    const course = await this.courses.findOne({
      where: { slug, status: ContentStatus.PUBLISHED },
      relations: { category: true, lessons: true },
    });
    // Same 404 for "no such course" and "exists but is a draft" — telling an
    // anonymous visitor that an unpublished slug exists leaks the content
    // pipeline for nothing.
    if (!course) throw new NotFoundException('Course not found');

    course.lessons?.sort((a, b) => a.sortOrder - b.sortOrder);
    return course;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /** Same filters as the public list, but every status. */
  async adminList(query: QueryCoursesDto) {
    const qb = this.filteredQuery(query);
    if (query.status) qb.andWhere('course.status = :status', { status: query.status });
    return this.paginate(qb, query);
  }

  async findOne(id: string): Promise<DawahCourse> {
    const course = await this.courses.findOne({
      where: { id },
      relations: { category: true, lessons: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    course.lessons?.sort((a, b) => a.sortOrder - b.sortOrder);
    return course;
  }

  async create(dto: CreateDawahCourseDto): Promise<DawahCourse> {
    const base = slugify(dto.slug || dto.titleEn);
    if (!base) {
      throw new BadRequestException('Could not derive a slug from the title — provide one');
    }
    const slug = await this.uniqueSlug(base);

    const status = dto.status ?? ContentStatus.DRAFT;

    const course = this.courses.create({
      slug,
      categoryId: dto.categoryId ?? null,
      titleEn: dto.titleEn,
      // Tri-lingual siblings are NOT NULL DEFAULT '' — the service supplies the
      // empty string, and the UI falls back to English until someone fills it.
      titleRw: dto.titleRw ?? '',
      titleAr: dto.titleAr ?? '',
      summaryEn: dto.summaryEn,
      summaryRw: dto.summaryRw ?? '',
      summaryAr: dto.summaryAr ?? '',
      descriptionEn: dto.descriptionEn ?? '',
      descriptionRw: dto.descriptionRw ?? '',
      descriptionAr: dto.descriptionAr ?? '',
      level: dto.level ?? undefined,
      language: dto.language ?? undefined,
      format: dto.format ?? undefined,
      coverImageKey: dto.coverImageKey ?? null,
      instructorName: dto.instructorName ?? null,
      instructorTitle: dto.instructorTitle ?? null,
      instructorPhotoKey: dto.instructorPhotoKey ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      lessonCount: 0,
      isFeatured: dto.isFeatured ?? false,
      status,
      sortOrder: dto.sortOrder ?? 0,
      // A course created straight into 'published' still needs its stamp —
      // otherwise it would sit published with a null published_at until someone
      // happened to toggle the status.
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
    });

    return this.courses.save(course);
  }

  async update(id: string, dto: UpdateDawahCourseDto): Promise<DawahCourse> {
    const course = await this.findOne(id);

    let slug = course.slug;
    if (dto.slug !== undefined) {
      const requested = await this.uniqueSlug(slugify(dto.slug), course.id);
      // A published course's slug is its public URL, and /dawah/courses/:slug is
      // what has been linked, bookmarked and indexed. Renaming it 404s every one
      // of those inbound links for a cosmetic gain, so the change is dropped
      // rather than rejected: the admin's other edits in the same PATCH still
      // land. Drafts have no audience yet, so they rename freely.
      if (course.status !== ContentStatus.PUBLISHED) slug = requested;
    }

    Object.assign(course, {
      slug,
      // categoryId is nullable: `undefined` means "unchanged", an explicit null
      // means "clear it", so it can't use the ?? shorthand. Same for every
      // nullable column below.
      categoryId: dto.categoryId !== undefined ? dto.categoryId : course.categoryId,
      titleEn: dto.titleEn ?? course.titleEn,
      titleRw: dto.titleRw ?? course.titleRw,
      titleAr: dto.titleAr ?? course.titleAr,
      summaryEn: dto.summaryEn ?? course.summaryEn,
      summaryRw: dto.summaryRw ?? course.summaryRw,
      summaryAr: dto.summaryAr ?? course.summaryAr,
      descriptionEn: dto.descriptionEn ?? course.descriptionEn,
      descriptionRw: dto.descriptionRw ?? course.descriptionRw,
      descriptionAr: dto.descriptionAr ?? course.descriptionAr,
      level: dto.level ?? course.level,
      language: dto.language ?? course.language,
      format: dto.format ?? course.format,
      coverImageKey: dto.coverImageKey !== undefined ? dto.coverImageKey : course.coverImageKey,
      instructorName: dto.instructorName !== undefined ? dto.instructorName : course.instructorName,
      instructorTitle:
        dto.instructorTitle !== undefined ? dto.instructorTitle : course.instructorTitle,
      instructorPhotoKey:
        dto.instructorPhotoKey !== undefined ? dto.instructorPhotoKey : course.instructorPhotoKey,
      durationMinutes:
        dto.durationMinutes !== undefined ? dto.durationMinutes : course.durationMinutes,
      isFeatured: dto.isFeatured ?? course.isFeatured,
      sortOrder: dto.sortOrder ?? course.sortOrder,
    });

    // Status moves through setStatus(), which owns the published_at stamp. If a
    // PATCH carries one, route it through there rather than assigning it here,
    // so there is exactly one path that can publish a course.
    if (dto.status !== undefined && dto.status !== course.status) {
      const saved = await this.courses.save(course);
      return this.setStatus(saved.id, dto.status);
    }

    return this.courses.save(course);
  }

  async setStatus(id: string, status: ContentStatus): Promise<DawahCourse> {
    const course = await this.findOne(id);

    course.status = status;
    // Stamped on the FIRST publish only. Un-publishing and re-publishing keeps
    // the original date — it is when the course went live, not when it was last
    // toggled, and it drives "newest first" ordering downstream.
    if (status === ContentStatus.PUBLISHED && !course.publishedAt) {
      course.publishedAt = new Date();
    }

    return this.courses.save(course);
  }

  /** Soft delete — the course keeps its row, so its lessons (hard-linked) survive. */
  async remove(id: string): Promise<{ id: string }> {
    const course = await this.findOne(id);
    await this.courses.softRemove(course);
    return { id };
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  /**
   * Recount from the lesson table and write it to the course, inside the
   * caller's transaction. Recomputed rather than incremented: an increment is
   * only correct if every past mutation was also correct, and a counter that
   * can drift is worse than no counter — the UI would show "4 lessons" over a
   * three-lesson outline and nobody would know which was lying.
   */
  private async syncLessonCount(manager: EntityManager, courseId: string): Promise<void> {
    const count = await manager.count(DawahCourseLesson, { where: { courseId } });
    await manager.update(DawahCourse, { id: courseId }, { lessonCount: count });
  }

  private async getLesson(id: string): Promise<DawahCourseLesson> {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async addLesson(courseId: string, dto: CreateDawahLessonDto): Promise<DawahCourseLesson> {
    // Existence check before the transaction: the FK would reject an unknown
    // course anyway, but as a constraint violation rather than a clean 404.
    await this.findOne(courseId);

    return this.dataSource.transaction(async (manager) => {
      const max = await manager
        .createQueryBuilder(DawahCourseLesson, 'l')
        .select('MAX(l.sort_order)', 'm')
        .where('l.course_id = :courseId', { courseId })
        .getRawOne<{ m: number | null }>();

      const lesson = manager.create(DawahCourseLesson, {
        courseId,
        titleEn: dto.titleEn,
        titleRw: dto.titleRw ?? '',
        titleAr: dto.titleAr ?? '',
        summaryEn: dto.summaryEn ?? '',
        summaryRw: dto.summaryRw ?? '',
        summaryAr: dto.summaryAr ?? '',
        bodyEn: dto.bodyEn ?? '',
        bodyRw: dto.bodyRw ?? '',
        bodyAr: dto.bodyAr ?? '',
        contentType: dto.contentType ?? LessonContentType.TEXT,
        mediaKey: dto.mediaKey ?? null,
        mediaUrl: dto.mediaUrl ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        sortOrder: dto.sortOrder ?? Number(max?.m ?? -1) + 1,
      });

      // Enforce content-type ⇄ media rules and clear irrelevant columns (DB-1 §2).
      applyLessonMediaInvariants(lesson);

      const saved = await manager.save(lesson);
      await this.syncLessonCount(manager, courseId);
      return saved;
    });
  }

  /** Edits content, never membership — so the course's lesson_count is untouched. */
  async updateLesson(id: string, dto: UpdateDawahLessonDto): Promise<DawahCourseLesson> {
    const lesson = await this.getLesson(id);

    Object.assign(lesson, {
      titleEn: dto.titleEn ?? lesson.titleEn,
      titleRw: dto.titleRw ?? lesson.titleRw,
      titleAr: dto.titleAr ?? lesson.titleAr,
      summaryEn: dto.summaryEn ?? lesson.summaryEn,
      summaryRw: dto.summaryRw ?? lesson.summaryRw,
      summaryAr: dto.summaryAr ?? lesson.summaryAr,
      bodyEn: dto.bodyEn ?? lesson.bodyEn,
      bodyRw: dto.bodyRw ?? lesson.bodyRw,
      bodyAr: dto.bodyAr ?? lesson.bodyAr,
      contentType: dto.contentType ?? lesson.contentType,
      mediaKey: dto.mediaKey !== undefined ? dto.mediaKey : lesson.mediaKey,
      mediaUrl: dto.mediaUrl !== undefined ? dto.mediaUrl : lesson.mediaUrl,
      durationMinutes:
        dto.durationMinutes !== undefined ? dto.durationMinutes : lesson.durationMinutes,
      sortOrder: dto.sortOrder ?? lesson.sortOrder,
    });

    // Re-enforce the rules against the merged content_type so a type switch
    // (e.g. video → text) clears the now-stale media column(s) (DB-1 §2).
    applyLessonMediaInvariants(lesson);

    return this.lessons.save(lesson);
  }

  /**
   * HARD delete. dawah_course_lessons has no deleted_at, by design (§4.3): a
   * removed lesson is a mistake being corrected while a course is still being
   * built, not a record anyone audits.
   */
  async removeLesson(id: string): Promise<{ id: string }> {
    const lesson = await this.getLesson(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DawahCourseLesson, { id });
      await this.syncLessonCount(manager, lesson.courseId);
    });

    return { id };
  }

  /**
   * Rewrites the whole outline order in one transaction.
   *
   * `ids` must be EXACTLY the course's lesson set — same members, no
   * duplicates, nothing missing. The failure this guards against is silent: a
   * stale admin tab that reorders 4 lessons while a colleague adds a 5th would,
   * under a forgiving implementation, write positions for the 4 it knows about
   * and leave the 5th sharing a sort_order with one of them. The outline then
   * renders in an order nobody chose and no error is ever raised. Rejecting the
   * whole request costs the admin a refresh; accepting it corrupts the course.
   */
  async reorderLessons(courseId: string, ids: string[]): Promise<DawahCourseLesson[]> {
    await this.findOne(courseId);

    return this.dataSource.transaction(async (manager) => {
      const lessons = await manager.find(DawahCourseLesson, { where: { courseId } });

      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        throw new BadRequestException('ids contains duplicate lesson ids');
      }

      const actual = new Set(lessons.map((l) => l.id));
      if (unique.size !== actual.size || ![...unique].every((id) => actual.has(id))) {
        throw new BadRequestException(
          `ids must contain exactly the ${actual.size} lesson(s) of this course`,
        );
      }

      const byId = new Map(lessons.map((l) => [l.id, l]));
      const reordered = ids.map((id, index) => {
        const lesson = byId.get(id) as DawahCourseLesson;
        lesson.sortOrder = index;
        return lesson;
      });

      await manager.save(reordered);
      // Membership is unchanged by definition here, but the recount is cheap and
      // keeps "every lesson-set mutation ends with a sync" true without
      // exception — which is what makes the invariant checkable.
      await this.syncLessonCount(manager, courseId);

      return reordered;
    });
  }
}
