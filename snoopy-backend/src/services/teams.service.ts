import { findAll } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { Team } from '../models';
import { nowStr } from '../utils/date';
import { SheetRepository } from './base/sheet-repository';

const repo = new SheetRepository<Team>(SHEETS.TEAMS, 'team_id', 'T', 'TEAM_NOT_FOUND', 'TEAM_NOT_FOUND');

// ─── Get all active teams ─────────────────────────────────────
// By default returns only big teams (parent_team_id empty/null).
// Pass include_sub: true to get all teams.
export async function getAllTeams(include_sub = false): Promise<Team[]> {
  const teams = await findAll<Team>(SHEETS.TEAMS, true); // cached
  const active = teams.filter(t => String(t.is_active).toUpperCase() === 'TRUE');
  if (include_sub) return active;
  return active.filter(t => !t.parent_team_id);
}

// ─── Get sub-teams of a big team ─────────────────────────────
export async function getSubTeams(parentTeamId: string): Promise<Team[]> {
  const teams = await findAll<Team>(SHEETS.TEAMS, true);
  return teams.filter(t =>
    String(t.is_active).toUpperCase() === 'TRUE' &&
    t.parent_team_id === parentTeamId
  );
}

// ─── Get single team ──────────────────────────────────────────
export async function getTeamById(teamId: string): Promise<Team | null> {
  const found = await repo.find(teamId);
  return found?.data ?? null;
}

// ─── Create team / sub-team ───────────────────────────────────
export async function createTeam(data: {
  team_name: string;
  description?: string;
  parent_team_id?: string;
}): Promise<Team> {
  // If creating a sub-team, verify parent exists
  if (data.parent_team_id) {
    const parent = await getTeamById(data.parent_team_id);
    if (!parent) throw Object.assign(new Error('PARENT_TEAM_NOT_FOUND'), { code: 'PARENT_TEAM_NOT_FOUND' });
    // Sub-teams cannot be nested further
    if (parent.parent_team_id) throw Object.assign(new Error('CANNOT_NEST_SUB_TEAMS'), { code: 'CANNOT_NEST_SUB_TEAMS' });
  }

  const team: Team = {
    team_id:        repo.newId(),
    team_name:      data.team_name,
    description:    data.description ?? '',
    parent_team_id: data.parent_team_id ?? '',
    is_active:      true,
    created_at:     nowStr(),
    updated_at:     nowStr(),
  };
  return repo.insert(team);
}

// ─── Update team ──────────────────────────────────────────────
export async function updateTeam(
  teamId: string,
  data: Partial<Pick<Team, 'team_name' | 'description' | 'is_active' | 'parent_team_id'>>
): Promise<Team> {
  return repo.update(teamId, data);
}

// ─── Delete team (soft) ───────────────────────────────────────
export async function deleteTeam(teamId: string): Promise<void> {
  const { findMany } = await import('./google-sheets.service');

  // Check has active members (team_id or sub_team_id)
  const membersByTeam    = await findMany(SHEETS.USERS, { team_id: teamId, is_active: 'TRUE' });
  const membersBySub     = await findMany(SHEETS.USERS, { sub_team_id: teamId, is_active: 'TRUE' });
  if (membersByTeam.length > 0 || membersBySub.length > 0) {
    throw Object.assign(new Error('TEAM_HAS_MEMBERS'), { code: 'TEAM_HAS_MEMBERS' });
  }

  // Check for active sub-teams (if this is a big team)
  const subTeams = await getSubTeams(teamId);
  if (subTeams.length > 0) {
    throw Object.assign(new Error('TEAM_HAS_SUB_TEAMS'), { code: 'TEAM_HAS_SUB_TEAMS' });
  }

  await updateTeam(teamId, { is_active: false });
}
