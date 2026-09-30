import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const syncRouter = Router();

syncRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Offline sync module foundation active.',
  });
});
