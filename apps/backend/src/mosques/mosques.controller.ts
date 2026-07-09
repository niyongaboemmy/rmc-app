import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MosquesService } from './mosques.service';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import { AssignImamDto } from './dto/assign-imam.dto';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('Mosques')
@Controller('mosques')
export class MosquesController {
  constructor(private readonly mosques: MosquesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all mosques' })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('districtId') districtId?: string, @Query('status') status?: string) {
    return this.mosques.findAll(districtId, status);
  }

  @Get('roots')
  @Public()
  @ApiOperation({ summary: 'Get root (parent) mosques only' })
  findRoots() {
    return this.mosques.findRootMosques();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get mosque by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mosques.findById(id);
  }

  @Get(':id/branches')
  @Public()
  @ApiOperation({ summary: 'Get branch mosques of a parent mosque' })
  getBranches(@Param('id', ParseUUIDPipe) id: string) {
    return this.mosques.findBranches(id);
  }

  @Get(':id/imams')
  @ApiBearerAuth()
  @Permissions(Permission.MOSQUES_VIEW)
  @ApiOperation({ summary: 'Get imams assigned to a mosque' })
  getImams(@Param('id', ParseUUIDPipe) id: string) {
    return this.mosques.getImams(id);
  }

  @Post()
  @ApiBearerAuth()
  @Permissions(Permission.MOSQUES_CREATE)
  @ApiOperation({ summary: 'Create a mosque' })
  create(@Body() dto: CreateMosqueDto) {
    return this.mosques.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Permissions(Permission.MOSQUES_EDIT)
  @ApiOperation({ summary: 'Update a mosque' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMosqueDto) {
    return this.mosques.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Permissions(Permission.MOSQUES_DELETE)
  @ApiOperation({ summary: 'Deactivate a mosque' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mosques.remove(id);
  }

  @Post(':id/imams')
  @ApiBearerAuth()
  @Permissions(Permission.MOSQUES_MANAGE_IMAMS)
  @ApiOperation({ summary: 'Assign an imam to a mosque' })
  assignImam(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignImamDto) {
    return this.mosques.assignImam(id, dto);
  }
}
