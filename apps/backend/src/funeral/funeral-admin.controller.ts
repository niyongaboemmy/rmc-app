import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { AnnouncementService } from './announcement.service';
import { VolunteerService } from './volunteer.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralSkillService } from './funeral-skill.service';
import { UpdateFuneralStageDto } from './dto/update-funeral-stage.dto';
import { CreateCemeteryDto } from './dto/create-cemetery.dto';
import { UpdateCemeteryDto } from './dto/update-cemetery.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { AssignVolunteerDto } from './dto/assign-volunteer.dto';
import { CreateFuneralStepDto } from './dto/create-funeral-step.dto';
import { UpdateFuneralStepDto } from './dto/update-funeral-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { CreateFuneralSkillDto } from './dto/create-funeral-skill.dto';
import { UpdateFuneralSkillDto } from './dto/update-funeral-skill.dto';
import { ReorderSkillsDto } from './dto/reorder-skills.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Funeral — Admin')
@Controller('admin/funeral')
@ApiBearerAuth()
export class FuneralAdminController {
  constructor(
    private readonly service: FuneralService,
    private readonly cemeteries: CemeteryService,
    private readonly announcements: AnnouncementService,
    private readonly volunteers: VolunteerService,
    private readonly steps: FuneralStepService,
    private readonly skills: FuneralSkillService,
  ) {}

  // ── Attendant skills (CMS) ────────────────────────────────────────────────
  @Get('skills')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List all attendant skills (incl. inactive)' })
  listSkills() {
    return this.skills.findAllDto(false);
  }

  @Post('skills')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Add an attendant skill' })
  createSkill(@Body() dto: CreateFuneralSkillDto) {
    return this.skills.create(dto);
  }

  @Patch('skills/reorder')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Reorder attendant skills' })
  reorderSkills(@Body() dto: ReorderSkillsDto) {
    return this.skills.reorder(dto.ids);
  }

  @Patch('skills/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update an attendant skill' })
  updateSkill(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFuneralSkillDto) {
    return this.skills.update(id, dto);
  }

  @Delete('skills/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Delete an attendant skill (blocked if in use)' })
  removeSkill(@Param('id', ParseUUIDPipe) id: string) {
    return this.skills.remove(id);
  }

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

  // ── Volunteers ──────────────────────────────────────────────────────────
  @Get('volunteers')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List funeral volunteers' })
  listVolunteers() {
    return this.volunteers.findAll();
  }

  @Post('volunteers')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Add a volunteer (attendant)' })
  createVolunteer(@Body() dto: CreateVolunteerDto) {
    return this.volunteers.create(dto);
  }

  @Patch('volunteers/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update a volunteer' })
  updateVolunteer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVolunteerDto) {
    return this.volunteers.update(id, dto);
  }

  @Delete('volunteers/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Remove a volunteer' })
  removeVolunteer(@Param('id', ParseUUIDPipe) id: string) {
    return this.volunteers.remove(id);
  }

  @Patch('volunteers/:id/assign')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Assign a volunteer to a funeral + task' })
  assignVolunteer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignVolunteerDto) {
    return this.volunteers.assign(id, dto);
  }

  @Patch('volunteers/:id/unassign')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Unassign a volunteer' })
  unassignVolunteer(@Param('id', ParseUUIDPipe) id: string) {
    return this.volunteers.unassign(id);
  }

  // ── Announcements ─────────────────────────────────────────────────────────
  @Get('announcements')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'List funeral announcements' })
  listAnnouncements() {
    return this.announcements.findAll();
  }

  @Post('announcements')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Create an announcement' })
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.announcements.create(dto);
  }

  @Patch('announcements/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Update an announcement' })
  updateAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcements.update(id, dto);
  }

  @Delete('announcements/:id')
  @Permissions(Permission.FUNERAL_MANAGE)
  @ApiOperation({ summary: 'Delete an announcement' })
  removeAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcements.remove(id);
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

  @Get('requests/:id')
  @Permissions(Permission.FUNERAL_VIEW)
  @ApiOperation({ summary: 'Get a funeral request by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
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
