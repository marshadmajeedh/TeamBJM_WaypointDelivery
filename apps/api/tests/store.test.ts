import { workflowFor } from '../src/modules/orders/store-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { createOrderSchema } from '../src/modules/orders/store-service';
import { receiptSchema } from '../src/modules/receipts/store-routes';

const { db } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    outlet: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    order: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    receiptConfirmation: { create: vi.fn() },
    syncRecord: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock('../src/db', () => ({ prisma: db }));
const token = (role = 'STORE_MANAGER') => jwt.sign({ sub: 'manager-1', role }, config.jwtSecret);
const draft = {
  outletId: 'outlet-1',
  requestedDeliveryDate: '2099-12-01',
  items: [
    { productId: 'milk', quantity: 15 },
    { productId: 'chicken', quantity: 8 },
    { productId: 'carrots', quantity: 20 },
  ],
};
const receipt = {
  signature: 'Store Manager',
  issue: 'NONE',
  notes: '',
  received: [{ itemId: 'line-1', quantity: 10 }],
};
beforeEach(() => {
  vi.resetAllMocks();
  db.syncRecord.findUnique.mockResolvedValue(null);
  db.syncRecord.findMany.mockResolvedValue([]);
  db.syncRecord.create.mockResolvedValue({});
  db.syncRecord.upsert.mockImplementation(async (args) => args.create);
  db.syncRecord.deleteMany.mockResolvedValue({ count: 1 });
  db.user.findUnique.mockResolvedValue({ depotId: 'depot-1', role: 'STORE_MANAGER' });
  db.outlet.findFirst.mockResolvedValue({ id: 'outlet-1' });
  db.order.findFirst.mockResolvedValue({
    id: 'order-1',
    outletId: 'outlet-1',
    status: 'IN_TRANSIT',
    receiptConfirmation: null,
    deferralCount: 1,
    items: [{ id: 'line-1', quantity: 10 }],
  });
  db.order.create.mockImplementation(async (args) => ({
    ...args.data,
    id: 'order-1',
    deferralCount: 0,
  }));
  db.receiptConfirmation.create.mockResolvedValue({ id: 'receipt-1' });
  db.$transaction.mockImplementation(async (callback) => callback(db));
});
describe('Store Manager API boundaries', () => {
  it('saves outlet coordinates only inside the authenticated depot', async () => {
    db.outlet.updateMany.mockResolvedValue({ count: 1 });
    const result = await request(app)
      .put('/api/orders/store/order-1/location')
      .auth(token(), { type: 'bearer' })
      .send({ latitude: 6.9, longitude: 79.8 });
    expect(result.status).toBe(200);
    expect(db.outlet.updateMany).toHaveBeenCalledWith({
      where: { id: 'outlet-1', depotId: 'depot-1' },
      data: { latitude: 6.9, longitude: 79.8 },
    });
  });
  it('rejects invalid coordinates and inaccessible orders without updating an outlet', async () => {
    const url = '/api/orders/store/order-1/location';
    expect(
      (
        await request(app)
          .put(url)
          .auth(token(), { type: 'bearer' })
          .send({ latitude: 91, longitude: 79.8 })
      ).status
    ).toBe(400);
    db.order.findFirst.mockResolvedValue(null);
    expect(
      (
        await request(app)
          .put(url)
          .auth(token(), { type: 'bearer' })
          .send({ latitude: 6.9, longitude: 79.8 })
      ).status
    ).toBe(404);
    expect(db.outlet.updateMany).not.toHaveBeenCalled();
  });
  it('requires authentication and rejects other roles', async () => {
    expect((await request(app).get('/api/orders/store')).status).toBe(401);
    expect(
      (await request(app).get('/api/orders/store').auth(token('DRIVER'), { type: 'bearer' })).status
    ).toBe(403);
  });
  it('fails closed when the manager has no depot', async () => {
    db.user.findUnique.mockResolvedValue({ depotId: null, role: 'STORE_MANAGER' });
    expect(
      (await request(app).get('/api/orders/store').auth(token(), { type: 'bearer' })).status
    ).toBe(403);
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
  it('scopes order reads to the current depot', async () => {
    db.order.findMany.mockResolvedValue([]);
    const result = await request(app).get('/api/orders/store').auth(token(), { type: 'bearer' });
    expect(result.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { outlet: { depotId: 'depot-1' } } })
    );
  });
  it('does not expose an order outside the depot', async () => {
    db.order.findFirst.mockResolvedValue(null);
    expect(
      (await request(app).get('/api/orders/store/foreign').auth(token(), { type: 'bearer' })).status
    ).toBe(404);
  });
  it('rejects creation for another depot outlet', async () => {
    db.outlet.findFirst.mockResolvedValue(null);
    expect(
      (await request(app).post('/api/orders/store').auth(token(), { type: 'bearer' }).send(draft))
        .status
    ).toBe(403);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it('computes totals server-side and creates the manifest', async () => {
    const result = await request(app)
      .post('/api/orders/store')
      .auth(token(), { type: 'bearer' })
      .send(draft);
    expect(result.status).toBe(201);
    expect(result.body.data.totalWeightKg).toBe(505);
    expect(result.body.data.totalVolumeM3).toBeCloseTo(0.81);
    expect(result.body.data.status).toBe('CONFIRMED');
  });
  it('rejects empty, duplicate, unknown, fractional and past-date orders', () => {
    for (const input of [
      { ...draft, items: [] },
      { ...draft, items: [draft.items[0], draft.items[0]] },
      { ...draft, items: [{ productId: 'unknown', quantity: 1 }] },
      { ...draft, items: [{ productId: 'milk', quantity: 1.2 }] },
      { ...draft, requestedDeliveryDate: '2000-01-01' },
      { ...draft, requestedDeliveryDate: '2099-02-31' },
    ])
      expect(createOrderSchema.safeParse(input).success).toBe(false);
  });
  it('does not accept client-supplied totals', async () => {
    expect(
      (
        await request(app)
          .post('/api/orders/store')
          .auth(token(), { type: 'bearer' })
          .send({ ...draft, totalWeightKg: 1 })
      ).status
    ).toBe(400);
  });
  it('rejects incomplete receipt manifests and undisclosed shortage', async () => {
    for (const received of [
      [{ itemId: 'foreign', quantity: 10 }],
      [{ itemId: 'line-1', quantity: 8 }],
      [{ itemId: 'line-1', quantity: 11 }],
    ])
      expect(
        (
          await request(app)
            .post('/api/receipts/store/order-1')
            .auth(token(), { type: 'bearer' })
            .send({ ...receipt, received })
        ).status
      ).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('persists exception details with the authenticated signer and updates status atomically', async () => {
    const input = {
      ...receipt,
      issue: 'SHORTAGE',
      affectedItemId: 'line-1',
      notes: 'Two crates missing from delivery.',
      received: [{ itemId: 'line-1', quantity: 8 }],
    };
    const result = await request(app)
      .post('/api/receipts/store/order-1')
      .auth(token(), { type: 'bearer' })
      .send(input);
    expect(result.status).toBe(201);
    expect(db.receiptConfirmation.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        confirmedByUserId: 'manager-1',
        status: 'EXCEPTION',
        notes: expect.any(String),
      },
    });
    expect(JSON.parse(db.receiptConfirmation.create.mock.calls[0][0].data.notes)).toEqual(input);
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PARTIAL' },
    });
  });
  it('rejects premature or duplicate receipts', async () => {
    for (const override of [
      { status: 'CONFIRMED', receiptConfirmation: null },
      { status: 'DELIVERED', receiptConfirmation: { id: 'existing' } },
    ]) {
      db.order.findFirst.mockResolvedValue({
        id: 'order-1',
        items: [{ id: 'line-1', quantity: 10 }],
        ...override,
      });
      expect(
        (
          await request(app)
            .post('/api/receipts/store/order-1')
            .auth(token(), { type: 'bearer' })
            .send(receipt)
        ).status
      ).toBe(409);
    }
  });
  it('requires an explanation for an exception', () => {
    expect(
      receiptSchema.safeParse({
        ...receipt,
        issue: 'DAMAGED',
        affectedItemId: 'line-1',
        notes: 'bad',
      }).success
    ).toBe(false);
  });
});

