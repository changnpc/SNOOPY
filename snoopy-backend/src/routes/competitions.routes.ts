import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  getCompetitions, getCompetitionById, createCompetition, updateCompetition, deleteCompetition,
  getResultsByCompetition, getMyResults, getPendingResults, createResult, updateResult, deleteResult,
  approveResult, rejectResult,
} from '../services/competitions.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// ── Competitions (public read, coach/admin write) ─────────────────────────────

router.get('/', async (_req, res: Response) => {
  res.json(ok(await getCompetitions()));
});

router.get('/my-results', async (req: AuthRequest, res: Response) => {
  res.json(ok(await getMyResults(req.user!.user_id)));
});

router.get('/results/pending', requireRole('Super Admin'), async (_req, res: Response) => {
  res.json(ok(await getPendingResults()));
});

router.get('/:id', async (req, res: Response) => {
  try {
    res.json(ok(await getCompetitionById(req.params['id'])));
  } catch (e: any) {
    res.status(404).json(fail(e.code, e.message));
  }
});

router.get('/:id/results', async (req, res: Response) => {
  res.json(ok(await getResultsByCompetition(req.params['id'])));
});

router.post('/', requireRole('Coach', 'Super Admin'), async (req: AuthRequest, res: Response) => {
  try {
    const comp = await createCompetition(req.body, req.user!.user_id);
    res.status(201).json(ok(comp, 'สร้างรายการแข่งขันสำเร็จ'));
  } catch (e: any) {
    res.status(400).json(fail(e.code ?? 'BAD_REQUEST', e.message));
  }
});

router.put('/:id', requireRole('Coach', 'Super Admin'), async (req, res: Response) => {
  try {
    res.json(ok(await updateCompetition(req.params['id'], req.body), 'แก้ไขสำเร็จ'));
  } catch (e: any) {
    res.status(e.code === 'COMPETITION_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

router.delete('/:id', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await deleteCompetition(req.params['id']);
    res.status(204).send();
  } catch (e: any) {
    res.status(e.code === 'COMPETITION_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

// ── Results ───────────────────────────────────────────────────────────────────

// Player/Admin can create; Coach cannot
router.post('/results', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === 'Coach') return res.status(403).json(fail('FORBIDDEN', 'Coach ไม่มีสิทธิ์เพิ่มผลการแข่งขัน'));
    // Player can only submit for themselves
    if (user.role === 'Player') req.body.user_id = user.user_id;
    const result = await createResult(req.body, user.user_id, user.role);
    const msg = user.role === 'Super Admin' ? 'บันทึกผลการแข่งขันสำเร็จ' : 'ส่งคำขอสำเร็จ รอ Admin อนุมัติ';
    res.status(201).json(ok(result, msg));
  } catch (e: any) {
    res.status(400).json(fail(e.code ?? 'BAD_REQUEST', e.message));
  }
});

router.post('/results/:id/approve', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    res.json(ok(await approveResult(req.params['id']), 'อนุมัติแล้ว'));
  } catch (e: any) {
    res.status(404).json(fail(e.code, e.message));
  }
});

router.post('/results/:id/reject', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    res.json(ok(await rejectResult(req.params['id']), 'ปฏิเสธแล้ว'));
  } catch (e: any) {
    res.status(404).json(fail(e.code, e.message));
  }
});

router.put('/results/:id', requireRole('Coach', 'Super Admin'), async (req, res: Response) => {
  try {
    res.json(ok(await updateResult(req.params['id'], req.body), 'แก้ไขสำเร็จ'));
  } catch (e: any) {
    res.status(e.code === 'RESULT_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

router.delete('/results/:id', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await deleteResult(req.params['id']);
    res.status(204).send();
  } catch (e: any) {
    res.status(e.code === 'RESULT_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

export default router;
