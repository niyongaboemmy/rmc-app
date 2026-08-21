import { Body, Controller, Delete, Get, HttpCode, Ip, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DawahCategoryService } from './dawah-category.service';
import { DawahCourseService } from './dawah-course.service';
import { DawahEnrollmentService } from './dawah-enrollment.service';
import { DawahBookService, type BookFile } from './dawah-book.service';
import { DawahDiscussionsService } from './dawah-discussions.service';
import { OptionalCallerService } from './optional-caller.service';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { QueryBooksDto } from './dto/query-books.dto';
import { QueryDiscussionsDto } from './dto/query-discussions.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { RateQuestionDto } from './dto/rate-question.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

/**
 * The public catalogue. Guards are global APP_GUARDs, so every route is
 * authenticated unless it opts out — @Public() on each handler is what makes
 * these reachable by an anonymous visitor. No @UseGuards() anywhere.
 *
 * Every listing here is published-only; the services enforce that, not the
 * controller, so there is no route that can forget to.
 */
@ApiTags('Dawah — Public')
@Controller('dawah')
export class DawahController {
  constructor(
    private readonly categories: DawahCategoryService,
    private readonly courses: DawahCourseService,
    private readonly enrollment: DawahEnrollmentService,
    private readonly books: DawahBookService,
    private readonly discussions: DawahDiscussionsService,
    private readonly caller: OptionalCallerService,
  ) {}

  // ── Dawah Q&A ─────────────────────────────────────────────────────────────
  // RMC writes the answers, so there is nothing here for a member to answer, vote
  // on or report. A member may submit a question; it is invisible until an admin
  // answers it through the admin controller.

  @Public()
  @Get('discussions')
  @ApiOperation({ summary: 'List published Q&A entries.' })
  listDiscussions(@Query() query: QueryDiscussionsDto) {
    return this.discussions.list(query);
  }

  /**
   * One entry. 404s anything not published — never 403, which would confirm the
   * row exists and turn the status code itself into a notice that RMC declined to
   * answer somebody.
   */
  @Public()
  @Get('discussions/:slug')
  @ApiOperation({ summary: "One question with RMC's answer." })
  discussionBySlug(@Param('slug') slug: string) {
    return this.discussions.bySlug(slug);
  }

  /**
   * Up to three other entries to read next. @Public, like the entry itself.
   *
   * Safe to declare after `discussions/:slug` because the paths differ in SEGMENT COUNT —
   * `:slug` matches one segment and will not swallow `<slug>/related`. Only a same-shape
   * route (`discussions/:something`) would need to come first.
   */
  @Public()
  @Get('discussions/:slug/related')
  @ApiOperation({ summary: 'Up to three related published entries.' })
  relatedDiscussions(@Param('slug') slug: string) {
    return this.discussions.related(slug);
  }

  /**
   * "Was this answer helpful?" — yes or no, from an anonymous reader.
   *
   * @Public on purpose. Most readers of a published ruling have no account, so requiring
   * one would measure the membership instead of the readership. One rating per browser is
   * enforced by a unique constraint on a hashed client token (see the entity).
   *
   * Throttled per IP because the token is client-supplied and therefore forgeable: the
   * constraint stops honest double-clicks, and this stops a script minting a fresh token
   * per request. 20/10min is far above a reader browsing several entries and far below
   * anything that could move a tally.
   *
   * 200, not 201 — a re-rate updates a row rather than creating one, and the response is
   * an acknowledgement with no resource to point at.
   */
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @Post('discussions/:slug/rating')
  @ApiOperation({ summary: 'Rate a published answer as helpful or not (anonymous).' })
  rateDiscussion(@Param('slug') slug: string, @Body() dto: RateQuestionDto, @Ip() ip: string) {
    return this.discussions.rate(slug, dto, ip);
  }

  /**
   * Submit a question for RMC to answer. NOT @Public — the global JwtAuthGuard requires a
   * signed-in member. Rate-limited per user in the service (5/hour, 24h new-account delay,
   * duplicate guard). The response says only that it was received: nothing is public until
   * an admin answers it.
   */
  @Post('discussions')
  @ApiOperation({ summary: 'Submit a question for RMC to answer (members only).' })
  ask(@CurrentUser() user: User, @Body() dto: CreateQuestionDto) {
    return this.discussions.submitQuestion(user, dto);
  }

  /** Live compose preview — same render+sanitise pipeline as the published entry. */
  @Post('discussions/preview')
  @ApiOperation({ summary: 'Render markdown to sanitised HTML (compose preview).' })
  preview(@Body() body: { body?: string }) {
    return this.discussions.previewMarkdown(body?.body ?? '');
  }

