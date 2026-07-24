import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { CreateReportDto } from './dto/create-report.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { VoteDto } from './dto/vote.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';

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

  // ── Community Discussions (Phase A: read-only) ────────────────────────────
  // Posting arrives in Phase B WITH its report queue, never before: a question
  // goes live on submit, so the phase that allows one must also be able to
  // remove one. See docs/dawah-discussions-implementation-plan.md §9.

  @Public()
  @Get('discussions')
  @ApiOperation({ summary: 'List published community questions.' })
  listDiscussions(@Query() query: QueryDiscussionsDto) {
    return this.discussions.list(query);
  }

  /**
   * One thread. 404s anything not published — never 403, which would confirm the
   * row exists and turn the status code itself into a moderation notice.
   */
  @Public()
  @Get('discussions/:slug')
  @ApiOperation({ summary: 'One question with its published answers, verified first.' })
  discussionBySlug(@Param('slug') slug: string, @Req() req: Request) {
    // Optional caller: a signed-in author sees their own pending answer; an anonymous
    // reader sees only published. The token is read best-effort, never required.
    const viewerId = this.caller.resolveUserId(req) ?? undefined;
    return this.discussions.bySlug(slug, viewerId);
  }

  /**
   * Ask a question. NOT @Public — the global JwtAuthGuard requires a signed-in member.
   * Rate-limited per user in the service (5/hour, 24h new-account delay, dup guard).
   */
  @Post('discussions')
  @ApiOperation({ summary: 'Ask a question (members only).' })
  ask(@CurrentUser() user: User, @Body() dto: CreateQuestionDto) {
    return this.discussions.createQuestion(user, dto);
  }

  /** Live compose preview — same render+sanitise pipeline as the published post. */
  @Post('discussions/preview')
  @ApiOperation({ summary: 'Render markdown to sanitised HTML (compose preview).' })
  preview(@Body() body: { body?: string }) {
    return this.discussions.previewMarkdown(body?.body ?? '');
  }

  /** Report a question or answer. Auto-hides at the eligible-report threshold. */
  @Post('discussions/report')
  @ApiOperation({ summary: 'Report a question or answer (members only).' })
  report(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    return this.discussions.report(user, dto);
  }

  /** Answer a question. Status is computed from the category's answer_policy. */
  @Post('discussions/:slug/answers')
  @ApiOperation({ summary: 'Answer a question (members only).' })
  answer(@CurrentUser() user: User, @Param('slug') slug: string, @Body() dto: CreateAnswerDto) {
    return this.discussions.createAnswer(user, slug, dto);
  }

  /** Edit your own answer within the edit window. */
  @Patch('discussions/answers/:id')
  @ApiOperation({ summary: 'Edit your own answer (within the edit window).' })
  editAnswer(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateAnswerDto) {
    return this.discussions.editAnswer(user, id, dto.body);
  }

  /** Vote on an answer. value 1/-1, or 0 to clear. */
  @Post('discussions/answers/:id/vote')
  @ApiOperation({ summary: 'Vote on an answer (members only).' })
  voteAnswer(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.discussions.vote(user, id, dto.value);
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
