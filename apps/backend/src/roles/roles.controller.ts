import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission, ALL_PERMISSIONS } from '../common/types/permissions.enum';
import { Role } from './entities/role.entity';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions(Permission.ROLES_VIEW)
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions(): string[] {
    return ALL_PERMISSIONS;
  }

  @Get()
  @RequirePermissions(Permission.ROLES_VIEW)
  @ApiOperation({ summary: 'List all roles' })
  findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLES_VIEW)
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.rolesService.findByIdOrFail(id);
  }

  @Post()
  @RequirePermissions(Permission.ROLES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 409, description: 'Role name/slug already exists' })
  create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.ROLES_EDIT)
  @ApiOperation({ summary: 'Update a role' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto): Promise<Role> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ROLES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role (system roles protected)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}
