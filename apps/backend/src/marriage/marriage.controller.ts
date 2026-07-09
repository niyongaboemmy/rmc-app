import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarriageService } from './marriage.service';
import { CreateMarriageApplicationDto } from './dto/create-marriage-application.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Marriage — Member')
@Controller('marriage')
export class MarriageController {
  constructor(private readonly service: MarriageService) {}

  @Post('applications/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a marriage application draft' })
  createDraft(@CurrentUser() user: User, @Body() dto: CreateMarriageApplicationDto) {
    return this.service.createDraft(user.id, dto);
  }

  @Put('applications/:id/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft application' })
  updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateMarriageApplicationDto>,
  ) {
    return this.service.updateDraft(id, user.id, dto);
  }

  @Post('applications/:id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a draft application' })
  submit(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submit(id, user.id);
  }

  @Get('applications/:id/payment/check')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Poll IntouchPay gateway for payment status and sync DB' })
  checkPaymentStatus(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.checkUserMomoPaymentStatus(id, user.id);
  }

  @Post('applications/:id/payment/initiate-momo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MoMo (IntouchPay) payment for a draft application' })
  initiateMomoPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { mobilePhone: string },
  ) {
    return this.service.initiateUserMomoPayment(id, user.id, dto.mobilePhone);
  }

  @Post('applications/:id/payment/dev-complete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[DEV ONLY] Mark payment as completed without the gateway (blocked in production)',
  })
  devCompletePayment(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.devCompletePayment(id, user.id);
  }

  @Post('applications/:id/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save an uploaded document record for an application' })
  saveDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveDocumentDto,
  ) {
    return this.service.saveDocument(id, user.id, dto);
  }

  @Post('applications/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an application' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Get('applications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own applications' })
  listMine(@CurrentUser() user: User) {
    return this.service.findAllByApplicant(user.id);
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
  getOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwnApplication(id, user.id);
  }

  @Get('fees')
  @Public()
  @ApiOperation({ summary: 'Get current marriage fee tiers (public)' })
  getMarriageFees() {
    return this.service.getMarriageFees();
  }

  @Get('public/verify/:applicationNumber')
  @Public()
  @ApiOperation({ summary: 'Public QR code certificate verification' })
  publicVerify(@Param('applicationNumber') applicationNumber: string) {
    return this.service.publicVerify(applicationNumber);
  }

  // ── Party Confirmations ───────────────────────────────────────────────────────

  @Post('applications/:id/parties')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add party phone numbers to trigger confirmation requests' })
  addParties(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { parties: Array<{ role: string; name?: string; nid?: string; phone?: string }> },
  ) {
    return this.service.addParties(id, user.id, dto.parties as any);
  }

  @Get('applications/:id/parties')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get confirmation status for all parties' })
  getParties(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPartyConfirmations(id);
  }

  @Get('applications/by-number/:number/parties')
  @Public()
  @ApiOperation({
    summary: 'Get party confirmation status by application number (public — no PII)',
  })
  async getPartiesByNumber(@Param('number') number: string) {
    const app = await this.service.findByApplicationNumber(number);
    if (!app) return [];
    const parties = await this.service.getPartyConfirmations(app.id);
    return parties.map((p) => ({
      role: p.role,
      confirmedAt: p.confirmedAt,
    }));
  }

  @Get('confirm/:token')
  @Public()
  @ApiOperation({ summary: 'Look up a party confirmation request by token' })
  lookupToken(@Param('token') token: string) {
    return this.service.lookupByToken(token);
  }

  @Post('confirm/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit party confirmation' })
  confirmParty(@Param('token') token: string, @Body() dto: { notes?: string }) {
    return this.service.confirmParty(token, dto.notes);
  }
}
