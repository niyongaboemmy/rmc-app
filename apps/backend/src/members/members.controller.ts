import {
  Controller, Get, Post, Put, Body, Param, Query,
  ParseUUIDPipe, Res, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/types/jwt-payload.interface';

@ApiTags('Members')
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit member registration profile' })
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterMemberDto) {
    return this.members.register(user.sub, dto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'List members with filtering and pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'mosqueId', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'approvalStatus', required: false })
  @ApiQuery({ name: 'memberStatus', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('mosqueId') mosqueId?: string,
    @Query('districtId') districtId?: string,
    @Query('category') category?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('memberStatus') memberStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.members.findAll({
      search, mosqueId, districtId, category, approvalStatus, memberStatus,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('stats')
  @ApiBearerAuth()
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get member statistics' })
  getStats() {
    return this.members.getStatistics();
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user member profile' })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.members.findByUserId(user.sub);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get member by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.members.findById(id);
  }

  @Put(':id/approve')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Approve or reject a member registration' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveMemberDto,
  ) {
    return this.members.approve(id, user.sub, dto);
  }

  @Put(':id/status')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update member status (active/inactive/suspended/deceased)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.members.updateStatus(id, user.sub, dto);
  }

  @Get(':id/id-card')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download digital member ID card as PDF' })
  async downloadIdCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.members.generateDigitalIdCard(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rmc-id-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.status(HttpStatus.OK).end(pdfBuffer);
  }
}
