import { Permission } from '../../common/types/permissions.enum';
export declare class Role {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    permissions: Permission[];
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}
