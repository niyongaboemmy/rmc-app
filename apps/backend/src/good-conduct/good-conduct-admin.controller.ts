import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GoodConductService } from './good-conduct.service';
import { UpdateGoodConductStatusDto } from './dto/update-good-conduct-status.dto';
import { AssignImamDto } from './dto/assign-imam.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Good Conduct — Admin')
@Controller('admin/good-conduct')
@ApiBearerAuth()
export class GoodConductAdminController {
  constructor(private readonly service: GoodConductService) {}

  @Get('requests')
  @Permissions(Permission.GOOD_CONDUCT_VIEW)
  @ApiOperation({ summary: 'List all Good Conduct requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'mosqueId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('mosqueId') mosqueId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminList({
      status,
      paymentStatus,
      mosqueId,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('requests/:id')
  @Permissions(Permission.GOOD_CONDUCT_VIEW)
  @ApiOperation({ summary: 'Get full request detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  @Patch('requests/:id/status')
  @Permissions(Permission.GOOD_CONDUCT_APPROVE)
  @ApiOperation({ summary: 'Approve / reject / request more info' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoodConductStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }

  @Post('requests/:id/assign-imam')
  @Permissions(Permission.GOOD_CONDUCT_MANAGE)
  @ApiOperation({ summary: 'Resolve the attesting imam for a request' })
  assignImam(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignImamDto,
  ) {
    return this.service.adminAssignImam(id, user.id, dto);
  }

  @Post('requests/:id/payment/confirm')
  @Permissions(Permission.GOOD_CONDUCT_MANAGE)
  @ApiOperation({ summary: 'Confirm cash or bank payment' })
  confirmPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.service.adminConfirmPayment(id, user.id, dto);
  }

  @Post('requests/:id/certificate')
  @Permissions(Permission.GOOD_CONDUCT_CERTIFICATE)
  @ApiOperation({ summary: 'Allocate the certificate number and issue the certificate' })
  issueCertificate(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminIssueCertificate(id, user.id);
  }

  @Get('reports')
  @Permissions(Permission.GOOD_CONDUCT_REPORTS)
  @ApiOperation({ summary: 'Get Good Conduct service statistics' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getReports(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.adminGetReports({ dateFrom, dateTo });
  }

  @Get('reports/export')
  @Permissions(Permission.GOOD_CONDUCT_REPORTS)
  @ApiOperation({ summary: 'Export Good Conduct requests as CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'mosqueId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('mosqueId') mosqueId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.service.adminExportCsv({
      status,
      paymentStatus,
      mosqueId,
      search,
      dateFrom,
      dateTo,
    });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="good-conduct-requests.csv"',
    });
    res.status(200).send(csv);
  }
}
