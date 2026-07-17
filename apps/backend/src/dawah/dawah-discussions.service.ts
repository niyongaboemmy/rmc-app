import {
  ForbiddenException, HttpException, HttpStatus,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahAnswer } from './entities/dawah-answer.entity';
import { DawahReport, type ReportTargetType } from './entities/dawah-report.entity';
import { DawahModerationLog, type ModerationAction } from './entities/dawah-moderation-log.entity';
import { DawahVote } from './entities/dawah-vote.entity';
import { DawahCategory } from './entities/dawah-category.entity';
import { User } from '../users/entities/user.entity';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../integrations/email/email.service';
import { newAnswerEmail, verifiedEmail } from './discussions-notifications';
import { renderPostMarkdown } from './discussions-markdown';
import { slugify } from './dawah-slug.util';
import { DISCUSSION_LIMITS } from './discussions.constants';
import type { QueryDiscussionsDto } from './dto/query-discussions.dto';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { CreateReportDto } from './dto/create-report.dto';
import type { CreateAnswerDto } from './dto/create-answer.dto';

/** The public shape of a post's author. `null` on the wire means anonymous. */
export interface PublicAuthor {
  name: string;
  isScholar: boolean;
}

/**
 * Community Discussions — the read path.
 *
 * ── toPublic() is the single most important thing in this file ───────────────────────
 *
 * It is the ONLY way a row reaches a response, exactly as DawahBookService.toPublic is
 * for books. There, the secret was `file_key`. Here it is the author's identity, and the
 * stakes are higher: `file_key` leaking is a misconfiguration away from harm, whereas an
 * `author_id` leaking on an anonymous question about a marriage difficulty IS the harm,
 * immediately and irreversibly.
 *
 * So: no route ever returns an entity. Every route funnels through toPublic(). If a
 * future field needs to reach the client, it is added here, deliberately, once.
 *
 * ── Phase A is read-only ────────────────────────────────────────────────────────────
 *
 * No create/update. Posting arrives in Phase B WITH its report queue, never before —
 * questions go live on submit, so the phase that allows a question must also contain the
 * means to remove one.
 */
@Injectable()
export class DawahDiscussionsService {
  private readonly logger = new Logger(DawahDiscussionsService.name);

  constructor(
    @InjectRepository(DawahQuestion) private readonly questions: Repository<DawahQuestion>,
    @InjectRepository(DawahAnswer) private readonly answers: Repository<DawahAnswer>,
    @InjectRepository(DawahReport) private readonly reports: Repository<DawahReport>,
    @InjectRepository(DawahVote) private readonly votes: Repository<DawahVote>,
    @InjectRepository(DawahCategory) private readonly categories: Repository<DawahCategory>,
    private readonly dataSource: DataSource,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolve an author for public display, or null when the post is anonymous.
   *
   * The null is what anonymity IS on the wire. There is no `isAnonymous` flag in the
   * projection: a separate flag invites someone to send `author` anyway "just for
   * admins", and then one careless client renders it.
   */
  private publicAuthor(user: User | null | undefined, isAnonymous: boolean): PublicAuthor | null {
    if (isAnonymous || !user) return null;
    return {
      name: `${user.firstName} ${user.lastName}`.trim(),
      // Drives the scholar badge beside an answer. Reads `roleEntity` — the RBAC relation
      // that actually carries permissions — NOT `user.role`, which is a legacy varchar
      // ('superadmin' | 'user' | …) that knows nothing about the Scholar role. Reading a
      // live relation rather than a denormalised flag also means the badge disappears the
      // moment RMC un-appoints someone.
      isScholar: user.roleEntity?.slug === 'scholar',
    };
  }

  /**
   * The public projection of a question. Everything the client is allowed to know.
   *
   * ABSENT ON PURPOSE — each of these is a decision, not an oversight:
   *   · authorId     — anonymity would be one JSON.stringify from being undone
   *   · isAnonymous  — redundant (author === null says it) and an invitation to leak
   *   · body         — the markdown source; the client renders nothing, it gets bodyHtml
   *   · reportCount  — tells an abuser how many more reports they need
   */
  toPublic(question: DawahQuestion) {
    return {
      id: question.id,
      slug: question.slug,
      title: question.title,
      // Rendered and sanitised HERE, on read — not stored as HTML. A DOMPurify fix next
      // year protects every post already written; input-time sanitising would not.
      bodyHtml: renderPostMarkdown(question.body),
      language: question.language,
      category: question.category ?? null,
      author: this.publicAuthor(question.author, question.isAnonymous),
      status: question.status,
      answerCount: question.answerCount,
      viewCount: question.viewCount,
      verifiedAnswerId: question.verifiedAnswerId,
      lastActivityAt: question.lastActivityAt,
      createdAt: question.createdAt,
    };
  }

  /**
   * The public projection of an answer.
   *
   * `verifiedBy` is a PERSON, not a boolean — "Verified by RMC" with nobody behind it is
   * an institution hiding behind itself. `releasedById` is deliberately absent: released
   * means "not harmful", which is not a public claim, unlike verification.
   */
  toPublicAnswer(answer: DawahAnswer) {
    return {
      id: answer.id,
      questionId: answer.questionId,
      bodyHtml: renderPostMarkdown(answer.body),
      // An answer inherits its thread's language for `dir` purposes; the column lives on
      // the question, which is the unit a reader picks by language.
      language: answer.question?.language ?? 'en',
      author: this.publicAuthor(answer.author, answer.isAnonymous),
      status: answer.status,
      isVerified: answer.isVerified,
      verifiedBy: answer.verifiedBy ? this.publicAuthor(answer.verifiedBy, false) : null,
      verifiedAt: answer.verifiedAt,
      voteScore: answer.voteScore,
      createdAt: answer.createdAt,
    };
  }

  /** The listing. Published only — enforced here, so no route can forget to. */
  async list(query: QueryDiscussionsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 12));

