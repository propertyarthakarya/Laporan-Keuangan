import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'STAFF' | 'MANAGEMENT';
  };
}

const TOKEN_COOKIE = 'fin_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export { TOKEN_COOKIE, JWT_SECRET };

export function signToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verifies the JWT from the httpOnly cookie and attaches the user to req.user.
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists. Please log in again.' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Allows only the listed roles; call after requireAuth.
export function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}
