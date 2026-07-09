import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('Schools — Admin')
@Controller('admin/schools')
@ApiBearerAuth()
export class SchoolsAdminController {
  constructor(private readonly service: SchoolsService) {}

  @Get()
  @Permissions(Permission.SCHOOLS_VIEW)
  @ApiOperation({ summary: 'List all schools (any status)' })
  list() {
    return this.service.adminList();
  }

  @Post()
  @Permissions(Permission.SCHOOLS_MANAGE)
  @ApiOperation({ summary: 'Create a school' })
  create(@Body() dto: CreateSchoolDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions(Permission.SCHOOLS_MANAGE)
  @ApiOperation({ summary: 'Update a school' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSchoolDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.SCHOOLS_MANAGE)
  @ApiOperation({ summary: 'Delete a school' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
