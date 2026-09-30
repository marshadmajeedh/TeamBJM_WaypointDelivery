import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const loadingRouter = Router();

loadingRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Loading module foundation active.',
  });
});
