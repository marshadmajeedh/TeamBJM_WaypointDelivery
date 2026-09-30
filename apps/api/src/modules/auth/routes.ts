import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const authRouter = Router();

authRouter.post('/login', (_req, res) => {
  // Foundation placeholder for authentication
  return sendSuccess(res, {
    message: 'Auth module foundation active. Login endpoint ready for implementation.',
  });
});
