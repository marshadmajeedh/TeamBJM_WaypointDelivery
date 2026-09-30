import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const usersRouter = Router();

usersRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Users module foundation active.',
  });
});
