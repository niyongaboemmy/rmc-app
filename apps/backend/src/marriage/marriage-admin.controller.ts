import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { IsBoolean } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MarriageService } from './marriage.service';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

class VerifyDocumentDto {
  @IsBoolean()
  verified: boolean;
}

class InitiateMomoDto {
  @IsString()
  @IsNotEmpty()
  mobilePhone: string;
}

class SignedProvisionalDto {
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}

@ApiTags('Marriage — Admin')
@Controller('admin/marriage')
@ApiBearerAuth()
export class MarriageAdminController {
  constructor(private readonly service: MarriageService) {}

  @Get('applications')
  @Permissions(Permission.MARRIAGE_VIEW)
  @ApiOperation({ summary: 'List all marriage applications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'venueType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['date', 'amount', 'couple', 'payment', 'status'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('venueType') venueType?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminFindAll({
      status,
      paymentStatus,
      venueType,
      search,
      dateFrom,
      dateTo,
      sort,
      order,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('applications/:id')
  @Permissions(Permission.MARRIAGE_VIEW)
  @ApiOperation({ summary: 'Get full application detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminFindOne(id);
  }

  @Patch('applications/:id/status')
  @Permissions(Permission.MARRIAGE_APPROVE)
  @ApiOperation({ summary: 'Update application status (approve / reject / amendments)' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }

  @Post('applications/:id/schedule')
  @Permissions(Permission.MARRIAGE_APPROVE)
  @ApiOperation({ summary: 'Schedule the ceremony date' })
  schedule(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleCeremonyDto,
  ) {
    return this.service.adminScheduleCeremony(id, user.id, dto);
  }

  @Post('applications/:id/payment/confirm')
  @Permissions(Permission.MARRIAGE_MANAGE)
  @ApiOperation({ summary: 'Confirm cash or bank payment' })
  confirmPayment(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminConfirmCashPayment(id, user.id);
  }

  @Post('applications/:id/payment/initiate-momo')
  @Permissions(Permission.MARRIAGE_MANAGE)
  @ApiOperation({ summary: 'Initiate MoMo payment request via IntouchPay' })
  initiateMomo(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiateMomoDto,
  ) {
    return this.service.adminInitiateMomoPayment(id, user.id, dto.mobilePhone);
  }

  @Get('applications/:id/payment/:txId/status')
  @Permissions(Permission.MARRIAGE_VIEW)
  @ApiOperation({ summary: 'Check MoMo payment status from IntouchPay' })
  checkMomoStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txId', ParseUUIDPipe) txId: string,
  ) {
    return this.service.adminGetMomoPaymentStatus(id, txId);
  }

  @Patch('applications/:id/documents/:docId/verify')
  @Permissions(Permission.MARRIAGE_MANAGE)
  @ApiOperation({ summary: 'Mark a submitted document as verified / unverified' })
  verifyDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() body: VerifyDocumentDto,
  ) {
    return this.service.adminVerifyDocument(id, docId, user.id, body.verified);
  }

  @Post('applications/:id/wedding-photo')
  @Permissions(Permission.MARRIAGE_APPROVE)
  @ApiOperation({ summary: 'Upload wedding photo after ceremony completion' })
  saveWeddingPhoto(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { photoUrl: string },
  ) {
    return this.service.adminSaveWeddingPhoto(id, user.id, body.photoUrl);
  }

  @Post('applications/:id/signed-provisional')
  @Permissions(Permission.MARRIAGE_CERTIFICATE)
  @ApiOperation({ summary: 'Attach the signed provisional certificate (required before issuing)' })
  saveSignedProvisional(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignedProvisionalDto,
  ) {
    return this.service.adminSaveSignedProvisional(id, user.id, dto);
  }

  @Post('applications/:id/certificate')
  @Permissions(Permission.MARRIAGE_CERTIFICATE)
  @ApiOperation({ summary: 'Issue marriage certificate' })
  issueCertificate(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminIssueCertificate(id, user.id);
  }

  @Get('stats')
  @Permissions(Permission.MARRIAGE_REPORTS)
  @ApiOperation({ summary: 'Get marriage service statistics' })
  getStats() {
    return this.service.adminGetStats();
  }
}
