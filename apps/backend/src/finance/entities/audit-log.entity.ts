import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_audit_log_entity_type')
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Index('IDX_audit_log_entity_id')
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Index('IDX_audit_log_actor_id')
  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 20 })
  actorRole: string;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Index('IDX_audit_log_performed_at')
  @Column({ name: 'performed_at', type: 'timestamptz' })
  performedAt: Date;
}
