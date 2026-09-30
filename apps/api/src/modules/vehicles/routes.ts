import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const vehiclesRouter = Router();

vehiclesRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Vehicles module foundation active.',
  });
});
