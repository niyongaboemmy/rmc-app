import { Controller, Get, Post, Put, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScholarshipService } from './scholarship.service';
import { CreateScholarshipApplicationDto } from './dto/create-scholarship-application.dto';
import { SaveScholarshipDocumentDto } from './dto/save-scholarship-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Scholarship — Member')
@Controller('scholarship')
export class ScholarshipController {
  constructor(private readonly service: ScholarshipService) {}

  @Get('programs')
  @Public()
  @ApiOperation({ summary: 'List open scholarship programs' })
  listPrograms() {
    return this.service.listPrograms();
  }

  @Get('programs/:id')
  @Public()
  @ApiOperation({ summary: 'Get a scholarship program' })
  getProgram(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProgram(id);
  }

  @Post('applications/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a scholarship application draft' })
  createDraft(@CurrentUser() user: User, @Body() dto: CreateScholarshipApplicationDto) {
    return this.service.createDraft(user.id, dto);
  }

  @Put('applications/:id/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft application' })
  updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateScholarshipApplicationDto>,
  ) {
    return this.service.updateDraft(id, user.id, dto);
  }

  @Post('applications/:id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a draft application' })
  submit(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submit(id, user.id);
  }

  @Post('applications/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a draft or submitted application' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Get('applications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own scholarship applications' })
  listOwn(@CurrentUser() user: User) {
    return this.service.listOwn(user.id);
  }

  @Get('applications/by-number/:number')
  @Public()
  @ApiOperation({ summary: 'Public status tracking by application number' })
  getByNumber(@Param('number') number: string) {
    return this.service.getByNumber(number);
  }

  @Get('applications/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own application details' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Post('applications/:id/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach an uploaded supporting document to an application' })
  saveDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveScholarshipDocumentDto,
  ) {
    return this.service.saveDocument(id, user.id, dto);
  }

  @Delete('applications/:id/documents/:docId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a supporting document from an application' })
  deleteDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.service.deleteDocument(id, docId, user.id);
  }
}
