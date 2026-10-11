import { Router } from 'express';
import { z } from 'zod';
import { UserRole, queuedDriverActionSchema } from '@waypoint/shared';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { sendSuccess } from '../../shared/response';
import { getIssues, getTodayTrip, processAction } from './service';

export const driverRouter = Router();
driverRouter.use(authenticate, authorizeRoles(UserRole.DRIVER));
driverRouter.get('/trip', async (req, res, next) => {
  try {
    return sendSuccess(res, await getTodayTrip(req.user!.id));
  } catch (e) {
    next(e);
  }
});
driverRouter.get('/issues', async (req, res, next) => {
  try {
    return sendSuccess(res, await getIssues(req.user!.id));
  } catch (e) {
    next(e);
  }
});
driverRouter.post('/actions', async (req, res, next) => {
  try {
    const action = queuedDriverActionSchema.parse(req.body);
    await processAction(req.user!.id, action);
    return sendSuccess(res, { clientSyncId: action.clientSyncId, success: true });
  } catch (e) {
    next(e);
  }
});
driverRouter.post('/sync', async (req, res, next) => {
  try {
    const { actions } = z
      .object({ actions: z.array(queuedDriverActionSchema).min(1).max(50) })
      .parse(req.body);
    const results = [];
    for (const action of actions) {
      try {
        await processAction(req.user!.id, action);
        results.push({ clientSyncId: action.clientSyncId, success: true });
      } catch (e) {
        results.push({
          clientSyncId: action.clientSyncId,
          success: false,
          error: e instanceof Error ? e.message : 'Synchronization failed.',
        });
      }
    }
    return sendSuccess(res, results);
  } catch (e) {
    next(e);
  }
});
