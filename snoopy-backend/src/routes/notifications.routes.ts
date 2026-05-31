import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { getMyNotifications, markAsRead, markAllRead, deleteNotification, clearAllNotifications } from '../services/notifications.service';
import { ok } from '../models';

const router = Router();
router.use(authenticate);

router.get('/my', async (req: AuthRequest, res: Response) => {
  const notifs = await getMyNotifications(req.user!.user_id);
  res.json(ok(notifs));
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await markAsRead(req.params['id'], req.user!.user_id);
  res.json(ok(null));
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await markAllRead(req.user!.user_id);
  res.json(ok(null));
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await deleteNotification(req.params['id'], req.user!.user_id);
  res.json(ok(null));
});

router.delete('/', async (req: AuthRequest, res: Response) => {
  await clearAllNotifications(req.user!.user_id);
  res.json(ok(null));
});

export default router;
