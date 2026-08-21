/**
 * Hajj Services — BACKEND DESIGN (interfaces only, not yet wired).
 *
 * This file documents the intended NestJS/TypeORM contract for the Hajj module
 * so the frontend can be built against a stable shape. It is deliberately NOT an
 * ".entity.ts" file, so TypeORM's entity glob (which matches files ending in
 * .entity.ts) does not pick it up — nothing here affects the running app until a
 * real module is added.
 *
 * ── Planned endpoints ───────────────────────────────────────────────────────
 *   Public
 *     GET  /hajj/requirements          → RequirementDto[]      (the checklist)
 *     GET  /hajj/packages              → HajjPackageDto[]
 *     POST /hajj/apply                 → { id, status }        (CreateHajjApplicationDto)
 *     GET  /hajj/applications/:id      → HajjApplicationDto     (applicant status lookup)
 *   Admin (JwtAuthGuard + PermissionsGuard, e.g. Permission.HAJJ_VIEW / HAJJ_MANAGE)
 *     GET   /admin/hajj/applications           → HajjApplicationDto[]
 *     PATCH /admin/hajj/applications/:id/status
 *     CRUD  /admin/hajj/requirements           (manage the checklist, like funeral steps)
 *
 * Responses use the app's standard envelope: { success, data, timestamp }.
 */

export type HajjApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'completed';

/** A Hajj checklist requirement (admin-managed, like funeral steps). */
export interface Requirement {
  id: string;
  /** Stable key the frontend maps to i18n + an icon. */
  key: string;
  icon: string;
  /** Optional monetary amount (e.g. registration fee); null when free. */
  amount?: number;
  /** Currency of `amount`. */
  currency?: 'RWF' | 'USD';
  mandatory: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface HajjPackage {
  id: string;
  key: string;
  priceRwf: number;
  isActive: boolean;
}

/**
 * Intended TypeORM entity (design sketch). When implemented, move this into
 * `entities/hajj-application.entity.ts` and register it in the HajjModule.
 *
 *   @Entity('hajj_applications')
 *   export class HajjApplication {
 *     @PrimaryGeneratedColumn('uuid') id: string;
 *     @Column({ name: 'full_name' }) fullName: string;
 *     @Column() phone: string;                                 // 07XXXXXXXX
 *     @Column({ nullable: true }) email: string | null;
 *     @Column() district: string;
 *     @Column() sector: string;
 *     @Column({ name: 'passport_number' }) passportNumber: string;
 *     @Column({ name: 'registration_fee_proof' }) registrationFeeProof: string;
 *     @Column({ name: 'advance_payment_proof' }) advancePaymentProof: string;
 *     @Column({ default: 'submitted' }) status: HajjApplicationStatus;
 *     @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
 *     @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
 *   }
 */
export interface HajjApplication {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  district: string;
  sector: string;
  passportNumber: string;
  registrationFeeProof: string;
  advancePaymentProof: string;
  status: HajjApplicationStatus;
  createdAt: string;
  updatedAt: string;
}
