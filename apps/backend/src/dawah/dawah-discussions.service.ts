import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahModerationLog, type ModerationAction } from './entities/dawah-moderation-log.entity';
import { DawahCategory } from './entities/dawah-category.entity';
import { DawahQuestionRating } from './entities/dawah-question-rating.entity';
import { User } from '../users/entities/user.entity';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../integrations/email/email.service';
import { answeredEmail } from './discussions-notifications';
import { renderPostMarkdown } from './discussions-markdown';
import { slugify } from './dawah-slug.util';
import { DISCUSSION_LIMITS, RELATED_LIMIT } from './discussions.constants';
import type { QueryDiscussionsDto } from './dto/query-discussions.dto';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { AnswerQuestionDto, CreateEntryDto } from './dto/create-entry.dto';
import type { RateQuestionDto } from './dto/rate-question.dto';

/** The public shape of the person who answered. */
export interface PublicAuthor {
  name: string;
  isScholar: boolean;
}

/**
 * The searchable text of an entry, as ONE expression used everywhere it is needed.
 *
 * Written once because it has to be identical in three places — the WHERE clause, the
 * ts_rank ordering, and the GIN index in migration 050 — and a GIN index on an expression
 * is only used when the query repeats it byte-for-byte. Three hand-copied string literals
 * are three chances to drift into a silent sequential scan.
 *
 * `q` is the query-builder alias for dawah_questions; the migration spells the same
 * expression with bare column names.
 */
const FTS_VECTOR = `to_tsvector('simple', coalesce(q.title, '') || ' ' || coalesce(q.body, '') || ' ' || coalesce(q.answer_body, ''))`;

/**
 * Dawah Q&A — an editorial knowledge base, not a forum.
 *
 * ── The model, and how it differs from the one this file used to hold ────────────────
 *
 * RMC authors the answers. A row therefore arrives one of two ways: an admin writes both
 * halves at once (`createEntry`), or a member submits a question (`submitQuestion`) and an
 * admin answers it later (`answerQuestion`). Nothing is public until it has an answer.
 *
 * That single fact removed most of this service. Member-authored answers are gone, and
 * with them voting (nothing to rank against one authoritative answer), the scholar
 * release/verify split (every answer is already RMC's word), and member reporting (an
 * appeal to the moderators against something the moderators wrote).
 *
 * ── toPublic() is still the single most important thing in this file ─────────────────
 *
 * It remains the ONLY way a row reaches a response. What it guards has changed: the old
 * risk was leaking an anonymous asker's identity, so anonymity was a projection concern.
 * Here the asker is **never projected at all** — a published entry is a question and RMC's
 * answer, with no "asked by". That is a stronger guarantee than the flag it replaces:
 * there is no field to leak, in any status, for any caller.
 *
 * The answerer IS named, deliberately. The old code put it well: "Verified by RMC" with
 * nobody behind it is an institution hiding behind itself.
 */
