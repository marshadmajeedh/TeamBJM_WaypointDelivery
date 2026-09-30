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
});
