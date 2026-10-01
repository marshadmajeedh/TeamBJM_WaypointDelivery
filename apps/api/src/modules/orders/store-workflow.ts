import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db';
import { orderInclude } from './store-service';

// Durable Store actions use the existing sync envelope. No other module's records are modified.
export const STORE_TYPES = [
  'STORE_ORDER_SUBMITTED',
  'STORE_BAY_READY',
  'STORE_DEFERRAL_RESPONSE',
  'STORE_DELIVERY_SLOT',
  'DELIVERY_TELEMETRY',
];
export const slotSchema = z
  .object({
    id: z.string().min(1),
    deferralCount: z.number().int().min(0),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    publishedAt: z.string().datetime({ offset: true }),
  })
  .refine((value) => new Date(value.start) < new Date(value.end));
export const telemetrySchema = z.object({
  capturedAt: z.string().datetime({ offset: true }),
  eta: z.string().datetime({ offset: true }).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  chilledC: z.number().min(-80).max(80).nullable(),
  frozenC: z.number().min(-80).max(80).nullable(),
  stopsAway: z.number().int().min(0).nullable(),
});
const baySchema = z.object({
  bayNumber: z.literal('02'),
  checks: z.tuple([
    z.literal(true),
    z.literal(true),
    z.literal(true),
    z.literal(true),
    z.literal(true),
  ]),
  readyAt: z.string(),
  userId: z.string(),
});
const responseSchema = z.object({
  action: z.enum(['ACKNOWLEDGE', 'ACCEPT']),
  slotId: z.string().nullable(),
  deferralCount: z.number(),
  respondedAt: z.string(),
  userId: z.string(),
});
const manifestSchema = z.object({
  receivingInstructions: z.string().optional(),
  category: z.string().optional(),
});
type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type SyncEntry = { entityId: string; entityType: string; payload: Prisma.JsonValue };
export function workflowFor(
  order: Pick<OrderWithRelations, 'id' | 'deferralCount'>,
  records: SyncEntry[]
) {
  const get = (type: string) =>
    records.find((record) => record.entityId === order.id && record.entityType === type)?.payload;
  const bay = baySchema.safeParse(get('STORE_BAY_READY'));
  const slot = slotSchema.safeParse(get('STORE_DELIVERY_SLOT'));
  const currentSlot =
    slot.success && slot.data.deferralCount === order.deferralCount ? slot.data : null;
  const response = responseSchema.safeParse(get('STORE_DEFERRAL_RESPONSE'));
  const manifest = manifestSchema.safeParse(get('STORE_ORDER_SUBMITTED'));
  const telemetry = telemetrySchema.safeParse(get('DELIVERY_TELEMETRY'));
  const validResponse =
    response.success &&
    response.data.deferralCount === order.deferralCount &&
    (response.data.action !== 'ACCEPT' || (currentSlot && response.data.slotId === currentSlot.id));
  const age = telemetry.success
    ? Date.now() - new Date(telemetry.data.capturedAt).getTime()
    : Infinity;
  return {
    bay: bay.success ? bay.data : null,
    slot: currentSlot,
    deferralResponse: validResponse ? response.data : null,
    receivingInstructions: manifest.success ? manifest.data.receivingInstructions || '' : '',
    category: manifest.success
      ? manifest.data.category || 'DAILY_REPLENISHMENT'
      : 'DAILY_REPLENISHMENT',
    telemetry: telemetry.success
      ? { ...telemetry.data, stale: age > 120000 || age < -30000 }
      : null,
  };
}
export async function enrichOrders(orders: OrderWithRelations[]) {
  if (!orders.length) return [];
  const records = await prisma.syncRecord.findMany({
    where: {
      entityId: { in: orders.map((order) => order.id) },
      entityType: { in: STORE_TYPES },
      status: 'SYNCED',
    },
    orderBy: { updatedAt: 'desc' },
  });
  return orders.map((order) => ({ ...order, workflow: workflowFor(order, records) }));
}
export async function saveAction(
  entityType: string,
  entityId: string,
  clientSyncId: string,
  payload: Prisma.InputJsonObject
) {
  const data = { entityType, entityId, payload, status: 'SYNCED' as const, syncedAt: new Date() };
  return prisma.syncRecord.upsert({
    where: { clientSyncId },
    create: { ...data, clientSyncId },
    update: data,
  });
}
