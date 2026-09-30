import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@waypoint/shared';
import { prisma } from '../../db';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../shared/response';
import {
  getLoadingTasksForDepot,
  getVehicleLoadingDetailsForDepot,
} from './loadingService';

export const loadingRouter = Router();

/**
 * Health / foundation endpoint for the loading module.
 */
loadingRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Loading module foundation active.',
  });
});

/**
 * GET /api/loading/tasks
 * Returns loading tasks dashboard data for the authenticated loader.
 * Enforces fail-closed depot scoping: requires loader to have an assigned depotId.
 */
loadingRouter.get(
  '/tasks',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loaderId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: loaderId },
        select: { id: true, depotId: true },
      });

      if (!user?.depotId || user.depotId.trim() === '') {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const tasksData = await getLoadingTasksForDepot(user.depotId);
      return sendSuccess(res, tasksData);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/loading/tasks/:tripId
 * Returns vehicle loading details for a specific trip.
 * Enforces fail-closed depot scoping: requires loader to have an assigned depotId
 * and rejects cross-depot trip access attempts with 403.
 */
loadingRouter.get(
  '/tasks/:tripId',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loaderId = req.user!.id;
      const { tripId } = req.params;

      if (!tripId || tripId.trim() === '') {
        return sendError(res, 'BAD_REQUEST', 'Trip ID is required', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: loaderId },
        select: { id: true, depotId: true },
      });

      if (!user?.depotId || user.depotId.trim() === '') {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const result = await getVehicleLoadingDetailsForDepot(user.depotId, tripId);

      if (result.outcome === 'CROSS_DEPOT_FORBIDDEN') {
        return sendError(
          res,
          'FORBIDDEN',
          'Access forbidden: Trip belongs to another depot.',
          403
        );
      }

      if (result.outcome === 'NOT_FOUND') {
        return sendError(
          res,
          'NOT_FOUND',
          `Vehicle loading task for trip '${tripId}' not found`,
          404
        );
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      return next(error);
    }
  }
);