  /**
   * Ship a PDF to the browser. `inline` renders it in the <iframe> the Library
   * viewer uses; `attachment` makes it a download. `private, no-store` keeps a
   * members-only book out of shared caches — a CDN or corporate proxy that
   * cached one would serve it to readers who never authenticated, quietly
   * undoing the policy this whole route exists to enforce.
   */
  private sendPdf(res: Response, file: BookFile, disposition: 'inline' | 'attachment'): void {
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(file.buffer);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Active Dawah categories, in display order (courses + library share one taxonomy)' })
  listCategories() {
    return this.categories.listPublic();
  }

  // ── Courses ───────────────────────────────────────────────────────────────

  @Get('courses')
  @Public()
  @ApiOperation({
    summary: 'Paginated published courses — filter by ?category (slug or id), level, language, search',
  })
  listCourses(@Query() query: QueryCoursesDto) {
    return this.courses.listPublic(query);
  }

  /**
   * Declared BEFORE `courses/:slug`. Nest matches in declaration order, so the
   * other way round "featured" is captured as a slug and the caller gets
   * "Course not found" instead of the landing-page outline. This repo has
   * shipped that bug twice — see hajj-admin.controller.ts:60 and :143.
   */
  @Get('courses/featured')
  @Public()
  @ApiOperation({ summary: 'Featured courses for the landing-page outline (max 6)' })
  listFeaturedCourses() {
    return this.courses.listFeatured();
  }

  @Get('courses/:slug')
  @Public()
  @ApiOperation({
    summary:
      'One published course with its lesson outline, in order (includes enrollment_count)',
  })
  findCourse(@Param('slug') slug: string) {
    return this.courses.findBySlugPublic(slug);
  }

  /**
   * The signed-in member's own progress in a course — enrolment state, completed
   * lesson ids and percent. NOT @Public: progress is per-member and must never be
   * SSR-cached, so the detail page fetches it client-side once the member is known.
   */
  @Get('courses/:slug/progress')
  @ApiOperation({ summary: "The current member's progress in a course (members only)" })
  async myCourseProgress(@CurrentUser() user: User, @Param('slug') slug: string) {
    const course = await this.courses.findBySlugPublic(slug);
    return this.enrollment.getProgress(user.id, course.id);
  }

  /**
   * Mark a lesson complete. Auto-enrols the member on their first completion and
   * returns the fresh progress. Idempotent. Members only.
   */
  @Post('courses/:slug/lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson complete; auto-enrols the member (members only)' })
  completeLesson(@CurrentUser() user: User, @Param('lessonId') lessonId: string) {
    return this.enrollment.markComplete(user.id, lessonId);
  }

  /**
   * Un-mark a lesson. The enrolment (and the course's learner count) stay —
   * only progress drops. Members only.
   */
  @Delete('courses/:slug/lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Un-mark a lesson complete (members only)' })
  uncompleteLesson(@CurrentUser() user: User, @Param('lessonId') lessonId: string) {
    return this.enrollment.unmarkComplete(user.id, lessonId);
  }

  // ── Library ───────────────────────────────────────────────────────────────

  @Get('books')
  @Public()
  @ApiOperation({
    summary: 'Paginated published books — filter by ?category (slug or id), language, search',
  })
  listBooks(@Query() query: QueryBooksDto) {
    return this.books.listPublic(query);
  }

  /** Declared BEFORE `books/:slug`, for the same reason as courses/featured. */
  @Get('books/featured')
  @Public()
  @ApiOperation({ summary: 'Featured books for the landing page (max 6)' })
  listFeaturedBooks() {
    return this.books.listFeatured();
  }

  /**
   * Metadata only. The response is narrowed by DawahBookService.toPublic(),
   * which strips fileKey — it is a key into the file server's PROTECTED
   * dawah-library/ prefix, and publishing it would hand an attacker the exact
   * path to request. The reading routes (preview / download) resolve the key
   * server-side from the slug.
   */
  @Get('books/:slug')
  @Public()
  @ApiOperation({ summary: 'One published book — metadata only, never the storage keys' })
  findBook(@Param('slug') slug: string) {
    return this.books.findBySlugPublic(slug);
  }

  /**
   * Read a book in the browser. The PDF lives under the file-server's PROTECTED
   * `dawah-library/` prefix, so it cannot be fetched directly — the bytes only
   * arrive through here, which is also where the view counter lives. Every book
   * is public, so there is no identity to resolve: @Public() and open to all.
   */
  @Get('books/:slug/preview')
  @Public()
  @ApiOperation({ summary: 'Read a book inline (full PDF)' })
  async previewBook(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.books.getPreviewFile(slug);
    this.sendPdf(res, file, 'inline');
  }

  /** The FULL file — 403 only when allow_download is off. */
  @Get('books/:slug/download')
  @Public()
  @ApiOperation({ summary: 'Download the full book PDF (403 if downloads are disabled)' })
  async downloadBook(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.books.getDownloadFile(slug);
    this.sendPdf(res, file, 'attachment');
  }
}