    const qb = this.questions
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.category', 'category')
      .leftJoinAndSelect('q.author', 'author')
      .leftJoinAndSelect('author.roleEntity', 'authorRole')
      .where('q.status = :status', { status: 'published' });

    if (query.category) {
      qb.andWhere('category.slug = :category', { category: query.category });
    }
    if (query.language) {
      qb.andWhere('q.language = :language', { language: query.language });
    }

    // Full-text search. The tsvector expression MUST match the GIN index in migration 056
    // byte-for-byte ('simple', coalesce(title)||' '||coalesce(body)) or Postgres builds
    // the vector per-row instead of using the index. websearch_to_tsquery accepts what a
    // human types ("wudu travelling", quoted phrases, -exclusions) without throwing on
    // punctuation the way to_tsquery does.
    const searchTerm = query.search?.trim();
    if (searchTerm) {
      qb.andWhere(
        `to_tsvector('simple', coalesce(q.title, '') || ' ' || coalesce(q.body, ''))
           @@ websearch_to_tsquery('simple', :q)`,
        { q: searchTerm },
      );
    }

    // NOTE: orderBy() takes ENTITY PROPERTY paths (lastActivityAt), never column names
    // (last_activity_at). A column name typechecks perfectly and throws
    // "Cannot read properties of undefined (reading 'databaseName')" at runtime, because
    // TypeORM is looking up a property that does not exist. Verified the hard way.
    if (searchTerm) {
      // Relevance first when there is a query — a keyword match sorted by "most recently
      // active" buries the best hit under chatter. addSelect so the rank is orderable.
      qb.addSelect(
        `ts_rank(to_tsvector('simple', coalesce(q.title, '') || ' ' || coalesce(q.body, '')),
                 websearch_to_tsquery('simple', :q))`,
        'rank',
      ).orderBy('rank', 'DESC').addOrderBy('q.lastActivityAt', 'DESC');
    } else
    switch (query.sort) {
      case 'new':
        qb.orderBy('q.createdAt', 'DESC');
        break;
      case 'unanswered':
        // Ascending answer count puts the unanswered first — a SORT, not a filter.
        // Hiding answered questions would make the section look emptier the better it
        // works, which is a strange thing to want.
        qb.orderBy('q.answerCount', 'ASC').addOrderBy('q.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('q.lastActivityAt', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: items.map((q) => this.toPublic(q)), total, page, limit };
  }

  /**
   * One thread. 404 — never 403 — for anything not published.
   *
   * A 403 confirms the row exists, which turns the status code itself into a moderation
   * notice: "your question was removed" is a message RMC should choose to send, not one
   * the HTTP layer leaks.
   */
  async bySlug(slug: string, viewerId?: string) {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      relations: { category: true, author: { roleEntity: true } },
    });
    if (!question) throw new NotFoundException('Question not found');

