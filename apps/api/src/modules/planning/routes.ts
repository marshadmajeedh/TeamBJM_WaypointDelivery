import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const planningRouter = Router();

planningRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Planning module foundation active.',
  });
});
