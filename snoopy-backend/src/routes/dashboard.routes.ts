import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { findAll } from '../services/google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { AttendanceStatus } from '../models';
import { ok } from '../models';

const router = Router();
router.use(authenticate);

interface AttendanceRecord { player_id: string; status: AttendanceStatus; }
interface CompetitionResult { user_id: string; competition_id: string; }
interface User { user_id: string; team_id?: string; th_first_name: string; th_last_name: string; en_first_name: string; en_last_name: string; img_avatar_url?: string; is_active: string; }

// ── Coach: team-wide summary (public — all roles can view for promotion) ──────
router.get('/coach', async (_req: AuthRequest, res: Response) => {
  const [attendance, results, users] = await Promise.all([
    findAll<AttendanceRecord>(SHEETS.ATTENDANCE),
    findAll<CompetitionResult>(SHEETS.COMPETITION_RESULTS),
    findAll<User>(SHEETS.USERS),
  ]);

  const active = users.filter(u => u.is_active === 'TRUE' || u.is_active === 'true');

  // Count attendance per player
  const countMap = new Map<string, { practice: number; absent: number; leave: number }>();
  for (const r of attendance) {
    if (!countMap.has(r.player_id)) countMap.set(r.player_id, { practice: 0, absent: 0, leave: 0 });
    const c = countMap.get(r.player_id)!;
    if (r.status === 'Present') c.practice++;
    else if (r.status === 'Absent') c.absent++;
    else if (r.status === 'Leave') c.leave++;
  }

  // Count competitions per player
  const compCount = new Map<string, Set<string>>();
  for (const r of results) {
    if (!compCount.has(r.user_id)) compCount.set(r.user_id, new Set());
    compCount.get(r.user_id)!.add(r.competition_id);
  }

  const data = active.map(u => ({
    user_id:        u.user_id,
    team_id:        u.team_id ?? '',
    th_name:        `${u.th_first_name} ${u.th_last_name}`,
    en_name:        `${u.en_first_name} ${u.en_last_name}`,
    img_avatar_url: u.img_avatar_url ?? '',
    practice_days:  countMap.get(u.user_id)?.practice  ?? 0,
    absent_days:    countMap.get(u.user_id)?.absent     ?? 0,
    leave_days:     countMap.get(u.user_id)?.leave      ?? 0,
    competition_count: compCount.get(u.user_id)?.size   ?? 0,
  }));

  res.json(ok(data));
});

// ── Player: my own stats ──────────────────────────────────────────────────────
router.get('/player', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.user_id;

  const [attendance, results] = await Promise.all([
    findAll<AttendanceRecord>(SHEETS.ATTENDANCE),
    findAll<CompetitionResult>(SHEETS.COMPETITION_RESULTS),
  ]);

  const myAtt = attendance.filter(r => r.player_id === userId);
  const practice  = myAtt.filter(r => r.status === 'Present').length;
  const absent    = myAtt.filter(r => r.status === 'Absent').length;
  const leave     = myAtt.filter(r => r.status === 'Leave').length;
  const competitions = new Set(results.filter(r => r.user_id === userId).map(r => r.competition_id)).size;

  res.json(ok({ practice_days: practice, absent_days: absent, leave_days: leave, competition_count: competitions }));
});

export default router;
