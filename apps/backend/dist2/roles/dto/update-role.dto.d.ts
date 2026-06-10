import { Permission } from '../../common/types/permissions.enum';
export declare class UpdateRoleDto {
    name?: string;
    description?: string;
    permissions?: Permission[];
}
