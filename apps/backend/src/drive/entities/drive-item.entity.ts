import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type DriveItemType = 'file' | 'folder';
export type DriveSharePermission = 'viewer' | 'editor' | 'owner';

@Entity('drive_items')
export class DriveItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  type: DriveItemType;

  @Column({ name: 'mime_type', type: 'varchar', length: 255, nullable: true })
  mimeType: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: number | null;

  @Index('IDX_drive_items_parent_id')
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => DriveItem, (item) => item.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: DriveItem | null;

  @OneToMany(() => DriveItem, (item) => item.parent)
  children: DriveItem[];

  @Index('IDX_drive_items_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'is_trashed', type: 'boolean', default: false })
  isTrashed: boolean;

  @Column({ name: 'trashed_at', type: 'timestamptz', nullable: true })
  trashedAt: Date | null;

  @Column({ name: 'is_starred', type: 'boolean', default: false })
  isStarred: boolean;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => DriveShare, (share) => share.item)
  shares: DriveShare[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

@Entity('drive_shares')
export class DriveShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_drive_shares_item_id')
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => DriveItem, (item) => item.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: DriveItem;

  @Index('IDX_drive_shares_shared_with_id')
  @Column({ name: 'shared_with_id', type: 'uuid' })
  sharedWithId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_id' })
  sharedWith: User;

  @Column({ name: 'shared_by_id', type: 'uuid' })
  sharedById: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_by_id' })
  sharedBy: User;

  @Column({ type: 'varchar', length: 10, default: 'viewer' })
  permission: DriveSharePermission;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