/**
 * One-way hash for the values this module stores about an anonymous rater.
 *
 * Both the browser token and the IP are identifiers a reader never consented to have
 * kept, so neither is stored in the clear — a dump of the ratings table has to be
 * useless as a list of who read what. No pepper: these are dedupe keys compared only
 * against hashes computed the same way, never secrets that have to survive a guess.
 */
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class DawahDiscussionsService {
  private readonly logger = new Logger(DawahDiscussionsService.name);

  constructor(
    @InjectRepository(DawahQuestion) private readonly questions: Repository<DawahQuestion>,
    @InjectRepository(DawahCategory) private readonly categories: Repository<DawahCategory>,
    @InjectRepository(DawahQuestionRating)
    private readonly ratings: Repository<DawahQuestionRating>,
    private readonly dataSource: DataSource,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** The answering admin, for display. */
  private publicAuthor(user: User | null | undefined): PublicAuthor | null {
    if (!user) return null;
    return {
      name: `${user.firstName} ${user.lastName}`.trim(),
      // Reads `roleEntity` — the RBAC relation that actually carries permissions — NOT
      // `user.role`, a legacy varchar that knows nothing about the Scholar role. Reading a
      // live relation also means the badge disappears the moment RMC un-appoints someone.
      isScholar: user.roleEntity?.slug === 'scholar',
    };
  }

  /**
   * The public projection of one Q&A entry. Everything the client is allowed to know.
   *
   * ABSENT ON PURPOSE — each is a decision, not an oversight:
   *   · author / authorId — who ASKED is never public; see the class comment
   *   · body / answerBody — markdown source; the client renders nothing, it gets HTML
   *   · status            — only published rows reach a public route anyway
   */
  toPublic(question: DawahQuestion) {
    return {
      id: question.id,
      slug: question.slug,
      title: question.title,
      // Rendered and sanitised HERE, on read — not stored as HTML. A DOMPurify fix next
      // year protects every entry already written; input-time sanitising would not.
      bodyHtml: renderPostMarkdown(question.body),
      answerHtml: renderPostMarkdown(question.answerBody),
      language: question.language,
      category: question.category ?? null,
      answeredBy: this.publicAuthor(question.answeredBy),
      answeredAt: question.answeredAt,
      viewCount: question.viewCount,
      publishedAt: question.publishedAt,
      createdAt: question.createdAt,
    };
  }

  /** The listing. Published only — enforced here, so no route can forget to. */
  async list(query: QueryDiscussionsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 12));

    const qb = this.questions
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.category', 'category')
      .leftJoinAndSelect('q.answeredBy', 'answeredBy')
      .leftJoinAndSelect('answeredBy.roleEntity', 'answeredByRole')
      .where('q.status = :status', { status: 'published' });

    if (query.category) {
      qb.andWhere('category.slug = :category', { category: query.category });
    }
    if (query.language) {
      qb.andWhere('q.language = :language', { language: query.language });
    }

    // Full-text search across the question AND RMC's answer — the answer is usually the
    // substance, and the phrase a reader remembers may appear only there.
    //
    // ⚠ This expression MUST match the GIN index in migration 050 BYTE-FOR-BYTE. A GIN
    // index on an expression is only usable when the query repeats it exactly; change one
    // without the other and Postgres silently stops using the index and rebuilds the vector
    // per row. No error, no wrong rows — just a sequential scan that only hurts once the
    // table is big.
    //
    // websearch_to_tsquery accepts what a human types ("wudu travelling", quoted phrases,
    // -exclusions) without throwing on punctuation the way to_tsquery does.
    const searchTerm = query.search?.trim();
    if (searchTerm) {
      qb.andWhere(`${FTS_VECTOR} @@ websearch_to_tsquery('simple', :q)`, { q: searchTerm });
    }

    // NOTE: orderBy() takes ENTITY PROPERTY paths (publishedAt), never column names
    // (published_at). A column name typechecks perfectly and throws "Cannot read properties
    // of undefined (reading 'databaseName')" at runtime. Verified the hard way.
    if (searchTerm) {
      // Relevance first when there is a query — a keyword match sorted by date buries the
      // best hit under whatever was published most recently.
      qb.addSelect(`ts_rank(${FTS_VECTOR}, websearch_to_tsquery('simple', :q))`, 'rank')
        .orderBy('rank', 'DESC')
        .addOrderBy('q.publishedAt', 'DESC');
    } else {
      // Publication order, NOT creation order: a question asked in March and answered in
      // July belongs at the top of the list in July, not buried back in March.
      qb.orderBy('q.publishedAt', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: items.map((q) => this.toPublic(q)), total, page, limit };
  }

  /**
   * One entry. 404 — never 403 — for anything not published.
   *
   * A 403 confirms the row exists, which turns the status code itself into a notice:
   * "your question was rejected" is a message RMC should choose to send, not one the HTTP
   * layer leaks to anyone who guesses a slug.
   */
  async bySlug(slug: string) {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      relations: { category: true, answeredBy: { roleEntity: true } },
    });
    if (!question) throw new NotFoundException('Question not found');

    this.bumpViewCount(question.id);
    return this.toPublic(question);
  }

  /**
   * Bump a view counter without letting it break the read.
   *
   * Deliberately not awaited and deliberately swallowing its own errors — the same
   * discipline as DawahBookService.bumpCounter. A reader must never see a page fail
   * because a stats UPDATE hit a lock. The entry is the product; the number is not.
   */
  private bumpViewCount(id: string): void {
    void this.questions
      .increment({ id }, 'viewCount', 1)
      .catch((err) =>
        this.logger.warn(`Failed to bump view_count for question ${id}: ${err.message}`),
      );
  }

  /**
   * Record "was this answer helpful?" from one browser.
   *
   * 404s anything not published, for the same reason `bySlug` does: the status code must
   * not become a way to probe which slugs exist as unpublished rows.
   *
   * ── Why ON CONFLICT rather than find-then-save ──────────────────────────────────────
   *
   * A reader who double-clicks, or who changes their mind from yes to no, sends a second
   * POST against the same (question, voter) pair. Read-then-write loses that race and
   * surfaces a unique-constraint violation as a 500 on what is a perfectly ordinary
   * action; the upsert makes the second write update the first. `updated_at` moves so the
   * change of mind is visible, `created_at` does not so the first rating is still dated.
   *
   * Returns only an acknowledgement. The tallies are an editorial signal for RMC, so
   * nothing here hands a caller a running score it could poll.
   */
  async rate(slug: string, dto: RateQuestionDto, ip?: string): Promise<{ recorded: boolean }> {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.ratings
      .createQueryBuilder()
      .insert()
      .values({
        questionId: question.id,
        helpful: dto.helpful === 'yes',
        voterHash: sha256(dto.voterKey),
        // Absent behind a proxy that strips it; the column is nullable precisely so a
        // missing IP costs the rating nothing.
        ipHash: ip ? sha256(ip) : null,
      })
      .orUpdate(['helpful', 'ip_hash', 'updated_at'], ['question_id', 'voter_hash'])
      .execute();

    return { recorded: true };
  }

  /**
   * Up to `limit` other published entries to read next.
   *
   * Same category first, then most recently published. One query does both, via a CASE
   * that sorts in-category rows ahead of the rest — which also means the list is never
   * short: an entry with no category, or the only one in its category, still gets filled
   * out with recent entries rather than rendering an empty rail.
   *
   * ── Why CASE and not `(category_id = :id) DESC` ─────────────────────────────────────
   *
   * The boolean form looks equivalent and is not. For a row whose category_id is NULL the
   * comparison yields NULL, not false, and Postgres sorts NULLs FIRST under DESC — so
   * uncategorised entries would outrank entries that are genuinely in a different
   * category. CASE returns a concrete 0 or 1 and has no such trap.
   *
   * Not full-text similarity: the corpus is small and hand-curated, and a shared category
   * is an editorial judgement RMC already made. Ranking by ts_rank against the current
   * title would surface entries that merely repeat its vocabulary.
   */
  async related(slug: string, limit = RELATED_LIMIT) {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      select: { id: true, categoryId: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    const take = Math.min(Math.max(1, limit), RELATED_LIMIT);

    const items = await this.questions
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.category', 'category')
      .where('q.status = :status', { status: 'published' })
      // Never the entry being read. Without this the reader is offered the page they
      // are already on, and the list silently drops to two.
      .andWhere('q.id != :id', { id: question.id })
      .orderBy('CASE WHEN q.category_id = :categoryId THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('q.publishedAt', 'DESC')
      .setParameter('categoryId', question.categoryId)
      // limit(), NOT take(). take() wraps the query in a SELECT DISTINCT id subquery for
      // paginating one-to-many joins, and Postgres rejects a DISTINCT whose ORDER BY
      // references an expression that is not in the select list — which the CASE above is.
      // `category` is a to-one join, so no row multiplication and nothing for take() to
      // protect against; a plain LIMIT is both correct and what the query means.
      .limit(take)
      .getMany();

    // A deliberately thin shape: this is a list of links, so it carries no bodies and no
    // answer HTML. Rendering markdown for three entries nobody may click is work spent on
    // markup the page throws away.
    return {
      items: items.map((q) => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        language: q.language,
        category: q.category ? { id: q.category.id, slug: q.category.slug } : null,
        publishedAt: q.publishedAt,
      })),
    };
  }

  /**
   * Helpful / not-helpful counts for a page of entries, in one grouped query.
   *
   * Read live rather than kept as counters on `dawah_questions`. A rating can be changed
   * (yes → no) and a question can be hard-deleted, so a denormalised pair would need
   * every one of those paths to remember to adjust it, and a counter that has drifted is
   * worse than no counter — it reads as fact. This is the admin list only, one query per
   * page of 20, so the aggregate costs nothing worth denormalising for.
   */
  private async ratingTallies(
    ids: string[],
  ): Promise<Map<string, { helpful: number; notHelpful: number }>> {
    if (!ids.length) return new Map();

    const rows = await this.ratings
      .createQueryBuilder('r')
      .select('r.question_id', 'questionId')
      .addSelect('COUNT(*) FILTER (WHERE r.helpful)', 'helpful')
      .addSelect('COUNT(*) FILTER (WHERE NOT r.helpful)', 'notHelpful')
      .where('r.question_id IN (:...ids)', { ids })
      .groupBy('r.question_id')
      .getRawMany<{ questionId: string; helpful: string; notHelpful: string }>();

    // COUNT comes back as a string — Postgres bigint does not fit a JS number, and the
    // driver refuses to guess. Number() here, not on the far side in the UI.
    return new Map(
      rows.map((r) => [
        r.questionId,
        { helpful: Number(r.helpful), notHelpful: Number(r.notHelpful) },
      ]),
    );
  }

  /**
   * Render a draft to sanitised HTML for the compose preview.
   *
   * Exists so the preview goes through the EXACT pipeline the published entry will —
   * render markdown client-side "just for preview" and the two drift, and the day they
   * drift is the day someone finds the gap between what they saw and what shipped.
   */
  previewMarkdown(body: string): { html: string } {
    return { html: renderPostMarkdown(body) };
  }

  // ══ MEMBER SUBMISSION ══════════════════════════════════════════════════════

  /**
   * Submit a question for RMC to answer.
   *
   * Born `pending` — invisible until an admin answers it. This is the inversion of the old
   * model, where a question went live on submit. Status is neither computed nor accepted
   * from the DTO: a client-settable status is a client-settable publication gate.
   *
   * The rate limits are keyed on the USER, not the IP: submitting requires auth, and IP
   * keying punishes shared connections, which in Kigali is many people on one address.
   */
  async submitQuestion(user: User, dto: CreateQuestionDto) {
    await this.assertMayPost(user);

    // Identical-to-last-post guard: catches the double-submit and the copy-paste spammer.
    const last = await this.questions.findOne({
      where: { authorId: user.id },
      order: { createdAt: 'DESC' },
      withDeleted: true,
    });
    if (last && last.title.trim() === dto.title.trim() && last.body.trim() === dto.body.trim()) {
      throw new HttpException('You already submitted this.', HttpStatus.CONFLICT);
    }

    const category = await this.resolveCategory(dto.categoryId);

    const question = await this.insertWithUniqueSlug(dto.title, (slug) =>
      this.questions.create({
        slug,
        title: dto.title.trim(),
        body: dto.body,
        language: dto.language,
        categoryId: category?.id ?? null,
        authorId: user.id,
        status: 'pending',
        // Explicit even though it matches the column default — the two writers should
        // read the same way, and a default is not a statement of intent.
        origin: 'member',
        lastActivityAt: new Date(),
      }),
    );

    // Deliberately NOT toPublic(): there is nothing public about it yet. The submitter is
    // told it was received and is awaiting an answer, and nothing more.
    return { id: question.id, title: question.title, status: question.status };
  }

  /**
   * The rate-limit gate. Throws 429 (or 403 for a brand-new account).
   *
   * Not @nestjs/throttler: that guard keys on IP and is not even registered globally here.
   * A DB count keyed on author_id survives a restart, which an in-memory limiter does not.
   */
  private async assertMayPost(user: User): Promise<void> {
    const ageHours = (Date.now() - new Date(user.createdAt).getTime()) / 3_600_000;
    if (ageHours < DISCUSSION_LIMITS.NEW_ACCOUNT_POST_DELAY_HOURS) {
      throw new ForbiddenException(
        'New accounts can post after 24 hours. This is a spam guard, not a judgement.',
      );
    }
    const anHourAgo = new Date(Date.now() - 3_600_000);
    const recent = await this.questions.count({
      where: { authorId: user.id, createdAt: MoreThan(anHourAgo) },
      withDeleted: true, // deleting your spam must not reset the meter
    });
    if (recent >= DISCUSSION_LIMITS.MAX_QUESTIONS_PER_HOUR) {
      throw new HttpException(
        "You're posting too quickly — try again in a little while.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async resolveCategory(categoryId?: string | null): Promise<DawahCategory | null> {
    if (!categoryId) return null;
    const category = await this.categories.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /**
   * Insert, retrying with a fresh suffix if the slug collides. The DB's unique index is the
   * arbiter — a pre-check SELECT races.
   *
   * A non-Latin title (Arabic, or Kinyarwanda after diacritics strip) can slugify to empty,
   * so the base falls back to a stable word rather than leaving the URL as just a suffix.
   */
  private async insertWithUniqueSlug(
    title: string,
    build: (slug: string) => DawahQuestion,
  ): Promise<DawahQuestion> {
    const base = slugify(title) || 'question';
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(3).toString('hex');
      try {
        return await this.questions.save(build(`${base}-${suffix}`.slice(0, 180)));
      } catch (err: unknown) {
        // 23505 = unique_violation. Anything else is a real error.
        if ((err as { code?: string }).code === '23505' && attempt < 4) continue;
        throw err;
      }
    }
    throw new HttpException('Could not generate a unique link.', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // ══ EDITORIAL (gated on DISCUSSIONS_VERIFY at the controller) ═══════════════

  /**
   * Author a complete entry — question and answer together — and publish it.
   *
   * `authorId` is the admin: somebody asked this, even if only rhetorically, and the column
   * is NOT NULL because an unattributable row is an unauditable one. It is never projected
   * publicly, so this does not imply the admin "asked" it in the reader's eyes.
   */
  async createEntry(admin: User, dto: CreateEntryDto) {
    const category = await this.resolveCategory(dto.categoryId);
    const now = new Date();

    const question = await this.insertWithUniqueSlug(dto.title, (slug) =>
      this.questions.create({
        slug,
        title: dto.title.trim(),
        body: dto.body,
        answerBody: dto.answerBody,
        language: dto.language,
        categoryId: category?.id ?? null,
        authorId: admin.id,
        answeredById: admin.id,
        answeredAt: now,
        publishedAt: now,
        status: 'published',
        // Set here rather than left to the column default: this is the one path that
        // produces a scholar-authored entry, and the default is deliberately 'member'.
        origin: 'scholar',
        lastActivityAt: now,
      }),
    );

    return this.reload(question.id);
  }

  /**
   * Answer a member's pending submission and publish it.
   *
   * Only `pending` and `rejected` rows can be answered — answering an already-published
   * entry is `updateEntry`, which does not re-notify the asker. Conflating the two would
   * email somebody "your question has been answered" every time a typo was fixed.
   */
  async answerQuestion(admin: User, id: string, dto: AnswerQuestionDto) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status === 'published') {
      throw new HttpException(
        'This entry is already published — edit it instead.',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    await this.questions.update(id, {
      answerBody: dto.answerBody,
      answeredById: admin.id,
      answeredAt: now,
      publishedAt: question.publishedAt ?? now,
      status: 'published',
      // Categorising at answer time is often when it is first obvious what the question
      // actually is, so the admin may set it here.
      ...(dto.categoryId !== undefined
        ? { categoryId: (await this.resolveCategory(dto.categoryId))?.id ?? null }
        : {}),
      lastActivityAt: now,
    });

    this.notifyAnswered(id, admin.id);
    return this.reload(id);
  }

  /** Edit a published entry in place. Silent by design — see answerQuestion. */
  async updateEntry(id: string, dto: Partial<CreateEntryDto>) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    await this.questions.update(id, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.answerBody !== undefined ? { answerBody: dto.answerBody } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      ...(dto.categoryId !== undefined
        ? { categoryId: (await this.resolveCategory(dto.categoryId))?.id ?? null }
        : {}),
    });
    return this.reload(id);
  }

  /**
   * Decline to answer a submission.
   *
   * Distinct from `hide`: rejected means "we are not answering this", hidden means "we
   * published this and have withdrawn it". Both are invisible publicly, but a reviewer
   * working the queue has to tell those apart, and one bucket of `hidden` cannot.
   */
  async rejectQuestion(admin: User, id: string, reason: string) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status === 'published') {
      throw new HttpException('Published entries are hidden, not rejected.', HttpStatus.CONFLICT);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(DawahQuestion, id, { status: 'rejected' });
      await manager.insert(DawahModerationLog, {
        moderatorId: admin.id,
        action: 'hide' as ModerationAction,
        targetType: 'question',
        targetId: id,
        reason: reason ?? '',
      });
    });
    return { id, status: 'rejected' as const };
  }

  /** The queue of member submissions awaiting an answer — oldest first, with an age so a
   *  queue nobody is working is visible at a glance. */
  async submissionQueue() {
    const rows = await this.questions.find({
      where: { status: 'pending' },
      relations: { author: true, category: true },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return rows.map((q) => ({
      id: q.id,
      title: q.title,
      bodyHtml: renderPostMarkdown(q.body),
      language: q.language,
      category: q.category ? { id: q.category.id, nameEn: q.category.nameEn } : null,
      // The real name. Admins are trusted and need to know who asked — the asker being
      // absent from the PUBLIC projection is not the same as hiding them from review.
      author: q.author ? `${q.author.firstName} ${q.author.lastName}`.trim() : null,
      createdAt: q.createdAt,
      ageHours: Math.floor((Date.now() - q.createdAt.getTime()) / 3_600_000),
    }));
  }

  /**
   * ALL entries for an admin, in any status — including the pending, rejected and hidden
   * rows the public list never returns. Soft-deleted rows stay hidden (default scope).
   */
  async adminList(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.questions
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.category', 'category')
      .leftJoinAndSelect('q.author', 'author')
      .leftJoinAndSelect('q.answeredBy', 'answeredBy');
    if (query.status) qb.andWhere('q.status = :status', { status: query.status });
    if (query.search?.trim()) {
      // Same expression as the public search — an admin looking for an entry by a phrase
      // from its answer should find it exactly as a reader would.
      qb.andWhere(`${FTS_VECTOR} @@ websearch_to_tsquery('simple', :q)`, {
        q: query.search.trim(),
      });
    }
    const [items, total] = await qb
      .orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const tallies = await this.ratingTallies(items.map((q) => q.id));

    return {
      items: items.map((q) => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        language: q.language,
        status: q.status,
        hasAnswer: q.answerBody.length > 0,
        // Lets the queue say "9 member questions awaiting an answer" without inferring
        // it from author_id = answered_by_id.
        origin: q.origin,
        category: q.category ? { id: q.category.id, nameEn: q.category.nameEn } : null,
        author: q.author ? `${q.author.firstName} ${q.author.lastName}`.trim() : null,
        answeredBy: q.answeredBy
          ? `${q.answeredBy.firstName} ${q.answeredBy.lastName}`.trim()
          : null,
        publishedAt: q.publishedAt,
        createdAt: q.createdAt,
        // Readers' "was this helpful?" — an editorial signal, never shown publicly.
        rating: tallies.get(q.id) ?? { helpful: 0, notHelpful: 0 },
      })),
      total,
      page,
      limit,
    };
  }

  /** One entry with its raw markdown, for the admin editor. Never a public shape. */
  async adminGetById(id: string) {
    const q = await this.questions.findOne({
      where: { id },
      relations: { category: true, author: true, answeredBy: true },
      withDeleted: true,
    });
    if (!q) throw new NotFoundException('Question not found');
    return {
      id: q.id,
      slug: q.slug,
      title: q.title,
      // MARKDOWN SOURCE — this is the edit form, not a reader.
      body: q.body,
      answerBody: q.answerBody,
      language: q.language,
      status: q.status,
      categoryId: q.categoryId,
      author: q.author ? `${q.author.firstName} ${q.author.lastName}`.trim() : null,
      answeredBy: q.answeredBy ? `${q.answeredBy.firstName} ${q.answeredBy.lastName}`.trim() : null,
      answeredAt: q.answeredAt,
      publishedAt: q.publishedAt,
      createdAt: q.createdAt,
    };
  }

  /** Withdraw or restore a PUBLISHED entry. Every act is logged — no exceptions. */
  async moderateQuestion(
    moderator: User,
    id: string,
    action: 'hide' | 'restore' | 'delete',
    reason: string,
  ) {
    // withDeleted: a moderator may need to restore a soft-deleted entry, so it must be
    // findable here even though every public path excludes it.
    const question = await this.questions.findOne({ where: { id }, withDeleted: true });
    if (!question) throw new NotFoundException('Question not found');

    // Restoring only makes sense for something that was published — and the DB would refuse
    // an answerless row at 'published' anyway (CHK_dawah_questions_published_has_answer).
    // Catching it here turns a 500 into a sentence that explains itself.
    if (action === 'restore' && !question.answerBody) {
      throw new HttpException(
        'This entry has no answer yet — answer it to publish it.',
        HttpStatus.CONFLICT,
      );
    }

    const nextStatus: Record<string, DawahQuestion['status']> = {
      hide: 'hidden',
      restore: 'published',
      delete: 'deleted',
    };

    await this.dataSource.transaction(async (manager) => {
      await manager.update(DawahQuestion, id, { status: nextStatus[action] });
      if (action === 'delete') {
        // Soft delete: gone from every view, but the row survives for audit.
        await manager.softDelete(DawahQuestion, id);
      }
      if (action === 'restore') {
        await manager.restore(DawahQuestion, id);
      }
      await manager.insert(DawahModerationLog, {
        moderatorId: moderator.id,
        action: action as ModerationAction,
        targetType: 'question',
        targetId: id,
        reason: reason ?? '',
      });
    });

    return { id, status: nextStatus[action] };
  }

  /** Reload with the relations toPublic() needs. */
  private async reload(id: string) {
    const full = await this.questions.findOne({
      where: { id },
      relations: { category: true, answeredBy: { roleEntity: true } },
    });
    return this.toPublic(full!);
  }

  // ══ NOTIFICATIONS ══════════════════════════════════════════════════════════
  // Fire-and-forget, errors swallowed — exactly like the view counter. Publishing an
  // answer must succeed even if SMTP is down; the email is a courtesy, the act is the
  // product. Self-notification is skipped: nobody needs an email about their own click.

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  /** Email the person who ASKED that RMC has answered and published it. */
  private notifyAnswered(questionId: string, answeringUserId: string): void {
    void (async () => {
      const rows = await this.dataSource.query(
        `SELECT q.title, q.slug, q.language, q.author_id, u.email
           FROM dawah_questions q JOIN users u ON u.id = q.author_id WHERE q.id = $1`,
        [questionId],
      );
      const q = rows[0];
      // An admin-authored entry has the admin as its author, so this also skips emailing
      // somebody about a question they wrote themselves.
      if (!q || !q.email || q.author_id === answeringUserId) return;
      const mail = answeredEmail(this.frontendUrl, q.language, q.title, q.slug);
      await this.email.sendEmail({ to: q.email, ...mail });
    })().catch((err) => this.logger.warn(`answered notification failed: ${err.message}`));
  }
}
