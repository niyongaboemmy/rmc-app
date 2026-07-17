import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahAnswer } from './entities/dawah-answer.entity';
import { User } from '../users/entities/user.entity';
import { renderPostMarkdown } from './discussions-markdown';
import type { QueryDiscussionsDto } from './dto/query-discussions.dto';

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

    // NOTE: orderBy() takes ENTITY PROPERTY paths (lastActivityAt), never column names
    // (last_activity_at). A column name typechecks perfectly and throws
    // "Cannot read properties of undefined (reading 'databaseName')" at runtime, because
    // TypeORM is looking up a property that does not exist. Verified the hard way.
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
  async bySlug(slug: string) {
    const question = await this.questions.findOne({
      where: { slug, status: 'published' },
      relations: { category: true, author: { roleEntity: true } },
    });
    if (!question) throw new NotFoundException('Question not found');

    const answers = await this.answers.find({
      where: { questionId: question.id, status: 'published' },
      relations: { author: { roleEntity: true }, verifiedBy: { roleEntity: true } },
    });

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
}
