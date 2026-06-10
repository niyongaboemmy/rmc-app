import { Permission } from '../../common/types/permissions.enum';
export declare class CreateRoleDto {
    name: string;
    slug: string;
    description?: string;
    permissions: Permission[];
}
