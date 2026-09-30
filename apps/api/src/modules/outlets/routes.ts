import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const outletsRouter = Router();

outletsRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Outlets module foundation active.',
  });
});
