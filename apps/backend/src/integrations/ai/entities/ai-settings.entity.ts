import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Single-row table holding the site-wide "Ask AI" assistant configuration.
 * The site admin manages this from the admin UI — API keys are stored
 * AES-256-GCM encrypted and never leave the backend.
 */
@Entity('ai_settings')
export class AiSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Which provider the assistant uses: 'gemini' | 'openai'. */
  @Column({ name: 'default_provider', type: 'varchar', length: 20, default: 'gemini' })
  defaultProvider: string;

  /** OpenAI API key — stored AES-256-GCM encrypted ('' when not set). */
  @Column({ name: 'openai_key_enc', type: 'text', default: '' })
  openaiKeyEnc: string;

  /** Google Gemini API key — stored AES-256-GCM encrypted ('' when not set). */
  @Column({ name: 'gemini_key_enc', type: 'text', default: '' })
  geminiKeyEnc: string;

  /** Model used when the OpenAI provider is selected. */
  @Column({ name: 'openai_model', type: 'varchar', length: 80, default: 'gpt-4o-mini' })
  openaiModel: string;

  /** Model used when the Gemini provider is selected. */
  @Column({ name: 'gemini_model', type: 'varchar', length: 80, default: 'gemini-2.5-flash' })
  geminiModel: string;

  /** Whether the assistant is enabled on the public site. */
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
