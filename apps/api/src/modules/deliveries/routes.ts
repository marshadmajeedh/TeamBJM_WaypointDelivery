import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const deliveriesRouter = Router();

deliveriesRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Deliveries module foundation active.',
  });
});
