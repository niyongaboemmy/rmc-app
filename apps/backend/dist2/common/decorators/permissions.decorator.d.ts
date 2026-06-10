import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types/permissions.enum';
export declare const PERMISSIONS_KEY = "permissions";
export declare const RequirePermissions: (...permissions: Permission[]) => ReturnType<typeof SetMetadata>;
