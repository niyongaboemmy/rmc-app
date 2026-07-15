import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DawahCategoryService } from './dawah-category.service';
import { DawahCourseService } from './dawah-course.service';
import { DawahBookService, type BookFile } from './dawah-book.service';
import { OptionalCallerService } from './optional-caller.service';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { QueryBooksDto } from './dto/query-books.dto';
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
    private readonly books: DawahBookService,
    private readonly caller: OptionalCallerService,
  ) {}

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
  @ApiOperation({ summary: 'One published course with its lesson outline, in order' })
  findCourse(@Param('slug') slug: string) {
    return this.courses.findBySlugPublic(slug);
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
   * which strips fileKey and previewFileKey — they are keys into the file
   * server's PROTECTED dawah-library/ prefix, and publishing them would hand an
   * attacker the exact path to request. The reading routes (preview / download)
   * are Phase 2B and resolve the key server-side from the slug.
   */
  @Get('books/:slug')
  @Public()
  @ApiOperation({ summary: 'One published book — metadata only, never the storage keys' })
  findBook(@Param('slug') slug: string) {
    return this.books.findBySlugPublic(slug);
  }

  /**
   * Read a book in the browser. This is the route the whole §6 design exists to
   * make possible: the PDF lives under the file-server's PROTECTED
   * `dawah-library/` prefix, so it cannot be fetched directly by any browser —
   * the bytes can only arrive through here, which is the one place that knows
   * whether this caller is allowed to see them.
   *
   * @Public(), so the global guard never populates a user — the OPTIONAL
   * identity is resolved by hand (see OptionalCallerService). A missing or
   * expired token means anonymous, not 401: a public book must still open for a
   * reader who is not signed in.
   *
   * Streams the excerpt when one exists, otherwise the full file, otherwise
   * 401. Resolution order lives in DawahBookService.getPreviewFile().
   */
  @Get('books/:slug/preview')
  @Public()
  @ApiOperation({
    summary: 'Read a book inline — the excerpt if one exists, else the full PDF if policy allows (401 otherwise)',
  })
  async previewBook(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.books.getPreviewFile(slug, this.caller.isAuthenticated(req));
    this.sendPdf(res, file, 'inline');
  }

  /** Always the FULL file — 403 when allow_download is off, 401 when members-only and anonymous. */
  @Get('books/:slug/download')
  @Public()
  @ApiOperation({ summary: 'Download the full book PDF (403 if downloads are disabled)' })
  async downloadBook(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.books.getDownloadFile(slug, this.caller.isAuthenticated(req));
    this.sendPdf(res, file, 'attachment');
  }
}
