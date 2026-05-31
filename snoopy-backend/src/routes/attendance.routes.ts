import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getAttendanceByDate, getMyAttendance, upsertAttendance, getAttendanceHistory } from '../services/attendance.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/attendance/my — Player: own history
router.get('/my', async (req: AuthRequest, res: Response) => {
  const records = await getMyAttendance(req.user!.user_id);
  res.json(ok(records));
});

// GET /api/attendance/history — Coach/Admin: full history with filters
router.get('/history', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  const { team_id, date_from, date_to, player_id } = req.query as Record<string, string>;
  const records = await getAttendanceHistory(req.user!, { team_id, date_from, date_to, player_id });
  res.json(ok(records));
});

// GET /api/attendance?date=&team_id= — today's attendance sheet
router.get('/', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  const { date, team_id } = req.query as Record<string, string>;
  if (!date || !team_id) {
    res.status(400).json(fail('VALIDATION_ERROR', 'กรุณาระบุ date และ team_id'));
    return;
  }
  try {
    const records = await getAttendanceByDate(date, team_id, req.user!);
    res.json(ok(records));
  } catch (e: any) {
    res.status(403).json(fail(e.code, e.message));
  }
});

// POST /api/attendance — single upsert
router.post('/', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    const record = await upsertAttendance(req.body, req.user!.user_id, req.user!);
    res.status(200).json(ok(record, 'Attendance check-in successful.'));
  } catch (e: any) {
    const status = e.code === 'RBAC_WRONG_TEAM' ? 403 : 400;
    res.status(status).json(fail(e.code, e.message));
  }
});

// PUT /api/attendance/:id — update existing record
router.put('/:id', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    const record = await upsertAttendance(req.body, req.user!.user_id, req.user!);
    res.json(ok(record, 'Attendance check updated successfully.'));
  } catch (e: any) {
    res.status(e.code === 'RBAC_WRONG_TEAM' ? 403 : 400).json(fail(e.code, e.message));
  }
});

export default router;
