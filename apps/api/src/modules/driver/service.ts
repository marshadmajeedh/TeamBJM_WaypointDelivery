import { Prisma } from '@prisma/client';
import {
  DeliveryOutcome,
  DriverIssue,
  DriverTrip,
  QueuedDriverAction,
  TripStatus,
  driverActionSchema,
} from '@waypoint/shared';
import { prisma } from '../../db';

function reject(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode });
}
const published = ['READY_FOR_DISPATCH', 'IN_TRANSIT', 'COMPLETED'] as const;

export async function getTodayTrip(driverId: string): Promise<DriverTrip | null> {
  // Today's service date is evaluated in the operating depot timezone.
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const start = new Date(`${date}T00:00:00+05:30`);
  const trips = await prisma.trip.findMany({
    where: {
      driverId,
      status: { in: [...published] },
      tripDate: { gte: start, lt: new Date(start.getTime() + 86400000) },
    },
    orderBy: { tripSequenceNumber: 'asc' },
    include: {
      vehicle: true,
      tripOrders: {
        orderBy: { sequenceNumber: 'asc' },
        include: { order: { include: { outlet: true, items: true } } },
      },
      deliveries: true,
    },
  });
  // Prisma enum order follows its declaration, so select the active wave explicitly.
  const trip =
    trips.find((t) => t.status === 'IN_TRANSIT') ??
    trips.find((t) => t.status === 'READY_FOR_DISPATCH') ??
    trips[trips.length - 1];
  if (!trip) return null;
  return {
    id: trip.id,
    tripNumber: trip.tripNumber,
    status: trip.status as TripStatus,
    tripDate: trip.tripDate.toISOString(),
    vehicle: {
      registrationNumber: trip.vehicle.registrationNumber,
      tempType: trip.vehicle.tempType,
    },
    plannedDepartureTime: trip.plannedDepartureTime?.toISOString() ?? null,
    actualDepartureTime: trip.actualDepartureTime?.toISOString() ?? null,
    completedTime: trip.completedTime?.toISOString() ?? null,
    totalWeightKg: trip.totalWeightKg,
    stops: trip.tripOrders.map((stop) => {
      const delivery = trip.deliveries.find((d) => d.orderId === stop.orderId);
      return {
        id: stop.id,
        orderId: stop.orderId,
        orderNumber: stop.order.orderNumber,
        sequenceNumber: stop.sequenceNumber,
        outlet: stop.order.outlet,
        items: stop.order.items,
        weightKg: stop.order.totalWeightKg,
        outcome: (delivery?.outcome as DeliveryOutcome) ?? null,
        arrivedAt: delivery?.arrivedAt?.toISOString() ?? null,
        completedAt: delivery?.completedAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function getIssues(driverId: string): Promise<DriverIssue[]> {
  const records = await prisma.syncRecord.findMany({
    where: {
      entityType: 'DRIVER_ISSUE',
      status: 'SYNCED',
      payload: { path: ['driverId'], equals: driverId },
    },
    orderBy: { createdAt: 'desc' },
  });
  return records.flatMap((record) => {
    const stored = record.payload as {
      driverId?: string;
      action?: unknown;
      createdAt?: string;
      resolved?: boolean;
    };
    const parsed = driverActionSchema.safeParse(stored.action);
    return stored.driverId === driverId && parsed.success && parsed.data.type === 'ISSUE'
      ? [
          {
            ...parsed.data,
            id: record.clientSyncId,
            reportedAt: stored.createdAt ?? record.createdAt.toISOString(),
            resolved: stored.resolved === true,
          },
        ]
      : [];
  });
}

export async function processAction(driverId: string, action: QueuedDriverAction): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Serializes all actions for a trip, including concurrent reconnect requests.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${action.payload.tripId}))`;
    const existing = await tx.syncRecord.findUnique({
      where: { clientSyncId: action.clientSyncId },
    });
    if (existing) {
      const saved = existing.payload as { driverId?: string; action?: unknown; createdAt?: string };
      if (
        saved.driverId !== driverId ||
        JSON.stringify(driverActionSchema.parse(saved.action)) !== JSON.stringify(action.payload) ||
        saved.createdAt !== action.createdAt
      )
        reject('Idempotency key belongs to another action.', 409);
      return;
    }
    const p = action.payload;
    const trip = await tx.trip.findFirst({
      where: { id: p.tripId, driverId, status: { in: [...published] } },
      include: {
        tripOrders: { include: { order: { include: { items: true } } } },
        deliveries: true,
      },
    });
    if (!trip) reject('Assigned published trip not found.', 404);
    const when = new Date(action.createdAt);
    if (when.getTime() > Date.now() + 300000) reject('Action timestamp is in the future.');
    if (p.type === 'START_TRIP') {
      if (trip.status === 'COMPLETED') reject('Trip is already completed.');
      await tx.trip.update({
        where: { id: trip.id },
        data: { status: 'IN_TRANSIT', actualDepartureTime: trip.actualDepartureTime ?? when },
      });
      await tx.order.updateMany({
        where: {
          id: { in: trip.tripOrders.map((s) => s.orderId) },
          status: { in: ['PLANNED', 'LOADING'] },
        },
        data: { status: 'IN_TRANSIT' },
      });
    } else if (p.type === 'FINISH_TRIP') {
      if (
        !trip.tripOrders.length ||
        trip.tripOrders.some(
          (s) => !trip.deliveries.some((d) => d.orderId === s.orderId && d.completedAt)
        )
      )
        reject('Complete every stop before finishing the trip.');
      await tx.trip.update({
        where: { id: trip.id },
        data: { status: 'COMPLETED', completedTime: trip.completedTime ?? when },
      });
    } else {
      const stop = trip.tripOrders.find((s) => s.id === p.stopId && s.orderId === p.orderId);
      if (!stop) reject('Stop does not belong to the assigned trip.', 404);
      if (p.type !== 'ISSUE') {
        if (trip.status !== 'IN_TRANSIT') reject('Start the trip before recording delivery.');
        const previous = trip.deliveries.find((d) => d.orderId === p.orderId);
        if (previous?.completedAt) reject('This stop is already completed.', 409);
        if (p.type === 'COMPLETE_DELIVERY') {
          const items = stop.order.items;
          const q = p.result.quantities;
          if (
            q.length !== items.length ||
            new Set(q.map((i) => i.itemId)).size !== items.length ||
            items.some((i) => !q.some((v) => v.itemId === i.id && v.delivered <= i.quantity))
          )
            reject('Quantities must match the consignment.');
          if (
            p.result.outcome === DeliveryOutcome.FULL &&
            items.some((i) => q.find((v) => v.itemId === i.id)!.delivered !== i.quantity)
          )
            reject('Full delivery must include all expected quantities.');
          if (
            p.result.outcome === DeliveryOutcome.PARTIAL &&
            (!q.some((v) => v.delivered > 0) ||
              !items.some((i) => q.find((v) => v.itemId === i.id)!.delivered < i.quantity))
          )
            reject('Partial delivery requires accepted goods and a shortage.');
          if (p.result.outcome === DeliveryOutcome.FAILED && q.some((v) => v.delivered !== 0))
            reject('Unable to deliver must have zero delivered quantities.');
          if (p.result.outcome !== DeliveryOutcome.FAILED && !p.proof.signature)
            reject('Recipient signature is required.');
        }
        const delivery =
          previous ??
          (await tx.delivery.create({
            data: { tripId: trip.id, orderId: stop.orderId, driverId, arrivedAt: when },
          }));
        if (p.type === 'ARRIVAL')
          await tx.delivery.update({
            where: { id: delivery.id },
            data: { arrivedAt: delivery.arrivedAt ?? when },
          });
        else {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: { outcome: p.result.outcome, notes: p.result.notes, completedAt: when },
          });
          await tx.proofOfDelivery.create({
            data: {
              deliveryId: delivery.id,
              recipientName: p.proof.recipientName,
              recipientSignature: p.proof.signature,
              photoUrl: p.proof.photos[0],
              notes: p.proof.notes,
              capturedAt: when,
            },
          });
          await tx.order.update({
            where: { id: stop.orderId },
            data: {
              status:
                p.result.outcome === DeliveryOutcome.FULL
                  ? 'DELIVERED'
                  : p.result.outcome === DeliveryOutcome.PARTIAL
                    ? 'PARTIAL'
                    : 'FAILED',
            },
          });
        }
      }
    }
    await tx.syncRecord.create({
      data: {
        clientSyncId: action.clientSyncId,
        entityType: p.type === 'ISSUE' ? 'DRIVER_ISSUE' : p.type,
        entityId: 'stopId' in p ? p.stopId : p.tripId,
        payload: {
          driverId,
          action: p,
          createdAt: action.createdAt,
        } as unknown as Prisma.InputJsonValue,
        status: 'SYNCED',
        syncedAt: new Date(),
      },
    });
  });
}
