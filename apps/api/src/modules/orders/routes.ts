import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const ordersRouter = Router();

ordersRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Orders module foundation active.',
  });
});
