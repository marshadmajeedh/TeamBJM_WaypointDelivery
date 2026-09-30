import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole, LoginRequestSchema } from '@waypoint/shared';
import { config } from '../../config';
import { prisma } from '../../db';
import { sendSuccess, sendError } from '../../shared/response';
import { authenticate, authorizeRoles } from '../../middleware';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token and sanitized user profile.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  const parseResult = LoginRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return sendError(
      res,
      'VALIDATION_ERROR',
      'Invalid email or password format',
      400,
      parseResult.error.errors
    );
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Use generic 401 error message to avoid revealing account existence
      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Generic 401 error message
      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
    }

    // Sign JWT containing strictly necessary identity claims (sub, role)
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    // Return sanitized user payload - passwordHash is never returned
    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        depotId: user.depotId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred during login', 500);
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user identity.
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        depotId: true,
      },
    });

    if (!user) {
      return sendError(res, 'UNAUTHORIZED', 'User not found or deactivated', 401);
    }

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      depotId: user.depotId,
    };

    return sendSuccess(res, {
      ...sanitizedUser,
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve user profile', 500);
  }
});

/**
 * Verification Test Endpoints
 * Minimal role-check endpoints for shared-foundation validation.
 */
authRouter.get(
  '/test/store-manager',
  authenticate,
  authorizeRoles(UserRole.STORE_MANAGER),
  (_req: Request, res: Response) => {
    return sendSuccess(res, { message: 'Store manager access granted' });
  }
);

authRouter.get(
  '/test/dispatcher',
  authenticate,
  authorizeRoles(UserRole.DISPATCHER),
  (_req: Request, res: Response) => {
    return sendSuccess(res, { message: 'Dispatcher access granted' });
  }
);

authRouter.get(
  '/test/loader',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  (_req: Request, res: Response) => {
    return sendSuccess(res, { message: 'Loader access granted' });
  }
);

authRouter.get(
  '/test/driver',
  authenticate,
  authorizeRoles(UserRole.DRIVER),
  (_req: Request, res: Response) => {
    return sendSuccess(res, { message: 'Driver access granted' });
  }
);
