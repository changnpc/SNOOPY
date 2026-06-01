import { SHEETS } from '../config/sheets.config';
import { nowStr } from '../utils/date';
import { SheetRepository, TombstoneNote } from './base/sheet-repository';
import { Competition, CompetitionResult } from '../models';

/** Keep only whitelisted keys from a patch — guards against mass-assignment. */
function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// ── Repositories ──────────────────────────────────────────────────────────────

const compRepo = new SheetRepository<Competition>(
  SHEETS.COMPETITIONS, 'competition_id', 'COMP', 'COMPETITION_NOT_FOUND', 'ไม่พบรายการแข่งขัน',
);

const resultRepo = new SheetRepository<CompetitionResult>(
  SHEETS.COMPETITION_RESULTS, 'result_id', 'RES', 'RESULT_NOT_FOUND', 'ไม่พบผลการแข่งขัน',
);

// ── Competitions ──────────────────────────────────────────────────────────────

export async function getCompetitions(): Promise<Competition[]> {
  const all = await compRepo.findAll();
  return all.sort((a, b) => b.date_from.localeCompare(a.date_from)); // newest first
}

export async function getCompetitionById(id: string): Promise<Competition> {
  return (await compRepo.findOrThrow(id)).data;
}

export async function createCompetition(data: Partial<Competition>, createdBy: string): Promise<Competition> {
  const record: Competition = {
    competition_id: compRepo.newId(),
    name:           data.name!,
    level:          data.level ?? 'national',
    location:       data.location ?? '',
    date_from:      data.date_from!,
    date_to:        data.date_to!,
    organizer:      data.organizer ?? '',
    note:           data.note ?? '',
    created_by:     createdBy,
    created_at:     nowStr(),
    updated_at:     nowStr(),
  };
  return compRepo.insert(record);
}

// Fields a Coach/Admin may edit on a competition. Protects id/created_by/timestamps
// from mass-assignment via the raw request body.
const COMPETITION_EDITABLE = ['name', 'level', 'location', 'date_from', 'date_to', 'organizer', 'note'] as const;

export async function updateCompetition(id: string, data: Partial<Competition>): Promise<Competition> {
  return compRepo.update(id, pick(data, COMPETITION_EDITABLE));
}

export async function deleteCompetition(id: string): Promise<void> {
  // Soft-delete competition + cascade tombstone its results
  await compRepo.softDelete(id, TombstoneNote<Competition>(async (compId) => {
    const results = await getResultsByCompetition(compId);
    await Promise.all(results.map(r => resultRepo.softDelete(r.result_id, TombstoneNote<CompetitionResult>())));
  }));
}

// ── Competition Results ───────────────────────────────────────────────────────

export async function getResultsByCompetition(competitionId: string): Promise<CompetitionResult[]> {
  const all = await resultRepo.findAll();
  return all.filter(r => r.competition_id === competitionId && r.note !== '[DELETED]');
}

/** Player's own competition history (Approved only), joined with competition master data. */
export async function getMyResults(userId: string): Promise<Array<CompetitionResult & { competition: Competition | null }>> {
  const [allResults, allComps] = await Promise.all([
    resultRepo.findAll(),
    compRepo.findAll(),
  ]);
  const compMap = new Map(allComps.map(c => [c.competition_id, c]));
  return allResults
    .filter(r => r.user_id === userId && r.note !== '[DELETED]')
    .sort((a, b) => {
      const ca = compMap.get(a.competition_id);
      const cb = compMap.get(b.competition_id);
      return (cb?.date_from ?? '').localeCompare(ca?.date_from ?? '');
    })
    .map(r => ({ ...r, competition: compMap.get(r.competition_id) ?? null }));
}

/** All pending results — for Super Admin approval queue. */
export async function getPendingResults(): Promise<Array<CompetitionResult & { competition: Competition | null }>> {
  const [allResults, allComps] = await Promise.all([
    resultRepo.findAll(),
    compRepo.findAll(),
  ]);
  const compMap = new Map(allComps.map(c => [c.competition_id, c]));
  return allResults
    .filter(r => r.status === 'Pending' && r.note !== '[DELETED]')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(r => ({ ...r, competition: compMap.get(r.competition_id) ?? null }));
}

export async function approveResult(id: string): Promise<CompetitionResult> {
  return resultRepo.update(id, { status: 'Approved' });
}

export async function rejectResult(id: string): Promise<CompetitionResult> {
  return resultRepo.update(id, { status: 'Rejected' });
}

/** createdByRole: 'Super Admin' → Approved immediately; 'Player' → Pending */
export async function createResult(
  data: Partial<CompetitionResult>,
  createdBy: string,
  createdByRole: string,
): Promise<CompetitionResult> {
  const status: CompetitionResult['status'] = createdByRole === 'Super Admin' ? 'Approved' : 'Pending';
  const record: CompetitionResult = {
    result_id:        resultRepo.newId(),
    competition_id:   data.competition_id ?? '',
    competition_name: data.competition_name ?? data.competition_id ?? '',
    user_id:          data.user_id!,
    date_from:        data.date_from ?? '',
    date_to:          data.date_to ?? '',
    category:         data.category ?? '',
    rank:             data.rank ?? '',
    award:            data.award ?? '',
    score:            data.score ?? '',
    status,
    note:             data.note ?? '',
    created_by:       createdBy,
    created_at:       nowStr(),
    updated_at:       nowStr(),
  };
  return resultRepo.insert(record);
}

// Descriptive fields a Coach/Admin may edit. `status` is intentionally excluded —
// it can only change through approve()/reject() (Super-Admin-gated routes), so a
// raw body cannot smuggle {status:'Approved'} past RBAC.
const RESULT_EDITABLE = ['competition_name', 'date_from', 'date_to', 'category', 'rank', 'award', 'score', 'note'] as const;

export async function updateResult(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
  return resultRepo.update(id, pick(data, RESULT_EDITABLE));
}

export async function deleteResult(id: string): Promise<void> {
  await resultRepo.softDelete(id, TombstoneNote<CompetitionResult>());
}
