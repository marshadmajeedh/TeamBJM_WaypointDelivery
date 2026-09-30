import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, requestLogger } from './middleware';

import { authRouter } from './modules/auth/routes';
import { usersRouter } from './modules/users/routes';
import { outletsRouter } from './modules/outlets/routes';
import { ordersRouter } from './modules/orders/routes';
import { vehiclesRouter } from './modules/vehicles/routes';
import { planningRouter } from './modules/planning/routes';
import { allocationRouter } from './modules/allocation/routes';
import { loadingRouter } from './modules/loading/routes';
import { deliveriesRouter } from './modules/deliveries/routes';
import { receiptsRouter } from './modules/receipts/routes';
import { syncRouter } from './modules/sync/routes';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  // Health check endpoint required by specification
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'waypoint-api',
    });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/outlets', outletsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/vehicles', vehiclesRouter);
  app.use('/api/planning', planningRouter);
  app.use('/api/allocation', allocationRouter);
  app.use('/api/loading', loadingRouter);
  app.use('/api/deliveries', deliveriesRouter);
  app.use('/api/receipts', receiptsRouter);
  app.use('/api/sync', syncRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
