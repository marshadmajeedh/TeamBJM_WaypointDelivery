import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { sendSuccess } from '../../shared/response';
import { draftSchema, depotScope, fail, scopedOrder } from './store-service';
import { enrichOrders, saveAction } from './store-workflow';
export const storeActionRouter = Router();
storeActionRouter.get('/draft', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    const record = await prisma.syncRecord.findUnique({
      where: { clientSyncId: `store:draft:${req.user!.id}` },
    });
    if (!record) return sendSuccess(res, null);
    const parsed = draftSchema.safeParse(record.payload);
    if (!parsed.success) return sendSuccess(res, null);
    if (!(await prisma.outlet.findFirst({ where: { id: parsed.data.outletId, depotId } })))
      return sendSuccess(res, null);
    return sendSuccess(res, parsed.data);
  } catch (error) {
    next(error);
  }
});
storeActionRouter.put('/draft', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    const input = draftSchema.parse(req.body);
    if (!(await prisma.outlet.findFirst({ where: { id: input.outletId, depotId } })))
      return fail('Outlet not available to your depot', 403);
    await saveAction('STORE_MANAGER_DRAFT', req.user!.id, `store:draft:${req.user!.id}`, input);
    return sendSuccess(res, input);
  } catch (error) {
    next(error);
  }
});
storeActionRouter.post('/:id/bay', async (req, res, next) => {
  try {
    const order = await scopedOrder(req.params.id, await depotScope(req));
    if (['DELIVERED', 'PARTIAL', 'FAILED'].includes(order.status))
      return fail('This delivery is already closed', 409);
    const input = z
      .object({
        checks: z.tuple([
          z.literal(true),
          z.literal(true),
          z.literal(true),
          z.literal(true),
          z.literal(true),
        ]),
      })
      .strict()
      .parse(req.body);
    const payload = {
      ...input,
      bayNumber: '02',
      readyAt: new Date().toISOString(),
      userId: req.user!.id,
    };
    await saveAction('STORE_BAY_READY', order.id, `store:bay:${order.id}`, payload);
    return sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
});
storeActionRouter.post('/:id/deferral', async (req, res, next) => {
  try {
    const order = await scopedOrder(req.params.id, await depotScope(req));
    if (order.status !== 'DEFERRED') return fail('This order is no longer deferred', 409);
    const input = z
      .object({ action: z.enum(['ACKNOWLEDGE', 'ACCEPT']), slotId: z.string().optional() })
      .strict()
      .parse(req.body);
    const [current] = await enrichOrders([order]);
    if (
      input.action === 'ACCEPT' &&
      (!current.workflow.slot ||
        current.workflow.slot.id !== input.slotId ||
        new Date(current.workflow.slot.end).getTime() <= Date.now())
    )
      return fail(
        'The delivery slot changed or expired. Refresh the notice before accepting.',
        409
      );
    const payload = {
      action: input.action,
      slotId: input.action === 'ACCEPT' ? input.slotId! : null,
      deferralCount: order.deferralCount,
      respondedAt: new Date().toISOString(),
      userId: req.user!.id,
    };
    await saveAction(
      'STORE_DEFERRAL_RESPONSE',
      order.id,
      `store:deferral:${order.id}:${order.deferralCount}`,
      payload
    );
    return sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
});
