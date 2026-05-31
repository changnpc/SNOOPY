import { Router, Request, Response } from 'express';
import { loginWithGoogleCode } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { ok } from '../models';

const router = Router();

// POST /api/auth/google
// Body: { code: string }
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_CODE', message: 'Authorization code is required' } });
      return;
    }
    const result = await loginWithGoogleCode(code);
    if (!result.success) {
      res.status(401).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Auth] Google login error:', err.message);
    res.status(500).json({ success: false, error: { code: 'GOOGLE_AUTH_ERROR', message: 'An error occurred during identity verification with Google.' } });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // JWT is stateless — client simply discards token
  // In future: add token blacklist if needed
  res.status(200).json(ok(null, 'Logout successful.'));
});

// GET /api/auth/me — get current user profile
router.get('/me', authenticate, async (req: any, res: Response) => {
  try {
    const { findOne } = await import('../services/google-sheets.service');
    const { SHEETS } = await import('../config/sheets.config');
    const found = await findOne(SHEETS.USERS, 'user_id', req.user.user_id);
    if (!found) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No user information found.' } });
      return;
    }
    const { phone, birth_date, google_sub, ...safeUser } = found.data as any;
    res.status(200).json(ok(safeUser));
  } catch (err: any) {
    console.error('[Auth] /me error:', err.message);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred.' } });
  }
});

export default router;