    // Published answers for everyone; PLUS the viewer's own pending answer, so an author
    // whose answer is awaiting scholar review sees it (marked pending) rather than
    // watching it vanish with no explanation. Nobody else sees a pending answer.
    const published = await this.answers.find({
      where: { questionId: question.id, status: 'published' },
      relations: { author: { roleEntity: true }, verifiedBy: { roleEntity: true } },
    });
    const ownPending = viewerId
      ? await this.answers.find({
          where: { questionId: question.id, status: 'pending_review', authorId: viewerId },
          relations: { author: { roleEntity: true } },
        })
      : [];
    const answers = [...published, ...ownPending];

    // Verified first, then by score, then oldest — the verified answer is the point of
    // the page and must never be below a popular wrong one.
    answers.sort((a, b) => {
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      if (a.voteScore !== b.voteScore) return b.voteScore - a.voteScore;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    this.bumpViewCount(question.id);

    return {
      question: this.toPublic(question),
      answers: answers.map((a) => this.toPublicAnswer({ ...a, question })),
    };
  }

  /**
   * Bump a view counter without letting it break the read.
   *
   * Deliberately not awaited and deliberately swallowing its own errors — the same
   * discipline as DawahBookService.bumpCounter. A reader who opens a thread must never
   * see it fail because a stats UPDATE hit a lock. The thread is the product; the number
   * is a nice-to-have.
   */
  private bumpViewCount(id: string): void {
    void this.questions
      .increment({ id }, 'viewCount', 1)
      .catch((err) => this.logger.warn(`Failed to bump view_count for question ${id}: ${err.message}`));
  }

  /**
   * Render a draft to sanitised HTML for the compose preview.
   *
   * Exists so the preview goes through the EXACT pipeline the published post will — render
   * markdown client-side "just for preview" and the two drift, and the day they drift is
   * the day someone finds the gap between what they saw and what shipped.
   */
  previewMarkdown(body: string): { html: string } {
    return { html: renderPostMarkdown(body) };
  }

  // ══ WRITES (Phase B) ═══════════════════════════════════════════════════════
  // Every write below ships in the same phase as the moderation that governs it.
  // A question goes live on submit, so BE-3's report/auto-hide/queue land here too.

  /**
   * Ask a question.
   *
   * Status is NOT computed and NOT accepted — a question is always born `published`
   * (§0.1). The rate limits are keyed on the USER, not the IP: posting requires auth, and
   * IP keying punishes shared connections, which in Kigali is many people on one address.
   */
  async createQuestion(user: User, dto: CreateQuestionDto) {
    await this.assertMayPost(user);

    // Identical-to-last-post guard: catches the double-submit and the copy-paste spammer.
    const last = await this.questions.findOne({
      where: { authorId: user.id },
      order: { createdAt: 'DESC' },
      withDeleted: true,
    });
    if (last && last.title.trim() === dto.title.trim() && last.body.trim() === dto.body.trim()) {
      throw new HttpException('You already posted this.', HttpStatus.CONFLICT);
    }

    let category: DawahCategory | null = null;
    if (dto.categoryId) {
      category = await this.categories.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Category not found');
    }

    // Slug: title → base, plus a short random suffix for uniqueness. A non-Latin title
    // (Arabic, or Kinyarwanda after diacritics strip) can slugify to empty — fall back to
    // a stable base so the URL is never just the suffix.
    const base = slugify(dto.title) || 'question';
    const question = await this.insertWithUniqueSlug(base, (slug) =>
      this.questions.create({
        slug,
        title: dto.title.trim(),
        body: dto.body,
        language: dto.language,
        categoryId: category?.id ?? null,
        authorId: user.id,
        isAnonymous: dto.isAnonymous ?? false,
        status: 'published',
        lastActivityAt: new Date(),
      }),
    );

    // Reload with relations so toPublic() can resolve the (possibly hidden) author.
    const full = await this.questions.findOne({
      where: { id: question.id },
      relations: { category: true, author: { roleEntity: true } },
    });
    return this.toPublic(full!);
  }

  /**
   * The rate-limit gate. Throws 429 (or 403 for a brand-new account).
   *
   * Not @nestjs/throttler: that guard keys on IP and is not even registered globally here.
   * A DB count keyed on author_id is what the plan actually asks for, and it survives a
   * restart, which an in-memory limiter does not.
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

  /** Insert, retrying with a fresh suffix if the slug collides. The DB's unique index is
   *  the arbiter — a pre-check SELECT races. */
  private async insertWithUniqueSlug(
    base: string,
    build: (slug: string) => DawahQuestion,
  ): Promise<DawahQuestion> {
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

  /**
   * Report a question or answer — and auto-hide it if enough eligible reports pile up.
   *
   * The whole thing is ONE transaction: the report insert, the report_count increment, the
   * possible status flip and the moderation-log row must be atomic, or two concurrent
   * reports both read `2`, neither trips the hide, and the post stays up.
   */
  async report(user: User, dto: CreateReportDto) {
    const table = dto.targetType === 'question' ? 'dawah_questions' : 'dawah_answers';

    await this.assertReportRate(user.id);

    await this.dataSource.transaction(async (manager) => {
      // Target must exist and be visible — you cannot report what you cannot see.
      const target = await manager.query(
        `SELECT id, status, report_count FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
        [dto.targetId],
      );
      if (!target.length) throw new NotFoundException('Not found');

      // One report per person per item — the DB enforces it; we translate the violation
      // into a clean 409 instead of a 500.
      try {
        await manager.insert(DawahReport, {
          targetType: dto.targetType as ReportTargetType,
          targetId: dto.targetId,
          reporterId: user.id,
          reason: dto.reason,
          note: dto.note ?? '',
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === '23505') {
          throw new HttpException('You already reported this.', HttpStatus.CONFLICT);
        }
        throw err;
      }

      await manager.query(`UPDATE ${table} SET report_count = report_count + 1 WHERE id = $1`, [
        dto.targetId,
      ]);

      // Does this report TRIP the hide? Only reports from accounts older than the minimum
      // count — three throwaways must not be able to silence anything.
      const eligible = await manager.query(
        `SELECT count(*)::int AS n
           FROM dawah_reports r JOIN users u ON u.id = r.reporter_id
          WHERE r.target_type = $1 AND r.target_id = $2
            AND u.created_at < now() - ($3 || ' days')::interval`,
        [dto.targetType, dto.targetId, DISCUSSION_LIMITS.REPORT_MIN_ACCOUNT_AGE_DAYS],
      );
      const eligibleCount: number = eligible[0].n;

      const current = target[0];
      const verifiedExempt =
        dto.targetType === 'question' &&
        (await manager.query(`SELECT verified_answer_id FROM dawah_questions WHERE id = $1`, [
          dto.targetId,
        ]))[0]?.verified_answer_id != null;

      if (
        current.status === 'published' &&
        eligibleCount >= DISCUSSION_LIMITS.REPORT_AUTOHIDE_THRESHOLD &&
        !verifiedExempt
      ) {
        await manager.query(`UPDATE ${table} SET status = 'auto_hidden' WHERE id = $1`, [
          dto.targetId,
        ]);
        // moderator_id NULL = the crowd, not a person, made this call.
        await manager.insert(DawahModerationLog, {
          moderatorId: null,
          action: 'auto_hide' as ModerationAction,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: `Auto-hidden at ${eligibleCount} eligible reports.`,
        });
      }
    });

    return { reported: true };
  }

  private async assertReportRate(userId: string): Promise<void> {
    const anHourAgo = new Date(Date.now() - 3_600_000);
    const recent = await this.reports.count({
      where: { reporterId: userId, createdAt: MoreThan(anHourAgo) },
    });
    if (recent >= DISCUSSION_LIMITS.MAX_REPORTS_PER_HOUR) {
      throw new HttpException('Too many reports — slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ── Moderator actions (gated on DISCUSSIONS_MODERATE at the controller) ──────

  /** Categories with their answer_policy, for the moderator policy editor. */
  async listCategoryPolicies() {
    const cats = await this.categories.find({ order: { sortOrder: 'ASC' } });
    return cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.nameEn,
      answerPolicy: c.answerPolicy,
    }));
  }

  /**
   * Set a category's answer_policy.
   *
   * NOT retroactive by design: flipping a category to scholar_review does not un-publish
   * answers already live in it. If RMC ever needs that, it is a deliberate bulk action
   * with its own moderation-log trail — never a silent side effect of a dropdown. The
   * flip itself is a category setting, not a post-moderation act, so it does not write
   * dawah_moderation_log (whose target_type is question|answer only).
   */
  async setAnswerPolicy(categoryId: string, policy: 'scholar_review' | 'open') {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.categories.update(categoryId, { answerPolicy: policy });
    return { id: categoryId, answerPolicy: policy };
  }

  /** The report queue: open reports, auto_hidden targets first, oldest next. */
  async reportQueue() {
    const rows = await this.reports.find({
      where: { status: 'open' },
      relations: { reporter: true },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      note: r.note,
      reporter: r.reporter ? `${r.reporter.firstName} ${r.reporter.lastName}`.trim() : null,
      createdAt: r.createdAt,
    }));
  }

  /** Hide, restore or lock a question. Every act is logged — no exceptions. */
  async moderateQuestion(
    moderator: User,
    id: string,
    action: 'hide' | 'restore' | 'lock' | 'unlock',
    reason: string,
  ) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    const nextStatus: Record<string, DawahQuestion['status']> = {
      hide: 'hidden',
      restore: 'published',
      lock: 'locked',
      unlock: 'published',
    };

    await this.dataSource.transaction(async (manager) => {
      await manager.update(DawahQuestion, id, { status: nextStatus[action] });
      // Restoring resets the report meter and dismisses the reports, so the same three
      // reporters cannot immediately re-trip the auto-hide.
      if (action === 'restore') {
        await manager.update(DawahQuestion, id, { reportCount: 0 });
        await manager.update(
          DawahReport,
          { targetType: 'question', targetId: id, status: 'open' },
          { status: 'dismissed', handledById: moderator.id, handledAt: new Date() },
        );
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

  // ══ ANSWERING + THE SCHOLAR GATE (Phase C) ═════════════════════════════════

  /**
   * THE scholar gate, and the fix for the wildcard finding (plan §3.2).
   *
   * `@Permissions(DISCUSSIONS_VERIFY)` on the route is NOT enough: a superadmin resolves to
   * `['*']`, which the guard treats as holding every permission — so it would wave a
   * superadmin through despite the Scholar role being the only one granted verify. Being
   * able to run the platform is not being qualified to rule on religious practice.
   *
   * So verification checks the acting user's ACTUAL role, loaded fresh, and demands it be
   * `scholar`. A superadmin who is not a scholar is refused here even though the decorator
   * passed them. If RMC wants someone to verify, they assign the Scholar role — the one
   * place that authority is meant to live.
   */
  private async assertScholar(userId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT r.slug FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [userId],
    );
    if (rows[0]?.slug !== 'scholar') {
      throw new ForbiddenException(
        'Only an RMC scholar may verify or release an answer. Running the platform is not the same authority.',
      );
    }
  }

  /**
   * Answer a question. Status is COMPUTED from the category's answer_policy — never from
   * the client. A ruling-carrying category (`scholar_review`, and the cautious default for
   * an uncategorised question) holds the answer at `pending_review`; an open category
   * publishes it.
   */
  async createAnswer(user: User, slug: string, dto: CreateAnswerDto) {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      relations: { category: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status === 'locked') throw new ForbiddenException('This question is locked.');

    await this.assertMayAnswer(user);

    // No category ⇒ treat as scholar_review. The safe default must be the lazy one.
    const policy = question.category?.answerPolicy ?? 'scholar_review';
    const status: 'pending_review' | 'published' = policy === 'open' ? 'published' : 'pending_review';

    const answer = await this.answers.save(
      this.answers.create({
        questionId: question.id,
        body: dto.body,
        authorId: user.id,
        isAnonymous: dto.isAnonymous ?? false,
        status,
      }),
    );

    // A pending answer is invisible, so it must NOT bump answer_count or last_activity —
    // "3 answers" with none showing is a bug, and a pending answer floating a question to
    // the top of "active" would leak its existence.
    if (status === 'published') {
      await this.recountAndTouch(question.id);
      this.notifyNewAnswer(question.id, user.id); // now visible → tell the asker
    }

    const full = await this.answers.findOne({
      where: { id: answer.id },
      relations: { author: { roleEntity: true }, question: true },
    });
    return this.toPublicAnswer(full!);
  }

  private async assertMayAnswer(user: User): Promise<void> {
    const ageHours = (Date.now() - new Date(user.createdAt).getTime()) / 3_600_000;
    if (ageHours < DISCUSSION_LIMITS.NEW_ACCOUNT_POST_DELAY_HOURS) {
      throw new ForbiddenException('New accounts can post after 24 hours.');
    }
    const anHourAgo = new Date(Date.now() - 3_600_000);
    const recent = await this.answers.count({
      where: { authorId: user.id, createdAt: MoreThan(anHourAgo) },
      withDeleted: true,
    });
    if (recent >= DISCUSSION_LIMITS.MAX_ANSWERS_PER_HOUR) {
      throw new HttpException("You're answering too quickly — slow down.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Recompute answer_count from PUBLISHED answers and move last_activity_at to now. One
   *  query, always correct — a maintained delta drifts, and a drifting count is a bug
   *  report every time. */
  private async recountAndTouch(questionId: string, manager = this.dataSource.manager): Promise<void> {
    await manager.query(
      `UPDATE dawah_questions
          SET answer_count = (SELECT count(*) FROM dawah_answers
                               WHERE question_id = $1 AND status = 'published' AND deleted_at IS NULL),
              last_activity_at = now()
        WHERE id = $1`,
      [questionId],
    );
  }

  /** Edit your own answer, within the edit window. After that it is frozen — a published
   *  answer others may have acted on must not shift under them. */
  async editAnswer(user: User, id: string, body: string) {
    const answer = await this.answers.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.authorId !== user.id) throw new ForbiddenException('Not your answer.');
    const ageMin = (Date.now() - new Date(answer.createdAt).getTime()) / 60_000;
    if (ageMin > DISCUSSION_LIMITS.ANSWER_EDIT_WINDOW_MIN) {
      throw new ForbiddenException('The edit window has closed.');
    }
    await this.answers.update(id, { body });
    const full = await this.answers.findOne({ where: { id }, relations: { author: { roleEntity: true }, question: true } });
    return this.toPublicAnswer(full!);
  }

  /**
   * RELEASE an answer from review — "not harmful", publish it, NO badge. Distinct from
   * verify on purpose (§2.2): a scholar clearing a queue is saying "this may be seen", not
   * "RMC endorses this". One button for both would attach RMC's endorsement to every
   * answer a scholar merely triaged.
   */
  async releaseAnswer(scholar: User, id: string) {
    await this.assertScholar(scholar.id);
    const answer = await this.answers.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(DawahAnswer, id, { status: 'published', releasedById: scholar.id });
      await this.recountAndTouch(answer.questionId, manager);
    });
    return { id, status: 'published', verified: false };
  }

  /**
   * VERIFY an answer — "RMC says this is correct." Publishes it, pins it, badges it, names
   * the scholar. At most one per question (UQ_dawah_answers_one_verified); a concurrent
   * second verify hits the index and becomes a clean 409, not a 500.
   */
  async verifyAnswer(scholar: User, id: string) {
    await this.assertScholar(scholar.id);
    const answer = await this.answers.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(DawahAnswer, id, {
          status: 'published',
          isVerified: true,
          verifiedById: scholar.id,
          verifiedAt: new Date(),
        });
        await manager.update(DawahQuestion, answer.questionId, { verifiedAnswerId: id });
        await this.recountAndTouch(answer.questionId, manager);
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        throw new HttpException('Another answer is already verified for this question.', HttpStatus.CONFLICT);
      }
      throw err;
    }
    this.notifyVerified(id);
    return { id, status: 'published', verified: true };
  }

  /** Un-verify. Stays published (releasing the endorsement is not un-publishing). */
  async unverifyAnswer(scholar: User, id: string) {
    await this.assertScholar(scholar.id);
    const answer = await this.answers.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');
    await this.dataSource.transaction(async (manager) => {
      await manager.update(DawahAnswer, id, { isVerified: false, verifiedById: null, verifiedAt: null });
      await manager.update(DawahQuestion, answer.questionId, { verifiedAnswerId: null });
    });
    return { id, verified: false };
  }

  /** The scholar review queue — answers held pending, OLDEST first, with an age so the
   *  dashboard alarm can flag a queue nobody is working. */
  async pendingQueue() {
    const rows = await this.answers.find({
      where: { status: 'pending_review' },
      relations: { author: true, question: true },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return rows.map((a) => ({
      id: a.id,
      bodyHtml: renderPostMarkdown(a.body),
      author: a.isAnonymous ? null : (a.author ? `${a.author.firstName} ${a.author.lastName}`.trim() : null),
      createdAt: a.createdAt,
      ageHours: Math.floor((Date.now() - a.createdAt.getTime()) / 3_600_000),
      question: a.question ? { slug: a.question.slug, title: a.question.title, language: a.question.language } : null,
    }));
  }

  /** Vote on an answer. The unique constraint is the rule; a re-vote updates, value 0
   *  clears. vote_score is recomputed from the rows, never a maintained delta. */
  async vote(user: User, answerId: string, value: number) {
    const answer = await this.answers.findOne({ where: { id: answerId, status: 'published' } });
    if (!answer) throw new NotFoundException('Answer not found');

    await this.assertVoteRate(user.id);

    await this.dataSource.transaction(async (manager) => {
      if (value === 0) {
        await manager.delete(DawahVote, { answerId, userId: user.id });
      } else {
        await manager.query(
          `INSERT INTO dawah_votes (answer_id, user_id, value) VALUES ($1, $2, $3)
             ON CONFLICT (answer_id, user_id) DO UPDATE SET value = $3, updated_at = now()`,
          [answerId, user.id, value],
        );
      }
      await manager.query(
        `UPDATE dawah_answers SET vote_score =
           (SELECT COALESCE(SUM(value), 0) FROM dawah_votes WHERE answer_id = $1) WHERE id = $1`,
        [answerId],
      );
    });
    const fresh = await this.answers.findOne({ where: { id: answerId } });
    return { id: answerId, voteScore: fresh!.voteScore };
  }

  private async assertVoteRate(userId: string): Promise<void> {
    const anHourAgo = new Date(Date.now() - 3_600_000);
    const recent = await this.votes.count({ where: { userId, updatedAt: MoreThan(anHourAgo) } });
    if (recent >= DISCUSSION_LIMITS.MAX_VOTES_PER_HOUR) {
      throw new HttpException('Too many votes — slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ══ NOTIFICATIONS (Phase D) ════════════════════════════════════════════════
  // Fire-and-forget, errors swallowed — exactly like the view counter. An answer must
  // succeed even if SMTP is down; the email is a courtesy, the action is the product.
  // Self-notification is skipped: nobody needs an email about their own click.

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  /** Email the QUESTION author that their question got a now-visible answer. */
  private notifyNewAnswer(questionId: string, answeringUserId: string): void {
    void (async () => {
      const rows = await this.dataSource.query(
        `SELECT q.title, q.slug, q.language, q.author_id, u.email
           FROM dawah_questions q JOIN users u ON u.id = q.author_id WHERE q.id = $1`,
        [questionId],
      );
      const q = rows[0];
      if (!q || !q.email || q.author_id === answeringUserId) return; // no self-notify
      const mail = newAnswerEmail(this.frontendUrl, q.language, q.title, q.slug);
      await this.email.sendEmail({ to: q.email, ...mail });
    })().catch((err) => this.logger.warn(`newAnswer notification failed: ${err.message}`));
  }

  /** Email the ANSWER author that a scholar verified their answer. */
  private notifyVerified(answerId: string): void {
    void (async () => {
      const rows = await this.dataSource.query(
        `SELECT q.title, q.slug, q.language, u.email
           FROM dawah_answers a JOIN dawah_questions q ON q.id = a.question_id
           JOIN users u ON u.id = a.author_id WHERE a.id = $1`,
        [answerId],
      );
      const a = rows[0];
      if (!a || !a.email) return;
      const mail = verifiedEmail(this.frontendUrl, a.language, a.title, a.slug);
      await this.email.sendEmail({ to: a.email, ...mail });
    })().catch((err) => this.logger.warn(`verified notification failed: ${err.message}`));
  }
}
