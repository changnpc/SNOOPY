import { Response, NextFunction } from 'express';
import { UserRole, fail } from '../models';
import { AuthRequest } from './auth.middleware';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(fail('RBAC_FORBIDDEN', 'ไม่มีสิทธิ์ดำเนินการ'));
      return;
    }
    next();
  };
}

export function requireSameTeam(teamIdParam = 'team_id') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json(fail('AUTH_TOKEN_MISSING', 'กรุณาเข้าสู่ระบบ')); return; }
    if (req.user.role === 'Super Admin') { next(); return; }
    const requestedTeam = req.body[teamIdParam] || req.query[teamIdParam] || req.params[teamIdParam];
    if (requestedTeam && requestedTeam !== req.user.team_id) {
      res.status(403).json(fail('RBAC_WRONG_TEAM', 'ไม่มีสิทธิ์เข้าถึงข้อมูลทีมอื่น'));
      return;
    }
    next();
  };
}
