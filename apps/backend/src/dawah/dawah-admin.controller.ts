import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DawahCategoryService } from './dawah-category.service';
import { DawahCourseService } from './dawah-course.service';
import { DawahBookService, BOOK_MAX_BYTES } from './dawah-book.service';
import { MEDIA_MAX_BYTES } from './dawah-media.constants';
import type { UploadedDocument } from '../integrations/storage/public-upload.service';
import { CreateDawahCategoryDto } from './dto/create-dawah-category.dto';
import { UpdateDawahCategoryDto } from './dto/update-dawah-category.dto';
import { CreateDawahCourseDto } from './dto/create-dawah-course.dto';
import { UpdateDawahCourseDto } from './dto/update-dawah-course.dto';
import { UpdateCourseStatusDto } from './dto/update-course-status.dto';
import { CreateDawahLessonDto } from './dto/create-dawah-lesson.dto';
import { UpdateDawahLessonDto } from './dto/update-dawah-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { CreateDawahBookDto } from './dto/create-dawah-book.dto';
import { UpdateDawahBookDto } from './dto/update-dawah-book.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { QueryBooksDto } from './dto/query-books.dto';
import { DawahDiscussionsService } from './dawah-discussions.service';
import { AnswerQuestionDto, CreateEntryDto } from './dto/create-entry.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

/**
 * Guards are global APP_GUARDs (Jwt + Roles + Permissions) — @Permissions()
 * alone gates each route, matching the hajj and marriage admin controllers.
 * Reads take DAWAH_VIEW, every write takes DAWAH_MANAGE, so an admin granted
 * only `dawah:view` gets a read-only panel for free.
 */
@ApiTags('Dawah — Admin')
@Controller('admin/dawah')
@ApiBearerAuth()
export class DawahAdminController {
  constructor(
    private readonly categories: DawahCategoryService,
    private readonly courses: DawahCourseService,
    private readonly books: DawahBookService,
    private readonly discussions: DawahDiscussionsService,
  ) {}

  // ── Q&A authoring (DISCUSSIONS_VERIFY) ──────────────────────────────────────
  // DISCUSSIONS_VERIFY still means "may speak for RMC on a point of religion" — it
  // now grants writing and publishing the answer itself rather than blessing a
  // member's. The permission STRING is unchanged so no role has to be re-granted;
  // only what it authorises has moved.
  //
  // Declared before `discussions/:id/:action`, because Nest matches in declaration
  // order and 'submissions' would otherwise be parsed as an :id.

