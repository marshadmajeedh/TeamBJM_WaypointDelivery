import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  User,
  UserRole,
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
  TripStatus,
  LoadingStatus,
} from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { config } from '../src/config';

describe('Loader Module API Endpoints (LS-02 & LS-03)', () => {
  const mockLoaderUserId = 'loader-user-uuid-1111';
  const mockDispatcherUserId = 'dispatcher-user-uuid-2222';
  const mockTripId = 'trip-uuid-0014';

  const loaderToken = jwt.sign(
    { sub: mockLoaderUserId, role: UserRole.LOADER },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  const dispatcherToken = jwt.sign(
    { sub: mockDispatcherUserId, role: UserRole.DISPATCHER },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  const mockTrip = {
    id: mockTripId,
    tripNumber: 'TRIP-01',
    vehicleId: 'vehicle-uuid-0014',
    driverId: 'driver-uuid-0001',
    tripDate: new Date('2026-09-29T05:45:00.000Z'),
    tripSequenceNumber: 1,
    status: TripStatus.PLANNED,
    totalWeightKg: 2480,
    totalVolumeM3: 15.2,
    plannedDepartureTime: new Date('2026-09-29T05:45:00.000Z'),
    actualDepartureTime: null,
    completedTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicle: {
      id: 'vehicle-uuid-0014',
      registrationNumber: 'WP-CAD-8821',
      type: VehicleType.TRUCK,
      tempType: VehicleTemperatureType.REEFER,
      maxWeightKg: 3000,
      maxVolumeM3: 18.0,
      depotId: 'depot-peliyagoda',
    },
    driver: {
      id: 'driver-uuid-0001',
      name: 'Sunimal Silva',
      phone: '+94 77 482 1902',
      role: UserRole.DRIVER,
    },
    loadingRecords: [
      {
        id: 'loading-record-001',
        tripId: mockTripId,
        loaderId: mockLoaderUserId,
        status: LoadingStatus.NOT_STARTED,
        startedAt: null,
        completedAt: null,
        notes: JSON.stringify({ bay: 'BAY 04', preCoolTemp: '3.8°C' }),
        createdAt: new Date(),
        updatedAt: new Date(),
        loadingIssues: [],
      },
    ],
    tripOrders: [
      {
        id: 'to-1',
        tripId: mockTripId,
        orderId: 'order-1',
        sequenceNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-1',
          orderNumber: 'ORD-1042',
          totalWeightKg: 540,
          totalVolumeM3: 3.5,
          outlet: {
            id: 'outlet-1',
            code: '#104',
            name: 'Waypoint Fresh - Nugegoda',
            address: 'High Level Road, Nugegoda',
            deliveryWindowStart: '06:00 AM',
            deliveryWindowEnd: '08:00 AM',
          },
          items: [
            {
              id: 'item-1',
              productName: 'Highland Fresh Full Cream Milk',
              quantity: 20,
              unitWeightKg: 12,
              unitVolumeM3: 0.1,
              tempRequirement: TemperatureRequirement.CHILLED,
            },
          ],
        },
      },
      {
        id: 'to-2',
        tripId: mockTripId,
        orderId: 'order-2',
        sequenceNumber: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-2',
          orderNumber: 'ORD-1043',
          totalWeightKg: 820,
          totalVolumeM3: 5.1,
          outlet: {
            id: 'outlet-2',
            code: '#106',
            name: 'Waypoint Fresh - Maharagama',
            address: 'Pamunuwa Junction, Maharagama',
            deliveryWindowStart: '06:30 AM',
            deliveryWindowEnd: '08:00 AM',
          },
          items: [
            {
              id: 'item-2',
              productName: 'Keells Prime Frozen Chicken',
              quantity: 4,
              unitWeightKg: 25,
              unitVolumeM3: 0.2,
              tempRequirement: TemperatureRequirement.FROZEN,
            },
          ],
        },
      },
      {
        id: 'to-3',
        tripId: mockTripId,
        orderId: 'order-3',
        sequenceNumber: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-3',
          orderNumber: 'ORD-1044',
          totalWeightKg: 1120,
          totalVolumeM3: 6.6,
          outlet: {
            id: 'outlet-3',
            code: '#109',
            name: 'Waypoint Fresh - Kottawa',
            address: 'Expressway Access Rd, Kottawa',
            deliveryWindowStart: '07:00 AM',
            deliveryWindowEnd: '08:30 AM',
          },
          items: [
            {
              id: 'item-3',
              productName: 'Produce Commercial Carrots',
              quantity: 3,
              unitWeightKg: 50,
              unitVolumeM3: 0.3,
              tempRequirement: TemperatureRequirement.AMBIENT,
            },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/loading/tasks (LS-02 Dashboard)', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const response = await request(app).get('/api/loading/tasks');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when authenticated user is not a LOADER', async () => {
      const response = await request(app)
        .get('/api/loading/tasks')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 LOADER_DEPOT_NOT_ASSIGNED when loader is not assigned to a depot', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: null,
      } as unknown as User);

      const response = await request(app)
        .get('/api/loading/tasks')
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOADER_DEPOT_NOT_ASSIGNED');
      expect(response.body.error.message).toBe('Loader is not assigned to a depot.');
    });

    it('returns 200 with summary counters and task cards for correctly assigned LOADER', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findMany').mockResolvedValue([mockTrip] as unknown as Awaited<ReturnType<typeof prisma.trip.findMany>>);

      const response = await request(app)
        .get('/api/loading/tasks')
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const { summary, tasks } = response.body.data;
      expect(summary).toBeDefined();
      expect(summary.vehiclesToLoad).toBe(1);
      expect(summary.activeBaysCount).toBe(1);

      expect(tasks).toHaveLength(1);
      const task = tasks[0];
      expect(task.id).toBe(mockTripId);
      expect(task.bay).toBe('BAY 04');
      expect(task.status).toBe(LoadingStatus.NOT_STARTED);
      expect(task.vehicle.registrationNumber).toBe('WP-CAD-8821');
      expect(task.vehicle.tempType).toBe(VehicleTemperatureType.REEFER);
      expect(task.ordersCount).toBe(3);
      expect(task.stopsCount).toBe(3);
      expect(task.progress.totalItems).toBe(27);
    });

    it('never exposes password hashes or authentication secrets', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findMany').mockResolvedValue([mockTrip] as unknown as Awaited<ReturnType<typeof prisma.trip.findMany>>);

      const response = await request(app)
        .get('/api/loading/tasks')
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      const rawString = JSON.stringify(response.body);
      expect(rawString).not.toContain('passwordHash');
      expect(rawString).not.toContain('password');
    });
  });

  describe('GET /api/loading/tasks/:tripId (LS-03 Vehicle Loading Details)', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const response = await request(app).get(`/api/loading/tasks/${mockTripId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when authenticated user is not a LOADER', async () => {
      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 LOADER_DEPOT_NOT_ASSIGNED when loader is not assigned to a depot', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: null,
      } as unknown as User);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOADER_DEPOT_NOT_ASSIGNED');
      expect(response.body.error.message).toBe('Loader is not assigned to a depot.');
    });

    it('returns 404 when trip is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/loading/tasks/non-existent-id')
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when loader attempts to access a trip belonging to another depot', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-kandy', // different depot
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>); // trip is at depot-peliyagoda

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Access forbidden: Trip belongs to another depot.');
    });

    it('returns 200 with vehicle capacities, temperature specs, and LIFO stop sequence for correctly assigned loader', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const details = response.body.data;
      expect(details.tripId).toBe(mockTripId);
      expect(details.bay).toBe('BAY 04');
      expect(details.driver?.name).toBe('Sunimal Silva');

      // Capacities verification
      expect(details.capacities.usedWeightKg).toBe(2480);
      expect(details.capacities.weightCapacityKg).toBe(3000);
      expect(details.capacities.weightPercentage).toBe(82.7);
      expect(details.capacities.usedVolumeM3).toBe(15.2);
      expect(details.capacities.volumeCapacityM3).toBe(18.0);
      expect(details.capacities.volumePercentage).toBe(84.4);

      // Temperature specs verification
      expect(details.temperatureSpecs.isReefer).toBe(true);
      expect(details.temperatureSpecs.vehicleTempType).toBe(VehicleTemperatureType.REEFER);

      // Consignment & units verification
      expect(details.consignment.outletCount).toBe(3);
      expect(details.consignment.totalLineUnits).toBe(27);

      // LIFO stops verification
      expect(details.stops).toHaveLength(3);
      // Stop 1 is unloaded first -> staged at door position
      expect(details.stops[0].stopSequence).toBe(1);
      expect(details.stops[0].lifoPositionLabel).toBe('Door Position');
      expect(details.stops[0].outlet.name).toBe('Waypoint Fresh - Nugegoda');

      // Stop 3 is unloaded last -> staged at front bulkhead
      expect(details.stops[2].stopSequence).toBe(3);
      expect(details.stops[2].lifoPositionLabel).toBe('Front Bulkhead');
      expect(details.stops[2].outlet.name).toBe('Waypoint Fresh - Kottawa');
    });
  });

  describe('Loader Feature 2: LS-04 Loading Sequence & LS-05 Loading Checklist', () => {
    const testItemId = 'item-1';

    it('1. rejects unauthenticated sequence request with 401', async () => {
      const response = await request(app).get(`/api/loading/tasks/${mockTripId}/sequence`);
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('2. rejects non-loader role from sequence endpoint with 403', async () => {
      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/sequence`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('3. rejects loader without depotId with 403 LOADER_DEPOT_NOT_ASSIGNED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: null,
      } as unknown as User);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/sequence`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOADER_DEPOT_NOT_ASSIGNED');
      expect(response.body.error.message).toBe('Loader is not assigned to a depot.');
    });

    it('4. rejects cross-depot sequence request with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-kandy', // Different depot
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/sequence`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Access forbidden: Trip belongs to another depot.');
    });

    it('5. returns 200 with reverse-stop loading sequence for valid loader (LS-04)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/sequence`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.tripId).toBe(mockTripId);
      expect(data.bay).toBe('BAY 04');
      expect(data.mandatoryRule).toContain('Load items for later stops FIRST');
      expect(data.stops).toHaveLength(3);

      // Verify reverse-stop loading order: Stop 3 (Kottawa) is physically loaded first
      expect(data.stops[0].stopSequence).toBe(3);
      expect(data.stops[0].lifoStagingOrder).toBe(1);
      expect(data.stops[0].priorityLabel).toBe('LOAD FIRST - REAR BULKHEAD');
      expect(data.stops[0].stepLabel).toBe('STEP 1 • FIRST TO LOAD');
      expect(data.stops[0].outlet.name).toBe('Waypoint Fresh - Kottawa');

      // Stop 2 (Maharagama) is loaded next
      expect(data.stops[1].stopSequence).toBe(2);
      expect(data.stops[1].lifoStagingOrder).toBe(2);
      expect(data.stops[1].priorityLabel).toBe('LOAD NEXT - MID CABIN');
      expect(data.stops[1].stepLabel).toBe('STEP 2 • NEXT TO LOAD');

      // Stop 1 (Nugegoda) is loaded last (first offload)
      expect(data.stops[2].stopSequence).toBe(1);
      expect(data.stops[2].lifoStagingOrder).toBe(3);
      expect(data.stops[2].priorityLabel).toBe('LOAD LAST - UNLOAD FIRST');
      expect(data.stops[2].stepLabel).toBe('STEP 3 • LAST TO LOAD');
      expect(data.stops[2].isImmediateDispatch).toBe(true);
    });

    it('6. returns 200 with grouped stops checklist and progress for valid loader (LS-05)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/checklist`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.tripId).toBe(mockTripId);
      expect(data.overallProgress.totalRequired).toBe(27);
      expect(data.stops).toHaveLength(3);

      // Check first stop item
      const stop1 = data.stops[0];
      expect(stop1.outlet.name).toBe('Waypoint Fresh - Nugegoda');
      expect(stop1.items.length).toBeGreaterThan(0);
      expect(stop1.items[0].requiredQuantity).toBe(20);
      expect(stop1.items[0].sku).toBeDefined();
      expect(stop1.items[0].unit).toBeDefined();
    });

    it('7. rejects item update for item not belonging to trip with 404', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/non-existent-item-uuid`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: 5 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('8. rejects negative loaded quantity with 400 VALIDATION_ERROR', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const response = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: -5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('9. rejects loaded quantity above permitted maximum with 400 EXCEEDS_PERMITTED_QUANTITY', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      // item-1 has required quantity 10
      const response = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: 25 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EXCEEDS_PERMITTED_QUANTITY');
      expect(response.body.error.message).toContain('cannot exceed permitted maximum');
    });

    it('10. persists valid quantity update into LoadingRecord and transitions status to IN_PROGRESS', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);
      const updateSpy = vi.spyOn(prisma.loadingRecord, 'update').mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.loadingRecord.update>>);

      const response = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(updateSpy).toHaveBeenCalled();

      // Check payload passed to update
      const updateCallArgs = updateSpy.mock.calls[0][0];
      expect(updateCallArgs.data.status).toBe(LoadingStatus.IN_PROGRESS);
      const parsedNotes = JSON.parse(updateCallArgs.data.notes as string);
      expect(parsedNotes.items[testItemId].loadedQuantity).toBe(10);
    });

    it('11. returns updated item and calculated progress correctly', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      // Create trip fixture where notes has 10 units loaded
      const mockTripWithLoaded = {
        ...mockTrip,
        loadingRecords: [
          {
            ...mockTrip.loadingRecords[0],
            status: LoadingStatus.IN_PROGRESS,
            notes: JSON.stringify({
              bay: 'BAY 04',
              items: {
                [testItemId]: { loadedQuantity: 10, stagedQuantity: 10 },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTripWithLoaded as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);
      vi.spyOn(prisma.loadingRecord, 'update').mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.loadingRecord.update>>);

      const response = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.item.loadedQuantity).toBe(10);
      expect(response.body.data.item.isLoaded).toBe(true);
      expect(response.body.data.loadingStatus).toBe(LoadingStatus.IN_PROGRESS);
      expect(response.body.data.overallProgress.totalLoaded).toBe(10);
      expect(response.body.data.overallProgress.totalRequired).toBe(27);
    });

    it('12. ensures sequence and checklist responses do not expose sensitive driver or dispatcher secrets', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const seqRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/sequence`)
        .set('Authorization', `Bearer ${loaderToken}`);

      const checkRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/checklist`)
        .set('Authorization', `Bearer ${loaderToken}`);

      const rawSeq = JSON.stringify(seqRes.body);
      const rawCheck = JSON.stringify(checkRes.body);

      expect(rawSeq).not.toContain('password');
      expect(rawSeq).not.toContain('hash');
      expect(rawSeq).not.toContain('jwt');

      expect(rawCheck).not.toContain('password');
      expect(rawCheck).not.toContain('hash');
      expect(rawCheck).not.toContain('jwt');
    });
  });

  describe('Loader Feature 3: LS-06 Report Loading Issue', () => {
    const testItemId = 'item-1';

    it('1. rejects unauthenticated issue submission with 401', async () => {
      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 2,
          description: 'Only 18 cartons staged from cold vault #2.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('2. rejects non-loader role from issue submission with 403', async () => {
      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 2,
          description: 'Only 18 cartons staged from cold vault #2.',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('3. rejects loader without depotId with 403 LOADER_DEPOT_NOT_ASSIGNED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: null,
      } as unknown as User);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 2,
          description: 'Only 18 cartons staged from cold vault #2.',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOADER_DEPOT_NOT_ASSIGNED');
    });

    it('4. rejects cross-depot issue submission with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-kandy',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 2,
          description: 'Only 18 cartons staged from cold vault #2.',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('5. returns valid issue reporting context for trip and item', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/issue-context?itemId=${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedItem.id).toBe(testItemId);
      expect(response.body.data.selectedItem.expectedQuantity).toBe(20);
      expect(response.body.data.vehicle.registrationNumber).toBe('WP-CAD-8821');
      expect(response.body.data.bay).toBe('BAY 04');
    });

    it('6. rejects issue submission with invalid or non-existent item id', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: 'non-existent-item-id',
          type: 'MISSING',
          quantity: 2,
          description: 'Only 18 cartons staged from cold vault #2.',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('7. rejects issue submission with invalid quantity (negative or zero)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 0,
          description: 'Zero quantity is invalid.',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('8. rejects issue submission with quantity exceeding manifest expected amount', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 999,
          description: 'Excessive shortage quantity reported.',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    });

    it('9. persists valid loading issue and transitions trip loading status to ISSUE_REPORTED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const mockCreatedIssue = {
        id: 'issue-uuid-1',
        loadingRecordId: 'rec-1',
        orderItemId: testItemId,
        issueType: 'MISSING',
        description: 'Only 8 cartons staged from cold vault #2.',
        resolved: false,
        reportedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.loadingIssue, 'create').mockResolvedValue(mockCreatedIssue as unknown as Awaited<ReturnType<typeof prisma.loadingIssue.create>>);
      vi.spyOn(prisma.loadingRecord, 'update').mockResolvedValue({
        id: 'rec-1',
        status: LoadingStatus.ISSUE_REPORTED,
      } as unknown as Awaited<ReturnType<typeof prisma.loadingRecord.update>>);

      const response = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 2,
          description: 'Only 8 cartons staged from cold vault #2.',
          expectedQuantity: 10,
          actualQuantity: 8,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('issue-uuid-1');
      expect(response.body.data.orderItemId).toBe(testItemId);
      expect(response.body.data.issueType).toBe('MISSING');
      expect(response.body.data.loadingStatus).toBe(LoadingStatus.ISSUE_REPORTED);
    });

    it('10. verifies LoadingIssue persistence is reflected in subsequent checklist fetch', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const tripWithIssue = {
        ...mockTrip,
        loadingRecords: [
          {
            id: 'rec-1',
            status: LoadingStatus.ISSUE_REPORTED,
            loadingIssues: [
              {
                id: 'issue-uuid-1',
                orderItemId: testItemId,
                issueType: 'MISSING',
                description: 'Shortage reported: 2 cartons missing.',
                resolved: false,
              },
            ],
            notes: JSON.stringify({
              bay: 'Bay 04',
              items: {
                [testItemId]: {
                  requiredQuantity: 10,
                  stagedQuantity: 8,
                  loadedQuantity: 8,
                  status: 'DISCREPANCY',
                },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(tripWithIssue as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const checklistRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/checklist`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(checklistRes.status).toBe(200);
      const affectedItem = checklistRes.body.data.stops
        .flatMap((s: { items: Array<{ id: string; status: string }> }) => s.items)
        .find((i: { id: string }) => i.id === testItemId);

      expect(affectedItem.status).toBe('DISCREPANCY');
      expect(checklistRes.body.data.overallProgress.shortageAlertCount).toBeGreaterThanOrEqual(1);
    });

    it('11. ensures issue responses do not expose sensitive driver or dispatcher secrets', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const contextRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/issue-context?itemId=${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`);

      const raw = JSON.stringify(contextRes.body);
      expect(raw).not.toContain('password');
      expect(raw).not.toContain('hash');
      expect(raw).not.toContain('jwt');
    });
  });

  describe('Loader Feature 4: Loading Review & Ready for Dispatch (LS-07)', () => {
    const testItemId = 'item-1';

    it('1. rejects unauthenticated access to review endpoint with 401', async () => {
      const response = await request(app).get(`/api/loading/tasks/${mockTripId}/review`);
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('2. rejects non-loader role accessing review endpoint with 403', async () => {
      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${dispatcherToken}`);
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('3. rejects loader without depot accessing review endpoint with 403 LOADER_DEPOT_NOT_ASSIGNED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: null,
      } as unknown as User);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LOADER_DEPOT_NOT_ASSIGNED');
    });

    it('4. rejects cross-depot trip review with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const crossDepotTrip = {
        ...mockTrip,
        vehicle: {
          ...mockTrip.vehicle,
          depotId: 'depot-kandy',
        },
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(crossDepotTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('5. returns full LS-07 loading review data for valid depot loader', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const response = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tripId).toBe(mockTripId);
      expect(response.body.data.vehicle.registrationNumber).toBe('WP-CAD-8821');
      expect(response.body.data.driver.name).toBe('Sunimal Silva');
      expect(response.body.data.bay).toBe('BAY 04');
      expect(response.body.data.finalChecklist).toHaveLength(5);
      expect(response.body.data.stops).toBeInstanceOf(Array);
      expect(response.body.data.capacities.isWeightCompliant).toBe(true);
      expect(response.body.data.temperatureProfile.isReefer).toBe(true);
    });

    it('6. blocks dispatch when checklist is incomplete and returns 409 LOADING_NOT_READY on ready attempt', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      // Incomplete trip (0 loaded items out of 20)
      const incompleteTrip = {
        ...mockTrip,
        loadingRecords: [
          {
            id: 'rec-incomplete',
            status: LoadingStatus.IN_PROGRESS,
            loadingIssues: [],
            notes: JSON.stringify({
              bay: 'BAY 04',
              items: {
                [testItemId]: {
                  requiredQuantity: 20,
                  stagedQuantity: 20,
                  loadedQuantity: 5,
                },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(incompleteTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      // GET review shows canDispatch === false
      const reviewRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.canDispatch).toBe(false);
      expect(reviewRes.body.data.checklistComplete).toBe(false);

      // POST ready is rejected with 409 LOADING_NOT_READY
      const readyRes = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/ready`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(readyRes.status).toBe(409);
      expect(readyRes.body.error.code).toBe('LOADING_NOT_READY');
    });

    it('7. blocks dispatch when trip has unresolved issues and returns 409 UNRESOLVED_LOADING_ISSUES', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const tripWithUnresolvedIssue = {
        ...mockTrip,
        loadingRecords: [
          {
            id: 'rec-issue',
            status: LoadingStatus.ISSUE_REPORTED,
            loadingIssues: [
              {
                id: 'issue-unresolved-1',
                orderItemId: testItemId,
                issueType: 'MISSING',
                description: '2 cartons short from intake vault',
                resolved: false,
                reportedAt: new Date(),
              },
            ],
            notes: JSON.stringify({
              bay: 'BAY 04',
              items: {
                [testItemId]: {
                  requiredQuantity: 20,
                  stagedQuantity: 20,
                  loadedQuantity: 20,
                },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(tripWithUnresolvedIssue as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      // Review reports unresolved issue count and blocks dispatch
      const reviewRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.canDispatch).toBe(false);
      expect(reviewRes.body.data.unresolvedIssueCount).toBe(1);
      expect(reviewRes.body.data.unresolvedIssues[0].issueType).toBe('MISSING');

      // Ready attempt fails closed with 409 UNRESOLVED_LOADING_ISSUES
      const readyRes = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/ready`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(readyRes.status).toBe(409);
      expect(readyRes.body.error.code).toBe('UNRESOLVED_LOADING_ISSUES');
    });

    it('8. allows dispatch when checklist is complete and no unresolved issues exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const completeTrip = {
        ...mockTrip,
        loadingRecords: [
          {
            id: 'rec-complete',
            status: LoadingStatus.IN_PROGRESS,
            loadingIssues: [],
            notes: JSON.stringify({
              bay: 'BAY 04',
              items: {
                'item-1': {
                  requiredQuantity: 20,
                  stagedQuantity: 20,
                  loadedQuantity: 20,
                },
                'item-2': {
                  requiredQuantity: 4,
                  stagedQuantity: 4,
                  loadedQuantity: 4,
                },
                'item-3': {
                  requiredQuantity: 3,
                  stagedQuantity: 3,
                  loadedQuantity: 3,
                },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(completeTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const reviewRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.canDispatch).toBe(true);
      expect(reviewRes.body.data.checklistComplete).toBe(true);
      expect(reviewRes.body.data.unresolvedIssueCount).toBe(0);
    });

    it('9. confirms ready for dispatch and updates Trip and LoadingRecord to READY_FOR_DISPATCH', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const completeTrip = {
        ...mockTrip,
        loadingRecords: [
          {
            id: 'rec-complete',
            status: LoadingStatus.IN_PROGRESS,
            loadingIssues: [],
            notes: JSON.stringify({
              bay: 'BAY 04',
              items: {
                'item-1': {
                  requiredQuantity: 20,
                  stagedQuantity: 20,
                  loadedQuantity: 20,
                },
                'item-2': {
                  requiredQuantity: 4,
                  stagedQuantity: 4,
                  loadedQuantity: 4,
                },
                'item-3': {
                  requiredQuantity: 3,
                  stagedQuantity: 3,
                  loadedQuantity: 3,
                },
              },
            }),
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(completeTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);
      const loadingRecordUpdateSpy = vi.spyOn(prisma.loadingRecord, 'update').mockResolvedValue({
        id: 'rec-complete',
        status: LoadingStatus.READY_FOR_DISPATCH,
      } as unknown as Awaited<ReturnType<typeof prisma.loadingRecord.update>>);
      const tripUpdateSpy = vi.spyOn(prisma.trip, 'update').mockResolvedValue({
        id: mockTripId,
        status: TripStatus.READY_FOR_DISPATCH,
      } as unknown as Awaited<ReturnType<typeof prisma.trip.update>>);

      const readyRes = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/ready`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(readyRes.status).toBe(200);
      expect(readyRes.body.success).toBe(true);
      expect(readyRes.body.data.loadingStatus).toBe(LoadingStatus.READY_FOR_DISPATCH);
      expect(readyRes.body.data.tripStatus).toBe(TripStatus.READY_FOR_DISPATCH);
      expect(readyRes.body.data.completedAt).toBeDefined();

      expect(loadingRecordUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LoadingStatus.READY_FOR_DISPATCH,
          }),
        })
      );
      expect(tripUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TripStatus.READY_FOR_DISPATCH,
          }),
        })
      );
    });

    it('10. repeated ready confirmation is idempotent and returns completed state safely', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const alreadyReadyTrip = {
        ...mockTrip,
        status: TripStatus.READY_FOR_DISPATCH,
        loadingRecords: [
          {
            id: 'rec-already-ready',
            status: LoadingStatus.READY_FOR_DISPATCH,
            completedAt: new Date('2026-09-30T06:00:00Z'),
            loadingIssues: [],
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(alreadyReadyTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const readyRes = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/ready`)
        .set('Authorization', `Bearer ${loaderToken}`);

      expect(readyRes.status).toBe(200);
      expect(readyRes.body.success).toBe(true);
      expect(readyRes.body.data.loadingStatus).toBe(LoadingStatus.READY_FOR_DISPATCH);
    });

    it('11. prevents checklist quantity modification on a completed trip with 409 LOADING_ALREADY_COMPLETED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const completedTrip = {
        ...mockTrip,
        status: TripStatus.READY_FOR_DISPATCH,
        loadingRecords: [
          {
            id: 'rec-completed',
            status: LoadingStatus.READY_FOR_DISPATCH,
            loadingIssues: [],
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(completedTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const patchRes = await request(app)
        .patch(`/api/loading/tasks/${mockTripId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({ loadedQuantity: 19 });

      expect(patchRes.status).toBe(409);
      expect(patchRes.body.error.code).toBe('LOADING_ALREADY_COMPLETED');
    });

    it('12. prevents new issue creation on a completed trip with 409 LOADING_ALREADY_COMPLETED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      const completedTrip = {
        ...mockTrip,
        status: TripStatus.READY_FOR_DISPATCH,
        loadingRecords: [
          {
            id: 'rec-completed',
            status: LoadingStatus.READY_FOR_DISPATCH,
            loadingIssues: [],
          },
        ],
      };

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(completedTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const issueRes = await request(app)
        .post(`/api/loading/tasks/${mockTripId}/issues`)
        .set('Authorization', `Bearer ${loaderToken}`)
        .send({
          itemId: testItemId,
          type: 'MISSING',
          quantity: 1,
          description: 'Late shortage report after dispatch confirmation.',
        });

      expect(issueRes.status).toBe(409);
      expect(issueRes.body.error.code).toBe('LOADING_ALREADY_COMPLETED');
    });

    it('13. ensures review response does not expose passwords, hashes, or secret tokens', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: mockLoaderUserId,
        depotId: 'depot-peliyagoda',
      } as unknown as User);

      vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(mockTrip as unknown as Awaited<ReturnType<typeof prisma.trip.findUnique>>);

      const reviewRes = await request(app)
        .get(`/api/loading/tasks/${mockTripId}/review`)
        .set('Authorization', `Bearer ${loaderToken}`);

      const raw = JSON.stringify(reviewRes.body);
      expect(raw).not.toContain('password');
      expect(raw).not.toContain('passwordHash');
      expect(raw).not.toContain('jwt');
    });
  });
});
