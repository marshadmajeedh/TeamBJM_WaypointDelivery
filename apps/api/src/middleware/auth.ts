import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@waypoint/shared';
import { config } from '../config';
import { sendError } from '../shared/response';

export interface AuthenticatedUserPayload {
  id: string;
  role: UserRole;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

interface DecodedTokenPayload {
  sub: string;
  role: UserRole;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware:
 * Validates Bearer JWT token from Authorization header and attaches
 * authenticated user identity to req.user.
 * Rejects missing, invalid, or expired tokens with HTTP 401.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): Response | void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication token required', 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication token required', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as DecodedTokenPayload;

    if (!decoded.sub || !decoded.role || !Object.values(UserRole).includes(decoded.role)) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid authentication token claims', 401);
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      ...(decoded.email ? { email: decoded.email } : {}),
    };

    return next();
  } catch (_error) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid or expired authentication token', 401);
  }
}

/**
 * Role-based authorization middleware:
 * Ensures the authenticated user possesses at least one of the specified allowed roles.
 * Returns HTTP 401 if unauthenticated, and HTTP 403 if authenticated but unauthorized.
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'Access forbidden: insufficient permissions', 403);
    }

    return next();
  };
}
