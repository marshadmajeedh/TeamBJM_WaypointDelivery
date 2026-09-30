import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const allocationRouter = Router();

allocationRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Allocation engine module foundation active.',
  });
});