  @Get('discussions/submissions')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'Member questions awaiting an answer — oldest first.' })
  submissions() {
    return this.discussions.submissionQueue();
  }

  /**
   * The number a new entry will be given. Display only — the value is assigned
   * server-side on insert, so a stale preview cannot produce a duplicate.
   */
  @Get('discussions/next-number')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'The entry number the next new entry will receive.' })
  nextEntryNumber() {
    return this.discussions.peekNextEntryNumber();
  }

  @Get('discussions/entries')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'ALL entries in any status, for the admin listing.' })
  entries(@Query() query: { search?: string; status?: string; page?: number; limit?: number }) {
    return this.discussions.adminList(query);
  }

  @Post('discussions/entries')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'Author a question and its answer, and publish it.' })
  createEntry(@CurrentUser() user: User, @Body() dto: CreateEntryDto) {
    return this.discussions.createEntry(user, dto);
  }

  @Get('discussions/entries/:id')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'One entry with its markdown source, for the editor.' })
  entry(@Param('id') id: string) {
    return this.discussions.adminGetById(id);
  }

  @Patch('discussions/entries/:id')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'Edit a published entry in place. Does not re-notify.' })
  updateEntry(@Param('id') id: string, @Body() dto: Partial<CreateEntryDto>) {
    return this.discussions.updateEntry(id, dto);
  }

  @Post('discussions/entries/:id/answer')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: "Answer a member's submission and publish it. Notifies the asker." })
  answerQuestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.discussions.answerQuestion(user, id, dto);
  }

  @Post('discussions/entries/:id/reject')
  @Permissions(Permission.DISCUSSIONS_VERIFY)
  @ApiOperation({ summary: 'Decline to answer a submission. Distinct from hiding.' })
  rejectQuestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.discussions.rejectQuestion(user, id, body?.reason ?? '');
  }

  // ── Withdrawal (DISCUSSIONS_MODERATE) ───────────────────────────────────────
  // Separate from authoring on purpose: writing RMC's answer and pulling a published
  // entry are different authorities, and RMC may hold them in different hands.

  @Post('discussions/:id/:action')
  @Permissions(Permission.DISCUSSIONS_MODERATE)
  @ApiOperation({ summary: 'Hide / restore / delete a published entry. Always logged.' })
  moderateQuestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('action') action: 'hide' | 'restore' | 'delete',
    @Body() body: { reason?: string },
  ) {
    return this.discussions.moderateQuestion(user, id, action, body?.reason ?? '');
  }

  // ── Categories ────────────────────────────────────────────────────────────

  @Get('categories')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({ summary: 'List Dawah categories (including deactivated)' })
  listCategories() {
    return this.categories.adminList();
  }

  @Post('categories')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Create a Dawah category' })
  createCategory(@Body() dto: CreateDawahCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch('categories/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Update a Dawah category (slug is immutable — it is a URL filter)' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDawahCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('categories/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a Dawah category (its courses and books survive)' })
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  // ── Courses ───────────────────────────────────────────────────────────────

  @Get('courses')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({
    summary: 'List courses in every status — same filters as the public list, plus ?status',
  })
  listCourses(@Query() query: QueryCoursesDto) {
    return this.courses.adminList(query);
  }

  @Post('courses')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Create a course (slug derived from titleEn when omitted)' })
  createCourse(@Body() dto: CreateDawahCourseDto) {
    return this.courses.create(dto);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────
  // Declared ABOVE `courses/:id` and its siblings. Nest matches in declaration
  // order and these are all `courses/…` paths — a two-segment literal like
  // `courses/:id/lessons` is unambiguous, but keeping the lesson block together
  // and above the bare `:id` routes is what stops the next person appending a
  // `courses/import` route below `courses/:id` and silently breaking it.

  @Post('courses/:id/lessons')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Add a lesson to a course (appended to the end of the outline)' })
  addLesson(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDawahLessonDto) {
    return this.courses.addLesson(id, dto);
  }

  @Post('courses/:id/lessons/reorder')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({
    summary:
      'Reorder a course outline — ids must be the COMPLETE lesson set, or the request is rejected',
  })
  reorderLessons(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderLessonsDto) {
    return this.courses.reorderLessons(id, dto.ids);
  }

  @Patch('lessons/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDawahLessonDto) {
    return this.courses.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Delete a lesson (hard delete — lessons have no soft-delete)' })
  removeLesson(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.removeLesson(id);
  }

  /**
   * Declared before `courses/:id` (PATCH) so the literal `status` segment wins
   * the route match — the bug this repo has already shipped twice.
   */
  @Patch('courses/:id/status')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({
    summary: 'Publish / unpublish / archive a course (stamps published_at on first publish)',
  })
  setCourseStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseStatusDto) {
    return this.courses.setStatus(id, dto.status);
  }

  @Get('courses/:id')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({ summary: 'Get one course with its ordered lessons' })
  findCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.findOne(id);
  }

  @Patch('courses/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Update a course (slug changes are ignored once published)' })
  updateCourse(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDawahCourseDto) {
    return this.courses.update(id, dto);
  }

  @Delete('courses/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a course' })
  removeCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(id);
  }

  // ── Library ───────────────────────────────────────────────────────────────
  // Upload / preview / download are the file pipeline (Phase 2B) and are NOT
  // here. These routes are metadata only; an admin response does include the
  // storage keys, which is exactly what the public projection strips.

  @Get('books')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({
    summary: 'List books in every status — same filters as the public list, plus ?status',
  })
  listBooks(@Query() query: QueryBooksDto) {
    return this.books.adminList(query);
  }

  @Post('books')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({
    summary:
      'Create a book from an uploaded file (fileKey/fileName/fileSize come from the upload endpoint)',
  })
  createBook(@Body() dto: CreateDawahBookDto) {
    return this.books.create(dto);
  }

  /**
   * Store a book PDF, then hand the caller the metadata to POST to /books.
   *
   * Declared before the `books/:id` routes — the literal path must win the
   * match, the bug this repo has already shipped twice.
   *
   * The file lands under the PROTECTED `dawah-library/` prefix, so from this
   * moment on it is unreachable by any browser except through the backend. The
   * 25 MB ceiling is enforced twice on purpose: multer's `limits` rejects the
   * stream before it is fully buffered, and the service re-checks the size it
   * actually received. PDF only — the mime type is validated, never the
   * extension, which is just a claim the client makes.
   */
  @Post('books/upload')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a book PDF (max 25 MB) → { fileKey, fileName, fileSize, mimeType }',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BOOK_MAX_BYTES } }))
  uploadBookFile(@UploadedFile() file: UploadedDocument | undefined) {
    return this.books.uploadFile(file);
  }

  /**
   * Upload an audio file for a lesson. Lands under the PUBLIC `dawah-media/`
   * prefix (served directly by the file-server, unlike protected book PDFs).
   * Audio only — video is an external URL, never uploaded. The returned key
   * goes into a lesson's `mediaKey` via the normal lesson create/update route.
   */
  @Post('media/upload')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload lesson audio (max 90 MB) → { fileKey, fileName, fileSize, mimeType }',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MEDIA_MAX_BYTES } }))
  uploadLessonMedia(@UploadedFile() file: UploadedDocument | undefined) {
    return this.courses.uploadMedia(file);
  }

  /**
   * Proof a book before publishing it. Streams the full PDF regardless of
   * status, visibility or allow_download — the file server will not serve these
   * keys to a browser, so this authenticated route is the only way an admin can
   * see what they uploaded. Mirrors GET /admin/hajj/documents/:docId/file.
   */
  @Get('books/:id/file')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({ summary: 'Inline-stream a book PDF for admin proofing (any status)' })
  async bookFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const file = await this.books.getAdminFile(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(file.buffer);
  }

  @Get('books/:id')
  @Permissions(Permission.DAWAH_VIEW)
  @ApiOperation({ summary: 'Get one book, including its storage keys' })
  findBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.books.findOne(id);
  }

  @Patch('books/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Update a book (slug changes are ignored once published)' })
  updateBook(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDawahBookDto) {
    return this.books.update(id, dto);
  }

  @Delete('books/:id')
  @Permissions(Permission.DAWAH_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a book' })
  removeBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.books.remove(id);
  }
}
