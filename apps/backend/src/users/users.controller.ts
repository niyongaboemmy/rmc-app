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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService, UserListQuery } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AssignRoleDto } from './dto/update-user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'List users (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(@Query() query: UserListQuery) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  getMe(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.USERS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (admin)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.USERS_EDIT)
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Put(':id/role')
  @RequirePermissions(Permission.USERS_ASSIGN_ROLE)
  @ApiOperation({ summary: "Assign or change a user's role" })
  assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.softDelete(id);
  }
}
