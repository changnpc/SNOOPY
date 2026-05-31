import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/events.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { date_from, date_to } = req.query as Record<string, string>;
  const events = await getEvents(req.user!, { date_from, date_to });
  res.json(ok(events));
});

router.post('/', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  const event = await createEvent(req.body, req.user!.user_id);
  res.status(201).json(ok(event, 'Created a successful event.'));
});

router.put('/:id', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    const event = await updateEvent(req.params['id'], req.body, req.user!);
    res.json(ok(event, 'Edited a successful event.'));
  } catch (e: any) {
    res.status(e.code === 'EVENT_NOT_FOUND' ? 404 : 403).json(fail(e.code, e.message));
  }
});

router.delete('/:id', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    await deleteEvent(req.params['id'], req.user!);
    res.status(204).send();
  } catch (e: any) {
    res.status(e.code === 'EVENT_NOT_FOUND' ? 404 : 403).json(fail(e.code, e.message));
  }
});

export default router;
