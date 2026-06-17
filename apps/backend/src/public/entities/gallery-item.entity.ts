import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gallery_items')
export class GalleryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'thumbnail_key', type: 'varchar', length: 500, nullable: true })
  thumbnailKey: string | null;

  @Column({ name: 'medium_key', type: 'varchar', length: 500, nullable: true })
  mediumKey: string | null;

  @Column({ name: 'file_type', type: 'varchar', length: 20, default: 'image' })
  fileType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
