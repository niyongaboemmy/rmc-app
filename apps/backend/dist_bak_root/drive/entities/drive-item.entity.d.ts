import { User } from '../../users/entities/user.entity';
export type DriveItemType = 'file' | 'folder';
export type DriveSharePermission = 'viewer' | 'editor' | 'owner';
export declare class DriveItem {
    id: string;
    name: string;
    type: DriveItemType;
    mimeType: string | null;
    storageKey: string | null;
    size: number | null;
    parentId: string | null;
    parent: DriveItem | null;
    children: DriveItem[];
    ownerId: string;
    owner: User;
    isTrashed: boolean;
    trashedAt: Date | null;
    isStarred: boolean;
    color: string | null;
    description: string | null;
    shares: DriveShare[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
export declare class DriveShare {
    id: string;
    itemId: string;
    item: DriveItem;
    sharedWithId: string;
    sharedWith: User;
    sharedById: string;
    sharedBy: User;
    permission: DriveSharePermission;
    createdAt: Date;
    updatedAt: Date;
}
