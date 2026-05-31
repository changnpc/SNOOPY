import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { upload } from '../middleware/upload.middleware';
import { getAllUsers, getUserById, createUser, updateUser, deactivateUser, reactivateUser } from '../services/users.service';
import { uploadMulterFile } from '../services/google-drive.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/users
router.get('/', async (req: AuthRequest, res: Response) => {
  const { team_id, sub_team_id, role, is_active } = req.query as Record<string, string>;
  const users = await getAllUsers(req.user!, { team_id, sub_team_id, role: role as any, is_active });
  res.json(ok(users));
});

// GET /api/users/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = await getUserById(req.params['id'], req.user!);
  if (!user) { res.status(404).json(fail('USER_NOT_FOUND', 'User not found')); return; }
  res.json(ok(user));
});

// POST /api/users — Super Admin only
router.post('/', requireRole('Super Admin'), upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    let img_avatar_url: string | undefined;
    if (req.file) {
      const uploaded = await uploadMulterFile(req.file, 'avatars', `${req.body.email}_avatar`);
      img_avatar_url = uploaded.viewUrl;
    }
    const user = await createUser({ ...req.body, img_avatar_url }, req.user!.user_id);
    res.status(201).json(ok(user, 'Created a user successfully'));
  } catch (e: any) {
    const status = e.code === 'EMAIL_DUPLICATE' ? 409 : 400;
    res.status(status).json(fail(e.code ?? 'VALIDATION_ERROR', e.message));
  }
});

// PUT /api/users/:id
router.put('/:id', upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'Super Admin';
    const isOwner = req.user!.user_id === req.params['id'];
    if (!isAdmin && !isOwner) {
      res.status(403).json(fail('RBAC_FORBIDDEN', 'You do not have permission to edit this user\'s information.'));
      return;
    }
    let img_avatar_url: string | undefined;
    if (req.file) {
      const uploaded = await uploadMulterFile(req.file, 'avatars', `${req.params['id']}_avatar`);
      img_avatar_url = uploaded.viewUrl;
    }
    const data = img_avatar_url ? { ...req.body, img_avatar_url } : req.body;
    const user = await updateUser(req.params['id'], data, req.user!);
    res.json(ok(user, 'Data updated successfully.'));
  } catch (e: any) {
    const status = e.code === 'USER_NOT_FOUND' ? 404 : 400;
    res.status(status).json(fail(e.code ?? 'SERVER_ERROR', e.message));
  }
});

// PATCH /api/users/:id/deactivate — Super Admin only
router.patch('/:id/deactivate', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await deactivateUser(req.params['id']);
    res.json(ok(null, 'Account successfully suspended.'));
  } catch (e: any) {
    res.status(e.code === 'USER_NOT_FOUND' ? 404 : 500).json(fail(e.code, e.message));
  }
});

// PATCH /api/users/:id/reactivate — Super Admin only
router.patch('/:id/reactivate', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await reactivateUser(req.params['id']);
    res.json(ok(null, 'Account activation successful.'));
  } catch (e: any) {
    res.status(e.code === 'USER_NOT_FOUND' ? 404 : 500).json(fail(e.code, e.message));
  }
});

export default router;
