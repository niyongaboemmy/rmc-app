import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { AnnouncementService } from './announcement.service';
import { VolunteerService } from './volunteer.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralSkillService } from './funeral-skill.service';
import { CreateFuneralRequestDto } from './dto/create-funeral-request.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Funeral')
@Controller('funeral')
export class FuneralController {
  constructor(
    private readonly service: FuneralService,
    private readonly cemeteries: CemeteryService,
    private readonly announcements: AnnouncementService,
    private readonly volunteers: VolunteerService,
    private readonly steps: FuneralStepService,
    private readonly skills: FuneralSkillService,
  ) {}

  @Get('steps')
  @Public()
  @ApiOperation({ summary: 'List active funeral lifecycle steps (public timeline)' })
  listSteps() {
    return this.steps.findAllDto(true);
  }

  @Get('skills')
  @Public()
  @ApiOperation({ summary: 'List active attendant skills' })
  listSkills() {
    return this.skills.findAllDto(true);
  }

  @Get('volunteers')
  @Public()
  @ApiOperation({ summary: 'List funeral volunteers (public roster)' })
  listVolunteers() {
    return this.volunteers.findAll();
  }

  @Get('cemeteries')
  @Public()
  @ApiOperation({ summary: 'List cemeteries (public directory)' })
  listCemeteries() {
    return this.cemeteries.findAll();
  }

  @Get('announcements')
  @Public()
  @ApiOperation({ summary: 'List funeral announcements (janāzah notices)' })
  listAnnouncements() {
    return this.announcements.findAll();
  }

  @Post('requests')
  @Public()
  @ApiOperation({ summary: 'Submit a new funeral service request' })
  submit(@Body() dto: CreateFuneralRequestDto) {
    return this.service.submit(dto);
  }

  @Get('requests/by-reference/:reference')
  @Public()
  @ApiOperation({ summary: 'Look up a funeral request by its reference (status page)' })
  getByReference(@Param('reference') reference: string) {
    return this.service.getByReference(reference);
  }
}
