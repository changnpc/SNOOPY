import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getAllPermissions, savePermissions, RESOURCES } from '../services/role-permissions.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/role-permissions — all roles (authenticated users can read)
router.get('/', async (_req: AuthRequest, res: Response) => {
  const perms = await getAllPermissions();
  res.json(ok(perms));
});

// GET /api/role-permissions/resources — resource list
router.get('/resources', (_req, res: Response) => {
  res.json(ok(RESOURCES));
});

// POST /api/role-permissions — Super Admin only
router.post('/', requireRole('Super Admin'), async (req: AuthRequest, res: Response) => {
  try {
    await savePermissions(req.body);
    res.json(ok(null, 'Save a permission successfully'));
  } catch (e: any) {
    res.status(400).json(fail('PERM_SAVE_ERROR', e.message));
  }
});

export default router;
