import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { DeliveryOutcome } from '@waypoint/shared';
import { app } from '../src/app';
import { config } from '../src/config';
import { getTodayTrip, processAction } from '../src/modules/driver/service';

const mocks = vi.hoisted(() => ({
  trip: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  syncRecord: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  delivery: { create: vi.fn(), update: vi.fn() },
  proofOfDelivery: { create: vi.fn() },
  order: { update: vi.fn(), updateMany: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock('../src/db', () => ({
  prisma: {
    ...mocks,
    $transaction: async (work: (tx: typeof mocks) => Promise<unknown>) => work(mocks),
  },
}));
const createdAt = new Date().toISOString();
const issueAction = {
  clientSyncId: '12345678-1234-4234-8234-123456789012',
  createdAt,
  payload: {
    type: 'ISSUE' as const,
    tripId: 'trip-1',
    stopId: 'stop-1',
    orderId: 'order-1',
    issueType: 'Access Blocked' as const,
    preventsDelivery: false,
  },
};
const assigned = {
  id: 'trip-1',
  status: 'IN_TRANSIT',
  actualDepartureTime: null,
  tripOrders: [
    { id: 'stop-1', orderId: 'order-1', order: { items: [{ id: 'milk', quantity: 20 }] } },
  ],
  deliveries: [],
};
function token(role = 'DRIVER') {
  return jwt.sign({ sub: 'driver-1', role }, config.jwtSecret, { expiresIn: '1h' });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.syncRecord.findUnique.mockResolvedValue(null);
  mocks.trip.findFirst.mockResolvedValue(assigned);
  mocks.delivery.create.mockResolvedValue({ id: 'delivery-1', arrivedAt: new Date(createdAt) });
  mocks.syncRecord.findMany.mockResolvedValue([]);
});
describe('Driver backend security and synchronization', () => {
  it('selects the active trip before a completed wave and scopes published data to the driver', async () => {
    const base = {
      tripDate: new Date(),
      vehicle: { registrationNumber: 'VEH-1', tempType: 'REEFER' },
      plannedDepartureTime: null,
      actualDepartureTime: null,
      completedTime: null,
      totalWeightKg: 0,
      tripOrders: [],
      deliveries: [],
    };
    mocks.trip.findMany.mockResolvedValue([
      { ...base, id: 'completed', tripNumber: 'T1', status: 'COMPLETED' },
      { ...base, id: 'ready', tripNumber: 'T2', status: 'READY_FOR_DISPATCH' },
      { ...base, id: 'active', tripNumber: 'T3', status: 'IN_TRANSIT' },
    ]);
    expect((await getTodayTrip('driver-1'))?.id).toBe('active');
    expect(mocks.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          driverId: 'driver-1',
          status: { in: ['READY_FOR_DISPATCH', 'IN_TRANSIT', 'COMPLETED'] },
        }),
      })
    );
  });
  it('requires authentication', async () => {
    expect((await request(app).get('/api/driver/trip')).status).toBe(401);
  });
  it.each(['LOADER', 'DISPATCHER', 'STORE_MANAGER'])(
    'rejects %s access to driver actions',
    async (role) => {
      expect(
        (
          await request(app)
            .post('/api/driver/actions')
            .set('Authorization', `Bearer ${token(role)}`)
            .send(issueAction)
        ).status
      ).toBe(403);
      expect(mocks.syncRecord.create).not.toHaveBeenCalled();
    }
  );
  it('rejects stops outside the assigned driver trip', async () => {
    mocks.trip.findFirst.mockResolvedValue(null);
    await expect(processAction('driver-1', issueAction)).rejects.toThrow('Assigned published trip');
    expect(mocks.syncRecord.create).not.toHaveBeenCalled();
  });
  it('rejects forged stop/order associations', async () => {
    await expect(
      processAction('driver-1', {
        ...issueAction,
        payload: { ...issueAction.payload, orderId: 'other-order' },
      })
    ).rejects.toThrow('Stop does not belong');
  });
  it('saves issues in the existing SyncRecord ledger', async () => {
    await processAction('driver-1', issueAction);
    expect(mocks.syncRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientSyncId: issueAction.clientSyncId,
        entityType: 'DRIVER_ISSUE',
        status: 'SYNCED',
        payload: { driverId: 'driver-1', action: issueAction.payload, createdAt },
      }),
    });
    expect(mocks.$queryRaw).toHaveBeenCalled();
  });
  it('returns duplicate action success without repeating business writes, even with JSONB key ordering', async () => {
    mocks.syncRecord.findUnique.mockResolvedValue({
      payload: {
        driverId: 'driver-1',
        createdAt,
        action: Object.fromEntries(Object.entries(issueAction.payload).reverse()),
      },
    });
    await processAction('driver-1', issueAction);
    expect(mocks.syncRecord.create).not.toHaveBeenCalled();
    expect(mocks.trip.findFirst).not.toHaveBeenCalled();
  });
  it('rejects reuse of a key with a different payload or driver', async () => {
    mocks.syncRecord.findUnique.mockResolvedValue({
      payload: { driverId: 'other-driver', action: issueAction.payload, createdAt },
    });
    await expect(processAction('driver-1', issueAction)).rejects.toThrow('Idempotency key');
  });
  it('returns per-action sync failures and retains server integrity', async () => {
    mocks.trip.findFirst.mockResolvedValue(null);
    const response = await request(app)
      .post('/api/driver/sync')
      .set('Authorization', `Bearer ${token()}`)
      .send({ actions: [issueAction] });
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      clientSyncId: issueAction.clientSyncId,
      success: false,
    });
    expect(mocks.syncRecord.create).not.toHaveBeenCalled();
  });
  it('writes full delivery, proof and shared order status', async () => {
    await processAction('driver-1', {
      ...issueAction,
      payload: {
        type: 'COMPLETE_DELIVERY',
        tripId: 'trip-1',
        stopId: 'stop-1',
        orderId: 'order-1',
        result: { outcome: DeliveryOutcome.FULL, quantities: [{ itemId: 'milk', delivered: 20 }] },
        proof: {
          recipientName: 'Receiver',
          signature: 'data:image/png;base64,YQ==',
          photos: [],
          confirmed: true,
        },
      },
    });
    expect(mocks.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'DELIVERED' },
    });
    expect(mocks.proofOfDelivery.create).toHaveBeenCalled();
  });
  it('rejects full delivery with incomplete quantities', async () => {
    await expect(
      processAction('driver-1', {
        ...issueAction,
        payload: {
          type: 'COMPLETE_DELIVERY',
          tripId: 'trip-1',
          stopId: 'stop-1',
          orderId: 'order-1',
          result: {
            outcome: DeliveryOutcome.FULL,
            quantities: [{ itemId: 'milk', delivered: 18 }],
          },
          proof: {
            recipientName: 'Receiver',
            signature: 'data:image/png;base64,YQ==',
            photos: [],
            confirmed: true,
          },
        },
      })
    ).rejects.toThrow('all expected quantities');
    expect(mocks.delivery.create).not.toHaveBeenCalled();
  });
  it('prevents finalization before all deliveries complete', async () => {
    await expect(
      processAction('driver-1', {
        ...issueAction,
        payload: { type: 'FINISH_TRIP', tripId: 'trip-1' },
      })
    ).rejects.toThrow('Complete every stop');
  });
});
