import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getAllTeams, getSubTeams, getTeamById, createTeam, updateTeam, deleteTeam } from '../services/teams.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/teams?include_sub=true
router.get('/', async (req: AuthRequest, res: Response) => {
  const includeSub = req.query['include_sub'] === 'true' || req.query['include_sub'] === '1';
  const teams = await getAllTeams(includeSub);
  res.json(ok(teams));
});

// GET /api/teams/:id/sub-teams
router.get('/:id/sub-teams', async (req, res: Response) => {
  const subs = await getSubTeams(req.params['id']);
  res.json(ok(subs));
});

// GET /api/teams/:id
router.get('/:id', async (req, res: Response) => {
  const team = await getTeamById(req.params['id']);
  if (!team) { res.status(404).json(fail('TEAM_NOT_FOUND', 'Team not found.')); return; }
  res.json(ok(team));
});

// POST /api/teams — Super Admin only
// Body: { team_name, description?, parent_team_id? }
router.post('/', requireRole('Super Admin'), async (req: AuthRequest, res: Response) => {
  const { team_name, description, parent_team_id } = req.body;
  if (!team_name) { res.status(400).json(fail('VALIDATION_ERROR', 'Please specify the team name.')); return; }
  try {
    const team = await createTeam({ team_name, description, parent_team_id: parent_team_id || undefined });
    res.status(201).json(ok(team, 'Created a team successfully.'));
  } catch (e: any) {
    const status = e.code === 'PARENT_TEAM_NOT_FOUND' ? 404 : e.code === 'CANNOT_NEST_SUB_TEAMS' ? 400 : 500;
    res.status(status).json(fail(e.code ?? 'SERVER_ERROR', e.message));
  }
});

// PUT /api/teams/:id — Super Admin only
router.put('/:id', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    const team = await updateTeam(req.params['id'], req.body);
    res.json(ok(team, 'Edited a team successfully'));
  } catch (e: any) {
    res.status(e.code === 'TEAM_NOT_FOUND' ? 404 : 500).json(fail(e.code ?? 'SERVER_ERROR', e.message));
  }
});

// DELETE /api/teams/:id — Super Admin only
router.delete('/:id', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await deleteTeam(req.params['id']);
    res.status(204).send();
  } catch (e: any) {
    const status = e.code === 'TEAM_NOT_FOUND' ? 404
      : (e.code === 'TEAM_HAS_MEMBERS' || e.code === 'TEAM_HAS_SUB_TEAMS') ? 409
      : 500;
    res.status(status).json(fail(e.code ?? 'SERVER_ERROR', e.message));
  }
});

export default router;
