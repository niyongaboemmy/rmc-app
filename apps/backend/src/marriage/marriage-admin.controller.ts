import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MarriageService } from './marriage.service';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScheduleCeremonyDto } from './dto/schedule-ceremony.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { JwtPayload } from '../common/types/jwt-payload.interface';

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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('venueType') venueType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminFindAll({
      status, paymentStatus, venueType, search,
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
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.sub, dto);
  }

  @Post('applications/:id/schedule')
  @Permissions(Permission.MARRIAGE_APPROVE)
  @ApiOperation({ summary: 'Schedule the ceremony date' })
  schedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleCeremonyDto,
  ) {
    return this.service.adminScheduleCeremony(id, user.sub, dto);
  }

  @Post('applications/:id/payment/confirm')
  @Permissions(Permission.MARRIAGE_MANAGE)
  @ApiOperation({ summary: 'Confirm cash or bank payment' })
  confirmPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.adminConfirmCashPayment(id, user.sub);
  }

  @Post('applications/:id/wedding-photo')
  @Permissions(Permission.MARRIAGE_APPROVE)
  @ApiOperation({ summary: 'Upload wedding photo after ceremony completion' })
  saveWeddingPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { photoUrl: string },
  ) {
    return this.service.adminSaveWeddingPhoto(id, user.sub, body.photoUrl);
  }

  @Post('applications/:id/certificate')
  @Permissions(Permission.MARRIAGE_CERTIFICATE)
  @ApiOperation({ summary: 'Issue marriage certificate' })
  issueCertificate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.adminIssueCertificate(id, user.sub);
  }

  @Get('stats')
  @Permissions(Permission.MARRIAGE_REPORTS)
  @ApiOperation({ summary: 'Get marriage service statistics' })
  getStats() {
    return this.service.adminGetStats();
  }
}
