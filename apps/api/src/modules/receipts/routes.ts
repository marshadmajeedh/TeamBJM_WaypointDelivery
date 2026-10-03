import { storeReceiptsRouter } from './store-routes';
import { Router } from 'express';
import { sendSuccess } from '../../shared/response';

export const receiptsRouter = Router();

receiptsRouter.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'Receipts module foundation active.',
  });
});

receiptsRouter.use('/store', storeReceiptsRouter);
