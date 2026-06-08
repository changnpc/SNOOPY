import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { getLeaveRequests, submitLeaveRequest, cancelLeave, approveLeave, rejectLeave } from '../services/leave.service';
import { ok, fail } from '../models';

const router = Router();
router.use(authenticate);

// GET /api/leave-requests — list with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, team_id } = req.query as Record<string, string>;
  const leaves = await getLeaveRequests(req.user!, { status: status as any, team_id });
  res.json(ok(leaves));
});

// GET /api/leave-requests/my — player's own leaves
router.get('/my', async (req: AuthRequest, res: Response) => {
  const leaves = await getLeaveRequests(req.user!);
  res.json(ok(leaves));
});

// POST /api/leave-requests — Player submits leave
router.post('/', requireRole('Player'), async (req: AuthRequest, res: Response) => {
  try {
    const leave = await submitLeaveRequest(req.body, req.user!);
    res.status(201).json(ok(leave, 'The request has been successfully submitted.'));
  } catch (e: any) {
    const httpStatus: Record<string, number> = {
      LEAVE_DATE_IN_PAST: 400,
      LEAVE_CONFLICT: 409,
      VALIDATION_ERROR: 400,
    };
    res.status(httpStatus[e.code] ?? 400).json(fail(e.code, e.message));
  }
});

// PATCH /api/leave-requests/:id/cancel — Player
router.patch('/:id/cancel', requireRole('Player'), async (req: AuthRequest, res: Response) => {
  try {
    await cancelLeave(req.params['id'], req.user!);
    res.json(ok(null, 'The request has been successfully cancelled.'));
  } catch (e: any) {
    const status = e.code === 'LEAVE_NOT_PENDING' ? 409 : e.code === 'RBAC_FORBIDDEN' ? 403 : 400;
    res.status(status).json(fail(e.code, e.message));
  }
});

// PATCH /api/leave-requests/:id/approve — Coach / Super Admin
router.patch('/:id/approve', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    await approveLeave(req.params['id'], req.user!);
    res.json(ok(null, 'Leave request successfully approved.'));
  } catch (e: any) {
    const statusMap: Record<string, number> = { LEAVE_NOT_FOUND: 404, RBAC_WRONG_TEAM: 403, LEAVE_NOT_PENDING: 409 };
    res.status(statusMap[e.code] ?? 400).json(fail(e.code, e.message));
  }
});

// PATCH /api/leave-requests/:id/reject — Coach / Super Admin
router.patch('/:id/reject', requireRole('Super Admin', 'Coach'), async (req: AuthRequest, res: Response) => {
  try {
    await rejectLeave(req.params['id'], req.body.reject_reason, req.user!);
    res.json(ok(null, 'The leave request was successfully rejected.'));
  } catch (e: any) {
    const statusMap: Record<string, number> = {
      LEAVE_NOT_FOUND: 404, RBAC_WRONG_TEAM: 403,
      LEAVE_NOT_PENDING: 409, REJECT_REASON_REQUIRED: 400,
    };
    res.status(statusMap[e.code] ?? 400).json(fail(e.code, e.message));
  }
});

export default router;
