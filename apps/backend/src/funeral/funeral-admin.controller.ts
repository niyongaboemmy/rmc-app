import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralTransportService } from './funeral-transport.service';
import { UpdateFuneralStageDto } from './dto/update-funeral-stage.dto';
import { CreateCemeteryDto } from './dto/create-cemetery.dto';
import { UpdateCemeteryDto } from './dto/update-cemetery.dto';
import { CreateFuneralStepDto } from './dto/create-funeral-step.dto';
import { UpdateFuneralStepDto } from './dto/update-funeral-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { CreateFuneralTransportDto } from './dto/create-funeral-transport.dto';
import { UpdateFuneralTransportDto } from './dto/update-funeral-transport.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { sendXlsx } from '../common/utils/xlsx';
import { User } from '../users/entities/user.entity';

@ApiTags('Funeral — Admin')
@Controller('admin/funeral')
@ApiBearerAuth()
export class FuneralAdminController {
  constructor(
    private readonly service: FuneralService,
    private readonly cemeteries: CemeteryService,
    private readonly steps: FuneralStepService,
    private readonly transports: FuneralTransportService,
  ) {}

  // ── Lifecycle steps (CMS) ─────────────────────────────────────────────────
  @Get('steps')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List all funeral lifecycle steps (incl. inactive)' })
  listSteps() {
    return this.steps.findAllDto(false);
  }

  @Post('steps')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Add a lifecycle step' })
  createStep(@Body() dto: CreateFuneralStepDto) {
    return this.steps.create(dto);
  }

  @Patch('steps/reorder')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Reorder lifecycle steps' })
  reorderSteps(@Body() dto: ReorderStepsDto) {
    return this.steps.reorder(dto.ids);
  }

  @Patch('steps/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update a lifecycle step' })
  updateStep(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFuneralStepDto) {
    return this.steps.update(id, dto);
  }

  @Delete('steps/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Delete a lifecycle step (blocked if in use)' })
  removeStep(@Param('id', ParseUUIDPipe) id: string) {
    return this.steps.remove(id);
  }

  // ── Cemeteries ──────────────────────────────────────────────────────────
  @Get('cemeteries')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List cemeteries' })
  listCemeteries() {
    return this.cemeteries.findAll();
  }

  @Post('cemeteries')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Create a cemetery' })
  createCemetery(@Body() dto: CreateCemeteryDto) {
    return this.cemeteries.create(dto);
  }

  @Patch('cemeteries/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update a cemetery' })
  updateCemetery(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCemeteryDto) {
    return this.cemeteries.update(id, dto);
  }

  @Delete('cemeteries/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Delete a cemetery' })
  removeCemetery(@Param('id', ParseUUIDPipe) id: string) {
    return this.cemeteries.remove(id);
  }

  // ── Transports ────────────────────────────────────────────────────────────
  @Get('transports')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List transport means (incl. inactive)' })
  listTransports() {
    return this.transports.findAll();
  }

  @Post('transports')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Create a transport means' })
  createTransport(@Body() dto: CreateFuneralTransportDto) {
    return this.transports.create(dto);
  }

  @Patch('transports/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update a transport means' })
  updateTransport(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFuneralTransportDto) {
    return this.transports.update(id, dto);
  }

  @Delete('transports/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Delete a transport means' })
  removeTransport(@Param('id', ParseUUIDPipe) id: string) {
    return this.transports.remove(id);
  }

  @Get('requests')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List funeral requests' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('stage') stage?: string, @Query('search') search?: string) {
    return this.service.findAll({ stage, search });
  }

  @Get('stats')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'Funeral request headline figures' })
  getStats() {
    return this.service.getStats();
  }

  /**
   * Declared before `requests/:id` on purpose: Nest matches in declaration order, so
   * the other way round "export" would be parsed as an id and rejected by the UUID pipe.
   */
  @Get('requests/export')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'Export the filtered funeral requests as an .xlsx report' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'search', required: false })
  async exportRequests(
    @Res() res: Response,
    @Query('stage') stage?: string,
    @Query('search') search?: string,
  ): Promise<void> {
    const buffer = await this.service.exportXlsx({ stage, search });
    sendXlsx(res, buffer, 'funeral-requests');
  }

  @Get('requests/:id')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'Get a funeral request by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /**
   * Stream the uploaded death certificate. The file server will not serve these keys
   * to an anonymous browser, so this authenticated route is the only way to see it.
   */
  @Get('requests/:id/death-certificate')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'Download/inspect the death certificate' })
  async deathCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { fileName, buffer, mimeType } = await this.service.adminGetDeathCertificate(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    // inline so images render in <img> and PDFs in an <iframe>
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buffer);
  }

  @Patch('requests/:id/stage')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update a funeral request stage' })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFuneralStageDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateStage(id, dto, user?.id);
  }
}
