/**
 * Funeral Services API client.
 *
 * The requests lifecycle is backed by the real NestJS funeral module. Reference
 * data that doesn't have a backend yet (announcements) still resolves from the
 * mock data — swap those for `apiClient` calls as their modules land.
 */

import { apiClient } from './api';
import type {
  FuneralRequestPayload,
  FuneralAnnouncement,
  FuneralRequest,
  FuneralStage,
  FuneralStepConfig,
  FuneralSkillConfig,
  Cemetery,
  Volunteer,
  VolunteerTask,
} from '@/components/funeral/types';

export type CemeteryPayload = Omit<Cemetery, 'id'>;
export type AnnouncementPayload = Omit<FuneralAnnouncement, 'id'>;
export type VolunteerPayload = Pick<Volunteer, 'name' | 'phone' | 'mosqueId' | 'skills'>;

export interface StepInput {
  key?: string;
  titleEn?: string;
  titleRw?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  sortOrder?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
}

export interface SkillInput {
  key?: string;
  labelEn?: string;
  labelRw?: string;
  labelAr?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface FuneralRequestResult {
  id: string;
  reference: string;
  status: 'received';
}

export interface FuneralStatsResult {
  total: number;
  pending: number;
  completed: number;
  byStage: Record<FuneralStage, number>;
}

export const funeralApi = {
  // ── Public ──────────────────────────────────────────────────────────────
  /** Submit a new funeral service request. */
  async submitRequest(payload: FuneralRequestPayload): Promise<FuneralRequestResult> {
    const { data } = await apiClient.post('/funeral/requests', payload);
    return data.data ?? data;
  },

  /** Look up a request by its reference for the public status page. */
  async getRequestByReference(reference: string): Promise<FuneralRequest | null> {
    try {
      const { data } = await apiClient.get(`/funeral/requests/by-reference/${encodeURIComponent(reference.trim())}`);
      // The envelope is { data: <request|null> }; a null payload means "not found".
      // (Do NOT fall back to the envelope itself, or a not-found reads as found.)
      return data?.data ?? null;
    } catch {
      return null;
    }
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  /** List funeral requests (admin). */
  async listRequests(params?: { stage?: string; search?: string }): Promise<FuneralRequest[]> {
    const { data } = await apiClient.get('/admin/funeral/requests', { params });
    return data.data ?? data;
  },

  /** Fetch a single request by id (admin). */
  async getRequest(id: string): Promise<FuneralRequest> {
    const { data } = await apiClient.get(`/admin/funeral/requests/${id}`);
    return data.data ?? data;
  },

  /** Move a request to a new stage (admin). Returns the updated request. */
  async updateRequestStage(id: string, stage: FuneralStage, notes?: string): Promise<FuneralRequest> {
    const { data } = await apiClient.patch(`/admin/funeral/requests/${id}/stage`, { stage, notes });
    return data.data ?? data;
  },

  /** Headline request figures (admin). */
  async getStats(): Promise<FuneralStatsResult> {
    const { data } = await apiClient.get('/admin/funeral/stats');
    return data.data ?? data;
  },

  // ── Cemeteries ────────────────────────────────────────────────────────────
  /** List cemeteries (public directory + admin). */
  async listCemeteries(): Promise<Cemetery[]> {
    const { data } = await apiClient.get('/funeral/cemeteries');
    return data.data ?? data;
  },

  /** Create a cemetery (admin). */
  async createCemetery(payload: CemeteryPayload): Promise<Cemetery> {
    const { data } = await apiClient.post('/admin/funeral/cemeteries', payload);
    return data.data ?? data;
  },

  /** Update a cemetery (admin). */
  async updateCemetery(id: string, payload: CemeteryPayload): Promise<Cemetery> {
    const { data } = await apiClient.patch(`/admin/funeral/cemeteries/${id}`, payload);
    return data.data ?? data;
  },

  /** Delete a cemetery (admin). */
  async deleteCemetery(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/cemeteries/${id}`);
  },

  // ── Announcements ─────────────────────────────────────────────────────────
  /** Public funeral announcements (janāzah notices). */
  async listAnnouncements(): Promise<FuneralAnnouncement[]> {
    const { data } = await apiClient.get('/funeral/announcements');
    return data.data ?? data;
  },

  /** Create an announcement (admin). */
  async createAnnouncement(payload: AnnouncementPayload): Promise<FuneralAnnouncement> {
    const { data } = await apiClient.post('/admin/funeral/announcements', payload);
    return data.data ?? data;
  },

  /** Update an announcement (admin). */
  async updateAnnouncement(id: string, payload: AnnouncementPayload): Promise<FuneralAnnouncement> {
    const { data } = await apiClient.patch(`/admin/funeral/announcements/${id}`, payload);
    return data.data ?? data;
  },

  /** Delete an announcement (admin). */
  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/announcements/${id}`);
  },

  // ── Volunteers ────────────────────────────────────────────────────────────
  /** List funeral volunteers (public roster + admin). */
  async listVolunteers(): Promise<Volunteer[]> {
    const { data } = await apiClient.get('/funeral/volunteers');
    return data.data ?? data;
  },

  /** Add a volunteer (admin). */
  async createVolunteer(payload: VolunteerPayload): Promise<Volunteer> {
    const { data } = await apiClient.post('/admin/funeral/volunteers', payload);
    return data.data ?? data;
  },

  /** Update a volunteer (admin). */
  async updateVolunteer(id: string, payload: VolunteerPayload): Promise<Volunteer> {
    const { data } = await apiClient.patch(`/admin/funeral/volunteers/${id}`, payload);
    return data.data ?? data;
  },

  /** Remove a volunteer (admin). */
  async deleteVolunteer(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/volunteers/${id}`);
  },

  /** Assign a volunteer to a funeral + task (admin). */
  async assignVolunteer(id: string, task: VolunteerTask, requestId: string): Promise<Volunteer> {
    const { data } = await apiClient.patch(`/admin/funeral/volunteers/${id}/assign`, { task, requestId });
    return data.data ?? data;
  },

  /** Unassign a volunteer (admin). */
  async unassignVolunteer(id: string): Promise<Volunteer> {
    const { data } = await apiClient.patch(`/admin/funeral/volunteers/${id}/unassign`);
    return data.data ?? data;
  },

  // ── Lifecycle steps (CMS) ─────────────────────────────────────────────────
  /** Active lifecycle steps (public — drives the status timeline). */
  async listSteps(): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.get('/funeral/steps');
    return data.data ?? data;
  },

  /** All steps incl. inactive (admin). */
  async adminListSteps(): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.get('/admin/funeral/steps');
    return data.data ?? data;
  },

  async createStep(payload: StepInput): Promise<FuneralStepConfig> {
    const { data } = await apiClient.post('/admin/funeral/steps', payload);
    return data.data ?? data;
  },

  async updateStep(id: string, payload: StepInput): Promise<FuneralStepConfig> {
    const { data } = await apiClient.patch(`/admin/funeral/steps/${id}`, payload);
    return data.data ?? data;
  },

  async deleteStep(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/steps/${id}`);
  },

