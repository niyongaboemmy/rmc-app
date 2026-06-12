import {
  Controller, Get, Post, Put, Patch, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarriageService } from './marriage.service';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.interface';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Marriage — Member')
@Controller('marriage')
export class MarriageController {
  constructor(private readonly service: MarriageService) {}

  @Post('applications/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a marriage application draft' })
  createDraft(@CurrentUser() user: JwtPayload, @Body() dto: CreateMarriageApplicationDto) {
    return this.service.createDraft(user.sub, dto);
  }

  @Put('applications/:id/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft application' })
  updateDraft(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateMarriageApplicationDto>,
  ) {
    return this.service.updateDraft(id, user.sub, dto);
  }

  @Post('applications/:id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a draft application' })
  submit(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submit(id, user.sub);
  }

  @Post('applications/:id/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save an uploaded document record for an application' })
  saveDocument(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveDocumentDto,
  ) {
    return this.service.saveDocument(id, user.sub, dto);
  }

  @Post('applications/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an application' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.sub);
  }

  @Get('applications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own applications' })
  listMine(@CurrentUser() user: JwtPayload) {
    return this.service.findAllByApplicant(user.sub);
  }

  // NOTE: this must come BEFORE /applications/:id to avoid UUID parse conflicts
  @Get('applications/by-number/:number')
  @Public()
  @ApiOperation({ summary: 'Get application by application number (public)' })
  getByNumber(@Param('number') number: string) {
    return this.service.findByApplicationNumber(number);
  }

  @Get('applications/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own application by UUID' })
  getOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwnApplication(id, user.sub);
  }

  @Get('public/verify/:applicationNumber')
  @Public()
  @ApiOperation({ summary: 'Public QR code certificate verification' })
  publicVerify(@Param('applicationNumber') applicationNumber: string) {
    return this.service.publicVerify(applicationNumber);
  }
}
