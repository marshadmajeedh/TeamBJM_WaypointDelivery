import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { UserRole } from '@waypoint/shared';
import { authenticate, authorizeRoles } from '../../middleware';
import { prisma } from '../../db';
import { sendSuccess } from '../../shared/response';
import { depotScope, fail, scopedOrder } from '../orders/store-service';

export const receiptSchema = z
  .object({
    proof: z
      .object({
        name: z.string().min(1).max(150),
        dataUrl: z
          .string()
          .max(88000)
          .refine((value) => {
            const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
            if (!match) return false;
            const bytes = Buffer.from(match[2], 'base64');
            return (
              bytes.length <= 64000 &&
              (match[1] === 'jpeg'
                ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
                : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
            );
          }, 'Attach a JPEG or PNG proof up to 64 KB'),
      })
      .strict()
      .optional(),
    dockTemperatureC: z.number().min(-40).max(60).optional(),
    signature: z.string().trim().min(2).max(150),
    issue: z.enum(['NONE', 'SHORTAGE', 'DAMAGED', 'INCORRECT']),
    affectedItemId: z.string().optional(),
    notes: z.string().trim().max(2000),
    received: z
      .array(z.object({ itemId: z.string(), quantity: z.number().int().min(0).max(1000) }))
      .min(1),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.issue !== 'NONE' && (!input.affectedItemId || input.notes.length < 10))
      ctx.addIssue({
        code: 'custom',
        message: 'Select the affected item and describe the issue (at least 10 characters)',
      });
  });
export const storeReceiptsRouter = Router();
storeReceiptsRouter.use(authenticate, authorizeRoles(UserRole.STORE_MANAGER));
storeReceiptsRouter.post('/:id', async (req, res, next) => {
  try {
    const depotId = await depotScope(req);
    const input = receiptSchema.parse(req.body);
    const order = await scopedOrder(req.params.id, depotId);
    if (!['IN_TRANSIT', 'DELIVERED', 'PARTIAL'].includes(order.status))
      return fail('This order is not ready for receipt confirmation', 409);
    if (order.receiptConfirmation) return fail('Receipt already confirmed', 409);
    if (
      input.received.length !== order.items.length ||
      new Set(input.received.map((item) => item.itemId)).size !== order.items.length
    )
      return fail('Verify every manifest item once');
    for (const received of input.received) {
      const item = order.items.find((item) => item.id === received.itemId);
      if (!item || received.quantity > item.quantity) return fail('Invalid received quantity');
      if (input.issue === 'NONE' && received.quantity !== item.quantity)
        return fail('Report a shortage for missing items');
    }
    if (input.issue !== 'NONE' && !order.items.some((item) => item.id === input.affectedItemId))
      return fail('Affected item is not in this order');
    const receipt = await prisma.$transaction(async (tx) => {
      const result = await tx.receiptConfirmation.create({
        data: {
          orderId: order.id,
          confirmedByUserId: req.user!.id,
          status: input.issue === 'NONE' ? 'COMPLETE' : 'EXCEPTION',
          notes: JSON.stringify(input),
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: input.issue === 'NONE' ? 'DELIVERED' : 'PARTIAL' },
      });
      return result;
    });
    return sendSuccess(res, receipt, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return next(Object.assign(new Error('Receipt already confirmed'), { statusCode: 409 }));
    next(error);
  }
});
