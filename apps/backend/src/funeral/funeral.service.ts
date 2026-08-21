import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PublicUploadService } from '../integrations/storage/public-upload.service';
import { FuneralRequest } from './entities/funeral-request.entity';
import { FuneralStatusHistory } from './entities/funeral-status-history.entity';
import { FuneralStep } from './entities/funeral-step.entity';
import { Cemetery } from './entities/cemetery.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { CreateFuneralRequestDto } from './dto/create-funeral-request.dto';
import { UpdateFuneralStageDto } from './dto/update-funeral-stage.dto';
import { toXlsxBuffer, formatDate, formatDateTime } from '../common/utils/xlsx';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ListFilters {
  stage?: string;
  search?: string;
}

/** Keys of the exported rows, in column order. */
const FUNERAL_EXPORT_COLUMNS = [
  'Deceased Name',
  'Gender',
  'Date of Birth',
  'Date of Death',
  'National ID',
  'Place of Death',
  'Cause of Death',
  'Death Certificate',
  'Next of Kin',
  'Phone',
  'Email',
  'Address',
  'Emergency Contact',
  'Preferred Mosque',
  'Preferred Cemetery',
  'Preferred Burial Date',
  'Preferred Burial Time',
  'Transport Required',
  'Arrangement Notes',
  'Stage',
  'Progress',
  'Reported At',
];

@Injectable()
export class FuneralService {
  constructor(
    @InjectRepository(FuneralRequest)
    private readonly requests: Repository<FuneralRequest>,
    @InjectRepository(FuneralStatusHistory)
    private readonly history: Repository<FuneralStatusHistory>,
    @InjectRepository(Mosque)
    private readonly mosques: Repository<Mosque>,
    @InjectRepository(Cemetery)
    private readonly cemeteries: Repository<Cemetery>,
    @InjectRepository(FuneralStep)
    private readonly steps: Repository<FuneralStep>,
    private readonly storage: PublicUploadService,
  ) {}

  /**
   * Load the uploaded death certificate so an admin can inspect the real document.
   *
   * Legacy requests hold only a filename the browser typed, with no file behind it —
   * they have no mime type, and are rejected here rather than 404ing confusingly.
   */
  async adminGetDeathCertificate(
    requestId: string,
  ): Promise<{ fileName: string; buffer: Buffer; mimeType: string }> {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Funeral request not found');
    if (!request.deathCertificate) {
      throw new NotFoundException('No death certificate was attached to this report');
    }
    if (!request.deathCertificateMime) {
      throw new NotFoundException(
        'This report predates file uploads — only a filename was recorded, there is no document to open.',
      );
    }

    const { buffer, mimeType } = await this.storage.fetch(request.deathCertificate);
    return {
      fileName: request.deathCertificateName ?? 'death-certificate',
      buffer,
      mimeType,
    };
  }

  /** All non-deleted steps, ordered — the base for timelines. */
  private orderedSteps(): Promise<FuneralStep[]> {
    return this.steps.find({ order: { sortOrder: 'ASC' } });
  }

  /** Active steps, ordered — the live lifecycle. */
  private activeSteps(all: FuneralStep[]): FuneralStep[] {
    return all.filter((s) => s.isActive);
  }

  /** Resolve preferred-mosque ids to names (id → name); ignores non-UUID/legacy values. */
  private async mosqueNames(values: (string | null | undefined)[]): Promise<Map<string, string>> {
    const ids = [...new Set(values.filter((v): v is string => !!v && UUID_RE.test(v)))];
    if (ids.length === 0) return new Map();
    const rows = await this.mosques.find({ where: { id: In(ids) }, select: ['id', 'name'] });
    return new Map(rows.map((m) => [m.id, m.name]));
  }

  /** Resolve preferred-cemetery ids to names; ignores non-UUID/legacy values. */
  private async cemeteryNames(values: (string | null | undefined)[]): Promise<Map<string, string>> {
    const ids = [...new Set(values.filter((v): v is string => !!v && UUID_RE.test(v)))];
    if (ids.length === 0) return new Map();
    const rows = await this.cemeteries.find({ where: { id: In(ids) }, select: ['id', 'name'] });
    return new Map(rows.map((c) => [c.id, c.name]));
  }

