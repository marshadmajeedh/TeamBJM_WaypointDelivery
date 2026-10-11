import { isDeepStrictEqual } from 'node:util';
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { storeActionRouter } from './store-action-routes';
import { enrichOrders } from './store-workflow';
import { UserRole } from '@waypoint/shared';
import { authenticate, authorizeRoles } from '../../middleware';
import { prisma } from '../../db';
import { sendSuccess } from '../../shared/response';
import {
  catalog,
  createOrderSchema,
  depotScope,
  fail,
  orderInclude,
  scopedOrder,
} from './store-service';

export const storeOrdersRouter = Router();
storeOrdersRouter.use(authenticate, authorizeRoles(UserRole.STORE_MANAGER));
storeOrdersRouter.use(storeActionRouter);
storeOrdersRouter.get('/catalog', async (req, res, next) => {
  try {
    await depotScope(req);
    return sendSuccess(res, catalog);
  } catch (error) {
    next(error);
  }
});
storeOrdersRouter.get('/outlets', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    return sendSuccess(
      res,
      await prisma.outlet.findMany({ where: { depotId }, orderBy: { name: 'asc' } })
    );
  } catch (error) {
    next(error);
  }
});
storeOrdersRouter.get('/', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    return sendSuccess(
      res,
      await enrichOrders(
        await prisma.order.findMany({
          where: { outlet: { depotId } },
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
        })
      )
    );
  } catch (error) {
    next(error);
  }
});
storeOrdersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await scopedOrder(req.params.id, await depotScope(req));
    return sendSuccess(res, (await enrichOrders([order]))[0]);
  } catch (error) {
    next(error);
  }
});
storeOrdersRouter.post('/', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    const input = createOrderSchema.parse(req.body);
    if (!(await prisma.outlet.findFirst({ where: { id: input.outletId, depotId } })))
      return fail('Outlet not available to your depot', 403);
    const clientSyncId = `store:submit:${req.user!.id}:${input.clientRequestId || randomUUID()}`;
    const existing = await prisma.syncRecord.findUnique({ where: { clientSyncId } });
    if (existing && !isDeepStrictEqual(existing.payload, { ...input, submittedBy: req.user!.id }))
      return fail(
        'This submission ID already belongs to a different manifest. Start a new order.',
        409
      );
    if (existing)
      return sendSuccess(
        res,
        (await enrichOrders([await scopedOrder(existing.entityId, depotId)]))[0]
      );
    const items = input.items.map((item) => {
      const product = catalog.find((product) => product.id === item.productId)!;
      return {
        productName: product.productName,
        quantity: item.quantity,
        unitWeightKg: product.unitWeightKg,
        unitVolumeM3: product.unitVolumeM3,
        tempRequirement: product.tempRequirement,
      };
    });
    try {
      const order = await prisma.$transaction(async (tx) => {
        const result = await tx.order.create({
          data: {
            orderNumber: 'ORD-' + randomUUID().slice(0, 8).toUpperCase(),
            outletId: input.outletId,
            requestedDeliveryDate: new Date(input.requestedDeliveryDate + 'T00:00:00+05:30'),
            status: 'CONFIRMED',
            totalWeightKg: items.reduce((sum, item) => sum + item.quantity * item.unitWeightKg, 0),
            totalVolumeM3: items.reduce((sum, item) => sum + item.quantity * item.unitVolumeM3, 0),
            items: { create: items },
          },
          include: orderInclude,
        });
        await tx.syncRecord.create({
          data: {
            entityType: 'STORE_ORDER_SUBMITTED',
            entityId: result.id,
            clientSyncId,
            payload: { ...input, submittedBy: req.user!.id },
            status: 'SYNCED',
            syncedAt: new Date(),
          },
        });
        // Remove only the submitted draft; a newer draft on another device is preserved.
        if (input.clientRequestId)
          await tx.syncRecord.deleteMany({
            where: {
              clientSyncId: `store:draft:${req.user!.id}`,
              payload: { path: ['clientRequestId'], equals: input.clientRequestId },
            },
          });
        return result;
      });
      return sendSuccess(res, (await enrichOrders([order]))[0], 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await prisma.syncRecord.findUnique({ where: { clientSyncId } });
        if (winner && !isDeepStrictEqual(winner.payload, { ...input, submittedBy: req.user!.id }))
          return fail(
            'This submission ID already belongs to a different manifest. Start a new order.',
            409
          );
        if (winner)
          return sendSuccess(
            res,
            (await enrichOrders([await scopedOrder(winner.entityId, depotId)]))[0]
          );
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});
