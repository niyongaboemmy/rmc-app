import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('blog_categories')
export class BlogCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 280, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'featured_image', type: 'varchar', length: 500, nullable: true })
  featuredImage: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => BlogCategory, { nullable: true, eager: true })
  @JoinColumn({ name: 'category_id' })
  category: BlogCategory | null;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'seo_title', type: 'varchar', length: 255, nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