  /** Submit a new funeral request. Starts at the "reported" stage. */
  async submit(dto: CreateFuneralRequestDto): Promise<{ id: string; status: 'received' }> {
    const { deceased, family, arrangements } = dto;

    // Date sanity: death cannot be in the future; burial cannot precede death.
    const today = new Date().toISOString().slice(0, 10);
    if (deceased.dateOfDeath && deceased.dateOfDeath.slice(0, 10) > today) {
      throw new BadRequestException('Date of death cannot be in the future');
    }
    if (deceased.dateOfBirth && deceased.dateOfDeath
      && deceased.dateOfBirth.slice(0, 10) > deceased.dateOfDeath.slice(0, 10)) {
      throw new BadRequestException('Date of birth must be before the date of death');
    }
    if (arrangements.preferredBurialDate && deceased.dateOfDeath
      && arrangements.preferredBurialDate.slice(0, 10) < deceased.dateOfDeath.slice(0, 10)) {
      throw new BadRequestException('Burial date cannot be before the date of death');
    }

    // Empty strings (the form's default for untouched optional fields) must
    // become null — notably for the date columns, which reject ''.
    const orNull = (v?: string | null) => (v && String(v).trim() ? v : null);
    // Store phones canonically as local 07XXXXXXXX (accepts +250/250 input).
    const normPhone = (v?: string | null) => {
      const d = (v ?? '').replace(/\D/g, '');
      return d.startsWith('250') ? `0${d.slice(3)}` : d;
    };
    // New requests start at the first active lifecycle step.
    const first = await this.steps.findOne({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
    const initialStage = first?.key ?? 'reported';

    const entity = this.requests.create({
      deceasedFullName: deceased.fullName,
      deceasedGender: deceased.gender,
      deceasedDateOfBirth: orNull(deceased.dateOfBirth),
      deceasedDateOfDeath: deceased.dateOfDeath,
      deceasedNationalId: orNull(deceased.nationalId),
      deceasedPlaceOfDeath: orNull(deceased.placeOfDeath),
      deceasedCauseOfDeath: orNull(deceased.causeOfDeath),
      deathCertificate: orNull(deceased.deathCertificate),
      deathCertificateName: orNull(deceased.deathCertificateName),
      deathCertificateMime: orNull(deceased.deathCertificateMime),
      deathCertificateSize: deceased.deathCertificateSize ?? null,
      familyNextOfKin: family.nextOfKin,
      familyPhone: normPhone(family.phone),
      familyEmail: orNull(family.email),
      familyAddress: orNull(family.address),
      familyEmergencyContact: family.emergencyContact ? normPhone(family.emergencyContact) : null,
      arrPreferredMosque: orNull(arrangements.preferredMosque),
      arrPreferredCemetery: orNull(arrangements.preferredCemetery),
      arrPreferredBurialDate: orNull(arrangements.preferredBurialDate),
      arrPreferredBurialTime: orNull(arrangements.preferredBurialTime),
      arrTransportationRequired: arrangements.transportationRequired ?? false,
      arrNotes: orNull(arrangements.notes),
      stage: initialStage,
    });
    const saved = await this.requests.save(entity);
    await this.history.save(this.history.create({ requestId: saved.id, stage: initialStage, notes: 'Request received.' }));

    return { id: saved.id, status: 'received' };
  }

  /** Admin list (newest first) with optional stage/search filters. */
  async findAll(filters: ListFilters = {}) {
    const qb = this.requests.createQueryBuilder('r')
      .leftJoinAndSelect('r.statusHistory', 'h')
      .orderBy('r.created_at', 'DESC');

    if (filters.stage) qb.andWhere('r.stage = :stage', { stage: filters.stage });
    if (filters.search) {
      qb.andWhere('LOWER(r.deceased_full_name) LIKE :q', {
        q: `%${filters.search.toLowerCase()}%`,
      });
    }

    const items = await qb.getMany();
    const [mosques, cemeteries, steps] = await Promise.all([
      this.mosqueNames(items.map((r) => r.arrPreferredMosque)),
      this.cemeteryNames(items.map((r) => r.arrPreferredCemetery)),
      this.orderedSteps(),
    ]);
    return items.map((r) => this.toDto(r, steps, mosques, cemeteries));
  }

  /**
   * The admin list as an .xlsx report, honouring the same stage/search filters — so
   * a filtered export matches what the admin is actually looking at.
   *
   * Deliberately far wider than the on-screen table: the table is a triage view, but
   * a report is what gets handed to someone who cannot open the app, so it carries
   * the whole request (deceased, family, arrangements) rather than five columns.
   */
  async exportXlsx(filters: ListFilters = {}): Promise<Buffer> {
    const [requests, steps] = await Promise.all([this.findAll(filters), this.orderedSteps()]);
    const titleByKey = new Map(steps.map((s) => [s.key, s.titleEn]));

    const rows = requests.map((r) => {
      // Same definition the admin UI shows, so the report can't contradict the screen.
      const done = r.timeline.filter((s) => s.status === 'done').length;
      const progress = r.timeline.length ? Math.round((done / r.timeline.length) * 100) : 0;

      return {
        'Deceased Name': r.deceased.fullName,
        Gender: r.deceased.gender,
        'Date of Birth': formatDate(r.deceased.dateOfBirth),
        'Date of Death': formatDate(r.deceased.dateOfDeath),
        'National ID': r.deceased.nationalId,
        'Place of Death': r.deceased.placeOfDeath,
        'Cause of Death': r.deceased.causeOfDeath ?? '',
        // Legacy rows hold a bare filename with no file behind it — saying "Attached"
        // would send someone looking for a document that does not exist.
        'Death Certificate': r.deceased.deathCertificateMime ? 'Attached' : 'Not attached',
        'Next of Kin': r.family.nextOfKin,
        Phone: r.family.phone,
        Email: r.family.email ?? '',
        Address: r.family.address,
        'Emergency Contact': r.family.emergencyContact ?? '',
        'Preferred Mosque': r.arrangements.preferredMosque ?? '',
        'Preferred Cemetery': r.arrangements.preferredCemetery ?? '',
        'Preferred Burial Date': formatDate(r.arrangements.preferredBurialDate),
        'Preferred Burial Time': r.arrangements.preferredBurialTime ?? '',
        'Transport Required': r.arrangements.transportationRequired ? 'Yes' : 'No',
        'Arrangement Notes': r.arrangements.notes ?? '',
        Stage: titleByKey.get(r.stage) ?? r.stage,
        Progress: `${progress}%`,
        'Reported At': formatDateTime(r.createdAt),
      };
    });

    return toXlsxBuffer('Funeral Requests', FUNERAL_EXPORT_COLUMNS, rows);
  }

  async findOne(id: string) {
    const entity = await this.requests.findOne({ where: { id }, relations: ['statusHistory'] });
    if (!entity) throw new NotFoundException('Funeral request not found');
    const [mosques, cemeteries, steps] = await Promise.all([
      this.mosqueNames([entity.arrPreferredMosque]),
      this.cemeteryNames([entity.arrPreferredCemetery]),
      this.orderedSteps(),
    ]);
    return this.toDto(entity, steps, mosques, cemeteries);
  }

  /** Move a request to a new stage and log the transition. */
  async updateStage(id: string, dto: UpdateFuneralStageDto, userId?: string) {
    const entity = await this.requests.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Funeral request not found');

    const step = await this.steps.findOne({ where: { key: dto.stage } });
    if (!step) throw new BadRequestException(`Unknown step "${dto.stage}"`);

    entity.stage = dto.stage;
    await this.requests.save(entity);
    await this.history.save(this.history.create({
      requestId: entity.id,
      stage: dto.stage,
      notes: dto.notes ?? null,
      assignedVolunteer: dto.assignedVolunteer ?? null,
      changedBy: userId ?? null,
    }));

    return this.findOne(id);
  }

  /** Headline request figures for the admin dashboard. */
  async getStats() {
    const [all, steps] = await Promise.all([
      this.requests.find({ select: ['stage'] }),
      this.orderedSteps(),
    ]);
    const active = this.activeSteps(steps);
    const terminalKey = active.length ? active[active.length - 1].key : undefined;
    const byStage = Object.fromEntries(active.map((s) => [s.key, 0])) as Record<string, number>;
    for (const r of all) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
    const completed = terminalKey ? all.filter((r) => r.stage === terminalKey).length : 0;
    return {
      total: all.length,
      pending: all.length - completed,
      completed,
      terminalKey,
      byStage,
    };
  }

  /** Map an entity to the shape the frontend expects (nested + computed timeline). */
  private toDto(r: FuneralRequest, steps: FuneralStep[], mosqueNames?: Map<string, string>, cemeteryNames?: Map<string, string>) {
    // Timeline = active steps, plus the request's current step if it has since
    // been deactivated/removed (so progress is always shown), in sort order.
    const timelineSteps = steps
      .filter((s) => s.isActive || s.key === r.stage)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIdx = timelineSteps.findIndex((s) => s.key === r.stage);
    const lastIdx = timelineSteps.length - 1;

    // Latest history entry per stage, for timestamps/notes on the timeline.
    const latest = new Map<string, FuneralStatusHistory>();
    for (const h of (r.statusHistory ?? []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))) {
      latest.set(h.stage, h);
    }

    const timeline = timelineSteps.map((s, i) => {
      const status = currentIdx === -1
        ? 'pending'
        : i < currentIdx ? 'done' : i === currentIdx ? (i === lastIdx ? 'done' : 'active') : 'pending';
      const h = latest.get(s.key);
      return {
        stage: s.key,
        status,
        timestamp: h ? new Date(h.createdAt).toISOString() : undefined,
        assignedVolunteer: h?.assignedVolunteer ?? undefined,
        notes: h?.notes ?? undefined,
      };
    });

    return {
      id: r.id,
      stage: r.stage,
      createdAt: new Date(r.createdAt).toISOString(),
      deceased: {
        fullName: r.deceasedFullName,
        gender: r.deceasedGender,
        dateOfBirth: r.deceasedDateOfBirth ?? '',
        dateOfDeath: r.deceasedDateOfDeath,
        nationalId: r.deceasedNationalId ?? '',
        placeOfDeath: r.deceasedPlaceOfDeath ?? '',
        causeOfDeath: r.deceasedCauseOfDeath ?? undefined,
        deathCertificate: r.deathCertificate ?? undefined,
        deathCertificateName: r.deathCertificateName ?? undefined,
        // Only a real upload has a mime type — legacy rows hold a bare filename.
        deathCertificateMime: r.deathCertificateMime ?? undefined,
        deathCertificateSize: r.deathCertificateSize ?? undefined,
      },
      family: {
        nextOfKin: r.familyNextOfKin,
        phone: r.familyPhone,
        email: r.familyEmail ?? undefined,
        address: r.familyAddress ?? '',
        emergencyContact: r.familyEmergencyContact ?? undefined,
      },
      arrangements: {
        // Stored value is the mosque id; expose the resolved name for display
        // (falling back to the raw value for legacy/free-text data) plus the id.
        preferredMosque: (r.arrPreferredMosque && mosqueNames?.get(r.arrPreferredMosque)) ?? r.arrPreferredMosque ?? undefined,
        preferredMosqueId: r.arrPreferredMosque ?? undefined,
        preferredCemetery: (r.arrPreferredCemetery && cemeteryNames?.get(r.arrPreferredCemetery)) ?? r.arrPreferredCemetery ?? undefined,
        preferredCemeteryId: r.arrPreferredCemetery ?? undefined,
        preferredBurialDate: r.arrPreferredBurialDate ?? undefined,
        preferredBurialTime: r.arrPreferredBurialTime ?? undefined,
        transportationRequired: r.arrTransportationRequired,
        notes: r.arrNotes ?? undefined,
      },
      timeline,
    };
  }
}
