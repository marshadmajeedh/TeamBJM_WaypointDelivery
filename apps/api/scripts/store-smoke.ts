import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { prisma } from '../src/db';
import { app } from '../src/app';
// Opt-in real-database check: only uniquely identified temporary Store fixtures are removed.
async function main() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    console.error(
      'Configure DATABASE_URL and JWT_SECRET in apps/api/.env before running the database smoke test.'
    );
    process.exitCode = 1;
    return;
  }
  const runId = randomUUID();
  const userId = randomUUID();
  const outletId = randomUUID();
  const password = randomUUID();
  const depotId = 'store-check-' + runId;
  const orderIds: string[] = [];
  try {
    await prisma.user.create({
      data: {
        id: userId,
        email: runId + '@store-check.invalid',
        name: 'Temporary Store Check',
        role: 'STORE_MANAGER',
        depotId,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    await prisma.outlet.create({
      data: {
        id: outletId,
        code: 'CHECK-' + runId,
        name: 'Temporary Store Check Outlet',
        address: 'Test fixture - not a delivery destination',
        depotId,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: runId + '@store-check.invalid', password });
    assert.equal(login.status, 200, 'Existing login failed');
    const token = login.body.data.token;
    const input = {
      clientRequestId: randomUUID(),
      outletId,
      requestedDeliveryDate: new Date(Date.now() + 86400000).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Colombo',
      }),
      receivingInstructions: 'Smoke test bay instructions',
      category: 'DAILY_REPLENISHMENT',
      items: [{ productId: 'milk', quantity: 2 }],
    };
    assert.equal(
      (
        await request(app)
          .put('/api/orders/store/draft')
          .auth(token, { type: 'bearer' })
          .send(input)
      ).status,
      200
    );
    assert.equal(
      (await request(app).get('/api/orders/store/draft').auth(token, { type: 'bearer' })).body.data
        .clientRequestId,
      input.clientRequestId
    );
    const created = await request(app)
      .post('/api/orders/store')
      .auth(token, { type: 'bearer' })
      .send(input);
    assert.equal(created.status, 201, 'Order creation failed');
    const order = created.body.data;
    orderIds.push(order.id);
    const duplicate = await request(app)
      .post('/api/orders/store')
      .auth(token, { type: 'bearer' })
      .send(input);
    assert.equal(duplicate.body.data.id, order.id, 'Retry created a duplicate');
    assert.equal(
      (
        await request(app)
          .post(`/api/orders/store/${order.id}/bay`)
          .auth(token, { type: 'bearer' })
          .send({ checks: [true, true, true, true, true] })
      ).status,
      200
    );
    assert.equal(
      (await request(app).get(`/api/orders/store/${order.id}`).auth(token, { type: 'bearer' })).body
        .data.workflow.bay.userId,
      userId
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DEFERRED', deferralCount: 1 },
    });
    const slot = {
      id: randomUUID(),
      deferralCount: 1,
      start: new Date(Date.now() + 86400000).toISOString(),
      end: new Date(Date.now() + 90000000).toISOString(),
      publishedAt: new Date().toISOString(),
    };
    await prisma.syncRecord.create({
      data: {
        entityType: 'STORE_DELIVERY_SLOT',
        entityId: order.id,
        clientSyncId: runId + ':slot',
        payload: slot,
        status: 'SYNCED',
        syncedAt: new Date(),
      },
    });
    assert.equal(
      (
        await request(app)
          .post(`/api/orders/store/${order.id}/deferral`)
          .auth(token, { type: 'bearer' })
          .send({ action: 'ACCEPT', slotId: slot.id })
      ).status,
      200
    );
    // Fixture transition only; the Store module does not allocate vehicles or dispatch trips.
    await prisma.order.update({ where: { id: order.id }, data: { status: 'IN_TRANSIT' } });
    const receipt = await request(app)
      .post(`/api/receipts/store/${order.id}`)
      .auth(token, { type: 'bearer' })
      .send({
        signature: 'Temporary Store Check',
        issue: 'SHORTAGE',
        affectedItemId: order.items[0].id,
        notes: 'One unit missing in the automated test fixture.',
        dockTemperatureC: 3.8,
        received: [{ itemId: order.items[0].id, quantity: 1 }],
      });
    assert.equal(receipt.status, 201, 'Receipt confirmation failed');
    const confirmed = await request(app)
      .get(`/api/orders/store/${order.id}`)
      .auth(token, { type: 'bearer' });
    assert.equal(confirmed.body.data.status, 'PARTIAL');
    assert.equal(JSON.parse(confirmed.body.data.receiptConfirmation.notes).dockTemperatureC, 3.8);
    console.log(
      'PASS: real login, saved draft, order submission/retry, persistent bay, slot acceptance and receipt exception.'
    );
  } finally {
    // Also discover this run's orders if a request failed after a successful database commit.
    const orders = await prisma.order.findMany({ where: { outletId }, select: { id: true } });
    await prisma.syncRecord.deleteMany({
      where: { entityId: { in: [userId, ...orderIds, ...orders.map((order) => order.id)] } },
    });
    await prisma.order.deleteMany({ where: { outletId } });
    await prisma.outlet.deleteMany({ where: { id: outletId, depotId } });
    await prisma.user.deleteMany({ where: { id: userId, depotId } });
    console.log('Temporary Store test fixtures cleaned up.');
  }
}
void main()
  .catch(() => {
    console.error(
      'Store database smoke test failed. Check database connectivity and local server logs. Credentials were not printed.'
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
