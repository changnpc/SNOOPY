import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { upload } from '../middleware/upload.middleware';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../services/activities.service';
import { uploadMulterFile } from '../services/google-drive.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res: Response) => {
  const archived = req.query['archived'] === 'true';
  const activities = await getActivities(archived);
  res.json(ok(activities));
});

const activityUpload = upload.fields([
  { name: 'image',      maxCount: 1 },
  { name: 'attachment', maxCount: 1 },
]);

router.post('/', requireRole('Super Admin'), activityUpload, async (req: AuthRequest, res: Response) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const ts = Date.now();
  let img_url: string | undefined;
  let attachment_url: string | undefined;
  let attachment_name: string | undefined;

  if (files?.['image']?.[0]) {
    const uploaded = await uploadMulterFile(files['image'][0], 'activity-images', `activity_${ts}`);
    img_url = uploaded.viewUrl;
  }
  if (files?.['attachment']?.[0]) {
    const f = files['attachment'][0];
    const uploaded = await uploadMulterFile(f, 'activity-attachments', `attachment_${ts}`);
    attachment_url = uploaded.viewUrl;
    attachment_name = f.originalname;
  }

  const activity = await createActivity({ ...req.body, img_url, attachment_url, attachment_name }, req.user!.user_id);
  res.status(201).json(ok(activity, 'สร้างกิจกรรมสำเร็จ'));
});

router.put('/:id', requireRole('Super Admin'), activityUpload, async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const ts = Date.now();
    const extra: Record<string, string> = {};

    if (files?.['image']?.[0]) {
      const uploaded = await uploadMulterFile(files['image'][0], 'activity-images', `activity_${req.params['id']}`);
      extra['img_url'] = uploaded.viewUrl;
    }
    if (files?.['attachment']?.[0]) {
      const f = files['attachment'][0];
      const uploaded = await uploadMulterFile(f, 'activity-attachments', `attachment_${req.params['id']}_${ts}`);
      extra['attachment_url'] = uploaded.viewUrl;
      extra['attachment_name'] = f.originalname;
    }

    const activity = await updateActivity(req.params['id'], { ...req.body, ...extra });
    res.json(ok(activity, 'แก้ไขกิจกรรมสำเร็จ'));
  } catch (e: any) {
    res.status(e.code === 'ACTIVITY_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

router.delete('/:id', requireRole('Super Admin'), async (req, res: Response) => {
  try {
    await deleteActivity(req.params['id']);
    res.status(204).send();
  } catch (e: any) {
    res.status(e.code === 'ACTIVITY_NOT_FOUND' ? 404 : 400).json(fail(e.code, e.message));
  }
});

export default router;
