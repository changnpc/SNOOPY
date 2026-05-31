import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, fail } from '../models';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json(fail('AUTH_TOKEN_MISSING', 'กรุณาเข้าสู่ระบบก่อน'));
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET']!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json(fail('AUTH_TOKEN_EXPIRED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'));
  }
}
