import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db';

export const catalog = [
  {
    id: 'milk',
    productName: 'Highland Fresh Full Cream Milk',
    pack: 'Crate containing 12 x 1L',
    unitWeightKg: 185 / 15,
    unitVolumeM3: 0.28 / 15,
    tempRequirement: 'CHILLED' as const,
  },
  {
    id: 'chicken',
    productName: 'Keells Prime Chicken Breast',
    pack: 'Vacuum packed - 15kg carton',
    unitWeightKg: 15,
    unitVolumeM3: 0.18 / 8,
    tempRequirement: 'FROZEN' as const,
  },
  {
    id: 'carrots',
    productName: 'Nuwara Eliya Fresh Carrots',
    pack: 'Commercial grade A - 10kg bag',
    unitWeightKg: 10,
    unitVolumeM3: 0.35 / 20,
    tempRequirement: 'AMBIENT' as const,
  },
];
export function fail(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode });
}
export async function depotScope(req: Request) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { depotId: true, role: true },
  });
  if (!user || user.role !== 'STORE_MANAGER') return fail('Store Manager access required', 403);
  if (!user.depotId)
    return fail('Your account needs a depot assignment. Contact your administrator.', 403);
  return user.depotId;
}
export const orderInclude = {
  outlet: true,
  items: true,
  receiptConfirmation: true,
  tripOrders: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      trip: { include: { vehicle: true, driver: { select: { name: true, phone: true } } } },
    },
  },
  deliveries: { include: { proofOfDelivery: true }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;
export async function scopedOrder(id: string, depotId: string) {
  const order = await prisma.order.findFirst({
    where: { id, outlet: { depotId } },
    include: orderInclude,
  });
  return order || fail('Order not found', 404);
}
export const draftSchema = z
  .object({
    clientRequestId: z.string().uuid().optional(),
    receivingInstructions: z.string().trim().max(1000).optional(),
    category: z.enum(['DAILY_REPLENISHMENT', 'COLD_CHAIN', 'DRY_GOODS']).optional(),
    outletId: z.string().min(1),
    requestedDeliveryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value + 'T00:00:00Z');
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }, 'Choose a valid delivery date'),
    items: z
      .array(
        z.object({ productId: z.string(), quantity: z.number().int().min(1).max(1000) }).strict()
      )
      .min(1)
      .max(30),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.items.map((item) => item.productId)).size !== value.items.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate products are not allowed' });
    if (value.items.some((item) => !catalog.some((product) => product.id === item.productId)))
      ctx.addIssue({ code: 'custom', message: 'Unknown product' });
  });

export const createOrderSchema = draftSchema.refine(
  (input) =>
    input.requestedDeliveryDate >=
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }),
  'Choose today or a future delivery date'
);
