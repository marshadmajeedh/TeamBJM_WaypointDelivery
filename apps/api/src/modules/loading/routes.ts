import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, UpdateLoadingItemRequestSchema } from '@waypoint/shared';
import { prisma } from '../../db';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../shared/response';
import {
  getLoadingTasksForDepot,
  getVehicleLoadingDetailsForDepot,
  getLoadingSequenceForDepot,
  getLoadingChecklistForDepot,
  updateLoadingItemForDepot,
} from './loadingService';

export const loadingRouter = Router();

async function getAuthenticatedLoaderDepot(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, depotId: true },
  });
  if (!user?.depotId || user.depotId.trim() === '') {
    return null;
  }
  return user.depotId;
}

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
      const depotId = await getAuthenticatedLoaderDepot(loaderId);

      if (!depotId) {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const tasksData = await getLoadingTasksForDepot(depotId);
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

      const depotId = await getAuthenticatedLoaderDepot(loaderId);

      if (!depotId) {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const result = await getVehicleLoadingDetailsForDepot(depotId, tripId);

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

/**
 * GET /api/loading/tasks/:tripId/sequence
 * Returns reverse-order loading sequence for LS-04.
 * Demonstrates Team BJM's LIFO loading assumption:
 * Stop 3 loaded FIRST, Stop 1 loaded LAST for immediate tail-lift unloading.
 */
loadingRouter.get(
  '/tasks/:tripId/sequence',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loaderId = req.user!.id;
      const { tripId } = req.params;

      if (!tripId || tripId.trim() === '') {
        return sendError(res, 'BAD_REQUEST', 'Trip ID is required', 400);
      }

      const depotId = await getAuthenticatedLoaderDepot(loaderId);

      if (!depotId) {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const result = await getLoadingSequenceForDepot(depotId, tripId);

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
          `Vehicle loading sequence for trip '${tripId}' not found`,
          404
        );
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/loading/tasks/:tripId/checklist
 * Returns item loading checklist for LS-05, grouped by delivery stops.
 */
loadingRouter.get(
  '/tasks/:tripId/checklist',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loaderId = req.user!.id;
      const { tripId } = req.params;

      if (!tripId || tripId.trim() === '') {
        return sendError(res, 'BAD_REQUEST', 'Trip ID is required', 400);
      }

      const depotId = await getAuthenticatedLoaderDepot(loaderId);

      if (!depotId) {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const result = await getLoadingChecklistForDepot(depotId, tripId);

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
          `Loading checklist for trip '${tripId}' not found`,
          404
        );
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PATCH /api/loading/tasks/:tripId/items/:itemId
 * Confirms or updates physical loading quantity for an individual checklist item.
 * Validates against permitted maximum (staged/required count) in the backend.
 * Persists into database via LoadingRecord.notes.
 */
loadingRouter.patch(
  '/tasks/:tripId/items/:itemId',
  authenticate,
  authorizeRoles(UserRole.LOADER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loaderId = req.user!.id;
      const { tripId, itemId } = req.params;

      if (!tripId || tripId.trim() === '') {
        return sendError(res, 'BAD_REQUEST', 'Trip ID is required', 400);
      }
      if (!itemId || itemId.trim() === '') {
        return sendError(res, 'BAD_REQUEST', 'Item ID is required', 400);
      }

      const parseResult = UpdateLoadingItemRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid loadedQuantity. Must be an integer >= 0.',
          400,
          parseResult.error.format()
        );
      }

      const depotId = await getAuthenticatedLoaderDepot(loaderId);

      if (!depotId) {
        return sendError(
          res,
          'LOADER_DEPOT_NOT_ASSIGNED',
          'Loader is not assigned to a depot.',
          403
        );
      }

      const result = await updateLoadingItemForDepot(
        depotId,
        tripId,
        itemId,
        parseResult.data.loadedQuantity,
        loaderId
      );

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
          `Trip '${tripId}' not found`,
          404
        );
      }

      if (result.outcome === 'ITEM_NOT_FOUND') {
        return sendError(
          res,
          'NOT_FOUND',
          `Item '${itemId}' does not belong to trip '${tripId}'`,
          404
        );
      }

      if (result.outcome === 'EXCEEDS_PERMITTED_QUANTITY') {
        return sendError(
          res,
          'EXCEEDS_PERMITTED_QUANTITY',
          result.message,
          400,
          { maxAllowed: result.maxAllowed }
        );
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      return next(error);
    }
  }
);
