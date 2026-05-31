import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getPracticeLinks, createPracticeLink, updatePracticeLink, deletePracticeLink, archiveExpiredLinks } from '../services/practice.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/practice-links?archived=true
router.get('/', async (req: AuthRequest, res: Response) => {
  const archived = req.query['archived'] === 'true';
  const links = await getPracticeLinks(req.user!, archived);
  res.json(ok(links));
});

// GET /api/practice-links/history
router.get('/history', async (req: AuthRequest, res: Response) => {
  const links = await getPracticeLinks(req.user!, true);
  res.json(ok(links));
});

// POST /api/practice-links — Super Admin + Coach
router.post('/', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    const link = await createPracticeLink(req.body, req.user!.user_id);
    res.status(201).json(ok(link, 'เพิ่มลิงก์ซ้อมสำเร็จ'));
  } catch (e: any) {
    const status = e.code === 'PRACTICE_LINK_DUPLICATE' ? 409 : 400;
    res.status(status).json(fail(e.code, e.message));
  }
});

// PUT /api/practice-links/:id — Super Admin + Coach
router.put('/:id', requireRole('Super Admin', 'Coach'), async (req, res: Response) => {
  try {
    const link = await updatePracticeLink(req.params['id'], req.body);
    res.json(ok(link, 'แก้ไขลิงก์ซ้อมสำเร็จ'));
  } catch (e: any) {
    const statusMap: Record<string, number> = { PRACTICE_LINK_NOT_FOUND: 404, PRACTICE_LINK_ARCHIVED: 409 };
    res.status(statusMap[e.code] ?? 400).json(fail(e.code, e.message));
  }
});

// DELETE /api/practice-links/:id — Super Admin + Coach
router.delete('/:id', requireRole('Super Admin', 'Coach'), async (req, res: Response) => {
  try {
    await deletePracticeLink(req.params['id']);
    res.status(204).send();
  } catch (e: any) {
    res.status(e.code === 'PRACTICE_LINK_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

// POST /api/practice-links/archive-now — manually trigger archive (Super Admin)
router.post('/archive-now', requireRole('Super Admin'), async (_req, res: Response) => {
  const count = await archiveExpiredLinks();
  res.json(ok({ archived: count }, `Archive สำเร็จ: ${count} links`));
});

export default router;