  /** Persist a new step order (ids in display order). */
  async reorderSteps(ids: string[]): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.patch('/admin/funeral/steps/reorder', { ids });
    return data.data ?? data;
  },

  // ── Attendant skills (CMS) ────────────────────────────────────────────────
  /** Active skills (public — drives volunteer forms/cards). */
  async listSkills(): Promise<FuneralSkillConfig[]> {
    const { data } = await apiClient.get('/funeral/skills');
    return data.data ?? data;
  },

  /** All skills incl. inactive (admin). */
  async adminListSkills(): Promise<FuneralSkillConfig[]> {
    const { data } = await apiClient.get('/admin/funeral/skills');
    return data.data ?? data;
  },

  async createSkill(payload: SkillInput): Promise<FuneralSkillConfig> {
    const { data } = await apiClient.post('/admin/funeral/skills', payload);
    return data.data ?? data;
  },

  async updateSkill(id: string, payload: SkillInput): Promise<FuneralSkillConfig> {
    const { data } = await apiClient.patch(`/admin/funeral/skills/${id}`, payload);
    return data.data ?? data;
  },

  async deleteSkill(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/skills/${id}`);
  },

  async reorderSkills(ids: string[]): Promise<FuneralSkillConfig[]> {
    const { data } = await apiClient.patch('/admin/funeral/skills/reorder', { ids });
    return data.data ?? data;
  },
};