describe('Durable Store actions', () => {
  it('saves and reloads a user-scoped draft', async () => {
    const put = await request(app)
      .put('/api/orders/store/draft')
      .auth(token(), { type: 'bearer' })
      .send(draft);
    expect(put.status).toBe(200);
    expect(db.syncRecord.upsert.mock.calls[0][0].where.clientSyncId).toBe('store:draft:manager-1');
    db.syncRecord.findUnique.mockResolvedValue({ payload: draft });
    const get = await request(app).get('/api/orders/store/draft').auth(token(), { type: 'bearer' });
    expect(get.body.data).toEqual(draft);
  });
  it('rejects incomplete bay checklists and persists completed ones', async () => {
    const url = '/api/orders/store/order-1/bay';
    expect(
      (
        await request(app)
          .post(url)
          .auth(token(), { type: 'bearer' })
          .send({ checks: [true, true, false, true, true] })
      ).status
    ).toBe(400);
    const result = await request(app)
      .post(url)
      .auth(token(), { type: 'bearer' })
      .send({ checks: [true, true, true, true, true] });
    expect(result.status).toBe(200);
    expect(result.body.data.userId).toBe('manager-1');
    expect(db.syncRecord.upsert.mock.calls[0][0].create.entityType).toBe('STORE_BAY_READY');
  });
  it('rejects stale revised slots and accepts the published slot', async () => {
    db.order.findFirst.mockResolvedValue({ id: 'order-1', status: 'DEFERRED', deferralCount: 1 });
    const slot = {
      id: 'revision-2',
      deferralCount: 1,
      start: '2099-12-01T06:00:00+05:30',
      end: '2099-12-01T08:00:00+05:30',
      publishedAt: '2099-11-30T12:00:00Z',
    };
    db.syncRecord.findMany.mockResolvedValue([
      { entityId: 'order-1', entityType: 'STORE_DELIVERY_SLOT', payload: slot },
    ]);
    const url = '/api/orders/store/order-1/deferral';
    expect(
      (
        await request(app)
          .post(url)
          .auth(token(), { type: 'bearer' })
          .send({ action: 'ACCEPT', slotId: 'revision-1' })
      ).status
    ).toBe(409);
    const result = await request(app)
      .post(url)
      .auth(token(), { type: 'bearer' })
      .send({ action: 'ACCEPT', slotId: slot.id });
    expect(result.status).toBe(200);
    expect(result.body.data.slotId).toBe(slot.id);
  });
  it('returns an existing submission instead of creating duplicates', async () => {
    const input = { ...draft, clientRequestId: '11111111-1111-4111-8111-111111111111' };
    db.syncRecord.findUnique.mockResolvedValue({
      entityId: 'order-1',
      payload: { ...input, submittedBy: 'manager-1' },
    });
    const result = await request(app)
      .post('/api/orders/store')
      .auth(token(), { type: 'bearer' })
      .send(input);
    expect(result.status).toBe(200);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it('rejects active content disguised as photo proof', async () => {
    const response = await request(app)
      .post('/api/receipts/store/order-1')
      .auth(token(), { type: 'bearer' })
      .send({
        ...receipt,
        proof: { name: 'proof.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
      });
    expect(response.status).toBe(400);
  });
  it('persists an image proof and measured dock temperature', async () => {
    const input = {
      ...receipt,
      proof: { name: 'waybill.jpg', dataUrl: 'data:image/jpeg;base64,/9j/2Q==' },
      dockTemperatureC: 3.8,
    };
    const result = await request(app)
      .post('/api/receipts/store/order-1')
      .auth(token(), { type: 'bearer' })
      .send(input);
    expect(result.status).toBe(201);
    const saved = JSON.parse(db.receiptConfirmation.create.mock.calls[0][0].data.notes);
    expect(saved.proof).toEqual(input.proof);
    expect(saved.dockTemperatureC).toBe(3.8);
  });
});

it('keeps saved draft items when their delivery date has passed', async () => {
  const input = { ...draft, requestedDeliveryDate: '2020-01-01' };
  db.syncRecord.findUnique.mockResolvedValue({ payload: input });
  const result = await request(app)
    .get('/api/orders/store/draft')
    .auth(token(), { type: 'bearer' });
  expect(result.body.data.items).toEqual(draft.items);
  expect(result.body.data.requestedDeliveryDate).toBe('2020-01-01');
});
it('rejects a reused request ID with a changed manifest', async () => {
  const input = { ...draft, clientRequestId: '11111111-1111-4111-8111-111111111111' };
  db.syncRecord.findUnique.mockResolvedValue({
    entityId: 'order-1',
    payload: { ...input, receivingInstructions: 'Original manifest', submittedBy: 'manager-1' },
  });
  expect(
    (await request(app).post('/api/orders/store').auth(token(), { type: 'bearer' }).send(input))
      .status
  ).toBe(409);
});

it('does not reuse a delivery slot from an earlier deferral', () => {
  const state = workflowFor({ id: 'order-1', deferralCount: 2 }, [
    {
      entityId: 'order-1',
      entityType: 'STORE_DELIVERY_SLOT',
      payload: {
        id: 'old',
        deferralCount: 1,
        start: '2099-01-01T01:00:00Z',
        end: '2099-01-01T02:00:00Z',
        publishedAt: '2098-12-31T12:00:00Z',
      },
    },
  ]);
  expect(state.slot).toBeNull();
});
it('marks old telemetry stale and preserves fresh readings', () => {
  const payload = {
    capturedAt: new Date(Date.now() - 180000).toISOString(),
    eta: null,
    latitude: 6.8,
    longitude: 79.9,
    chilledC: 3.8,
    frozenC: -18.2,
    stopsAway: 2,
  };
  const records = [{ entityId: 'order-1', entityType: 'DELIVERY_TELEMETRY', payload }];
  expect(workflowFor({ id: 'order-1', deferralCount: 0 }, records).telemetry?.stale).toBe(true);
  payload.capturedAt = new Date().toISOString();
  expect(workflowFor({ id: 'order-1', deferralCount: 0 }, records).telemetry?.stale).toBe(false);
});
