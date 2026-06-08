import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { Roles, Role } from './common/decorators/roles.decorator';
import { CurrentUser } from './common/decorators/current-user.decorator';

@ApiTags('Test (dev only)')
@Controller()
export class AppController {
  @Public()
  @Get('test/public')
  @ApiOperation({ summary: 'Public route — no auth required' })
  publicRoute(): Record<string, string> {
    return { access: 'public' };
  }

  @Get('test/user-only')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Requires USER role or above' })
  userOnly(@CurrentUser() user: { role: string }): Record<string, string> {
    return { role: user.role, access: 'user-and-above' };
  }

  @Get('test/operator-only')
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Requires OPERATOR role or above' })
  operatorOnly(): Record<string, string> {
    return { access: 'operator-and-above' };
  }

  @Get('test/admin-only')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Requires ADMIN role or above' })
  adminOnly(): Record<string, string> {
    return { access: 'admin-and-above' };
  }

  @Get('test/superadmin-only')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Requires SUPERADMIN role' })
  superAdminOnly(): Record<string, string> {
    return { access: 'superadmin-only' };
  }
}
