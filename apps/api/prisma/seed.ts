import {
  PrismaClient,
  UserRole,
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
  TripStatus,
  LoadingStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

interface SeedUserConfig {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  depotId?: string;
  envPasswordKey: string;
}

const SEED_USERS: SeedUserConfig[] = [
  {
    email: 'storemanager@waypoint.local',
    name: 'Store Manager User',
    role: UserRole.STORE_MANAGER,
    phone: '+94 11 234 1111',
    depotId: 'depot-peliyagoda',
    envPasswordKey: 'SEED_STORE_MANAGER_PASSWORD',
  },
  {
    email: 'dispatcher@waypoint.local',
    name: 'Kavinda Silva',
    role: UserRole.DISPATCHER,
    phone: '+94 11 234 5680',
    depotId: 'depot-peliyagoda',
    envPasswordKey: 'SEED_DISPATCHER_PASSWORD',
  },
  {
    email: 'loader@waypoint.local',
    name: 'D. Jayasuriya',
    role: UserRole.LOADER,
    phone: '+94 11 234 5680',
    depotId: 'depot-peliyagoda',
    envPasswordKey: 'SEED_LOADER_PASSWORD',
  },
  {
    email: 'driver@waypoint.local',
    name: 'Sunimal Silva',
    role: UserRole.DRIVER,
    phone: '+94 77 482 1902',
    depotId: 'depot-peliyagoda',
    envPasswordKey: 'SEED_DRIVER_PASSWORD',
  },
];

async function main() {
  console.log('--- Waypoint Delivery System Seed Initialization ---');

  // Verify all required environment variables are present before proceeding
  const missingEnvKeys: string[] = [];
  for (const userConfig of SEED_USERS) {
    const val = process.env[userConfig.envPasswordKey];
    if (!val || val.trim() === '') {
      missingEnvKeys.push(userConfig.envPasswordKey);
    }
  }

  if (missingEnvKeys.length > 0) {
    console.error(
      `[FATAL] Seed aborted: Missing required environment variable(s):\n` +
        missingEnvKeys.map((k) => `  - ${k}`).join('\n') +
        `\nPlease define these variables in your environment or .env file before seeding.`
    );
    process.exit(1);
  }

  console.log('Seeding initial foundation user accounts with configured environment passwords...');

  const userMap: Record<string, string> = {};

  for (const userConfig of SEED_USERS) {
    const rawPassword = process.env[userConfig.envPasswordKey]!;
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: userConfig.email },
      update: {
        name: userConfig.name,
        role: userConfig.role,
        phone: userConfig.phone,
        depotId: userConfig.depotId,
        passwordHash,
      },
      create: {
        email: userConfig.email,
        name: userConfig.name,
        role: userConfig.role,
        phone: userConfig.phone,
        depotId: userConfig.depotId,
        passwordHash,
      },
    });

    userMap[user.email] = user.id;
    console.log(`[OK] Seeded account: ${user.email} (${user.role}) - ID: ${user.id}`);
  }

  // =========================================================================
  // SYNTHETIC DEVELOPMENT DATA (NOT OFFICIAL COMPETITION DATASET RECORDS)
  // -------------------------------------------------------------------------
  // The entities below (outlets, vehicles VEH014/VEH021/VEH033/VEH018, orders,
  // and trips) are PURELY SYNTHETIC development fixtures created independently
  // for automated tests and Figma UI layout verification (LS-02 and LS-03).
  //
  // They DO NOT contain, derive from, or reconstruct any official Rootcode
  // competition datasets. Under competition confidentiality rules, no official
  // dataset records are committed into Git source control.
  // =========================================================================

  console.log('Seeding Outlets (SYNTHETIC DEVELOPMENT DATA)...');
  const outletsData = [
    {
      code: '#104',
      name: 'Waypoint Fresh – Nugegoda',
      address: 'High Level Road, Nugegoda',
      deliveryWindowStart: '06:00 AM',
      deliveryWindowEnd: '08:00 AM',
      depotId: 'depot-peliyagoda',
    },
    {
      code: '#106',
      name: 'Waypoint Fresh – Maharagama',
      address: 'Pamunuwa Junction, Maharagama',
      deliveryWindowStart: '06:30 AM',
      deliveryWindowEnd: '08:00 AM',
      depotId: 'depot-peliyagoda',
    },
    {
      code: '#109',
      name: 'Waypoint Fresh – Kottawa',
      address: 'Expressway Access Rd, Kottawa',
      deliveryWindowStart: '07:00 AM',
      deliveryWindowEnd: '08:30 AM',
      depotId: 'depot-peliyagoda',
    },
    {
      code: '#112',
      name: 'Waypoint Fresh – Kiribathgoda',
      address: 'Kandy Road, Kiribathgoda',
      deliveryWindowStart: '06:30 AM',
      deliveryWindowEnd: '08:30 AM',
      depotId: 'depot-peliyagoda',
    },
    {
      code: '#115',
      name: 'Waypoint Fresh – Kadawatha',
      address: 'Colombo Rd, Kadawatha',
      deliveryWindowStart: '07:00 AM',
      deliveryWindowEnd: '09:00 AM',
      depotId: 'depot-peliyagoda',
    },
    {
      code: '#118',
      name: 'Waypoint Fresh – Kelaniya',
      address: 'Biyagama Rd, Kelaniya',
      deliveryWindowStart: '07:30 AM',
      deliveryWindowEnd: '09:30 AM',
      depotId: 'depot-peliyagoda',
    },
  ];

  const outletMap: Record<string, string> = {};
  for (const o of outletsData) {
    const outlet = await prisma.outlet.upsert({
      where: { code: o.code },
      update: o,
      create: o,
    });
    outletMap[o.code] = outlet.id;
  }
  console.log(`[OK] Seeded ${outletsData.length} outlets.`);

  console.log('Seeding Vehicles...');
  const vehiclesData = [
    {
      registrationNumber: 'WP-CAD-8821',
      type: VehicleType.TRUCK,
      tempType: VehicleTemperatureType.REEFER,
      maxWeightKg: 3000,
      maxVolumeM3: 18.0,
      weeklyFuelQuotaLiters: 250,
      depotId: 'depot-peliyagoda',
    },
    {
      registrationNumber: 'WP-LF-6590',
      type: VehicleType.TRUCK,
      tempType: VehicleTemperatureType.AMBIENT,
      maxWeightKg: 5000,
      maxVolumeM3: 25.0,
      weeklyFuelQuotaLiters: 300,
      depotId: 'depot-peliyagoda',
    },
    {
      registrationNumber: 'WP-GA-3491',
      type: VehicleType.VAN,
      tempType: VehicleTemperatureType.AMBIENT,
      maxWeightKg: 3000,
      maxVolumeM3: 14.0,
      weeklyFuelQuotaLiters: 200,
      depotId: 'depot-peliyagoda',
    },
    {
      registrationNumber: 'WP-PX-1290',
      type: VehicleType.VAN,
      tempType: VehicleTemperatureType.AMBIENT,
      maxWeightKg: 2000,
      maxVolumeM3: 10.0,
      weeklyFuelQuotaLiters: 150,
      depotId: 'depot-peliyagoda',
    },
  ];

  const vehicleMap: Record<string, string> = {};
  for (const v of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: v,
      create: v,
    });
    vehicleMap[v.registrationNumber] = vehicle.id;
  }
  console.log(`[OK] Seeded ${vehiclesData.length} vehicles.`);

  console.log('Seeding Orders & Order Items...');
  const today = new Date();
  today.setHours(5, 45, 0, 0);

  // Orders for VEH014
  const order1042 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-1042' },
    update: {
      outletId: outletMap['#104'],
      requestedDeliveryDate: today,
      totalWeightKg: 540,
      totalVolumeM3: 3.5,
    },
    create: {
      orderNumber: 'ORD-1042',
      outletId: outletMap['#104'],
      requestedDeliveryDate: today,
      totalWeightKg: 540,
      totalVolumeM3: 3.5,
      items: {
        create: [
          {
            productName: 'Highland Fresh Milk (1L x 12 pkg)',
            quantity: 10,
            unitWeightKg: 24,
            unitVolumeM3: 0.15,
            tempRequirement: TemperatureRequirement.CHILLED,
          },
          {
            productName: 'Keells Prime Fresh Chicken',
            quantity: 6,
            unitWeightKg: 25,
            unitVolumeM3: 0.15,
            tempRequirement: TemperatureRequirement.FROZEN,
          },
          {
            productName: 'Nuwara Eliya Fresh Carrots',
            quantity: 5,
            unitWeightKg: 30,
            unitVolumeM3: 0.2,
            tempRequirement: TemperatureRequirement.CHILLED,
          },
        ],
      },
    },
  });

  const order1043 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-1043' },
    update: {
      outletId: outletMap['#106'],
      requestedDeliveryDate: today,
      totalWeightKg: 820,
      totalVolumeM3: 5.1,
    },
    create: {
      orderNumber: 'ORD-1043',
      outletId: outletMap['#106'],
      requestedDeliveryDate: today,
      totalWeightKg: 820,
      totalVolumeM3: 5.1,
      items: {
        create: [
          {
            productName: 'Frozen Food Cartons',
            quantity: 3,
            unitWeightKg: 70,
            unitVolumeM3: 0.5,
            tempRequirement: TemperatureRequirement.FROZEN,
          },
          {
            productName: 'Chilled Milk Crates',
            quantity: 2,
            unitWeightKg: 95,
            unitVolumeM3: 0.6,
            tempRequirement: TemperatureRequirement.CHILLED,
          },
          {
            productName: 'Fresh Vegetables Sacks',
            quantity: 4,
            unitWeightKg: 105,
            unitVolumeM3: 0.65,
            tempRequirement: TemperatureRequirement.CHILLED,
          },
        ],
      },
    },
  });

  const order1044 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-1044' },
    update: {
      outletId: outletMap['#109'],
      requestedDeliveryDate: today,
      totalWeightKg: 1120,
      totalVolumeM3: 6.6,
    },
    create: {
      orderNumber: 'ORD-1044',
      outletId: outletMap['#109'],
      requestedDeliveryDate: today,
      totalWeightKg: 1120,
      totalVolumeM3: 6.6,
      items: {
        create: [
          {
            productName: 'Keells Frozen Chicken Breasts',
            quantity: 3,
            unitWeightKg: 120,
            unitVolumeM3: 0.7,
            tempRequirement: TemperatureRequirement.FROZEN,
          },
          {
            productName: 'Dairy (Highland Milk & Curd)',
            quantity: 2,
            unitWeightKg: 160,
            unitVolumeM3: 0.9,
            tempRequirement: TemperatureRequirement.CHILLED,
          },
          {
            productName: 'Produce (Commercial Carrots)',
            quantity: 2,
            unitWeightKg: 220,
            unitVolumeM3: 1.3,
            tempRequirement: TemperatureRequirement.AMBIENT,
          },
        ],
      },
    },
  });

  // Orders for VEH021
  const order2001 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2001' },
    update: {
      outletId: outletMap['#112'],
      requestedDeliveryDate: today,
      totalWeightKg: 1200,
      totalVolumeM3: 6.0,
    },
    create: {
      orderNumber: 'ORD-2001',
      outletId: outletMap['#112'],
      requestedDeliveryDate: today,
      totalWeightKg: 1200,
      totalVolumeM3: 6.0,
      items: {
        create: [
          {
            productName: 'Dry Rice & Flour Bags (50kg)',
            quantity: 10,
            unitWeightKg: 50,
            unitVolumeM3: 0.25,
            tempRequirement: TemperatureRequirement.AMBIENT,
          },
          {
            productName: 'Canned Goods & Preserves',
            quantity: 10,
            unitWeightKg: 70,
            unitVolumeM3: 0.35,
            tempRequirement: TemperatureRequirement.AMBIENT,
          },
        ],
      },
    },
  });

  // Orders for VEH033
  const order3001 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-3001' },
    update: {
      outletId: outletMap['#115'],
      requestedDeliveryDate: today,
      totalWeightKg: 950,
      totalVolumeM3: 4.8,
    },
    create: {
      orderNumber: 'ORD-3001',
      outletId: outletMap['#115'],
      requestedDeliveryDate: today,
      totalWeightKg: 950,
      totalVolumeM3: 4.8,
      items: {
        create: [
          {
            productName: 'Carton Biscuits & Confectionery',
            quantity: 16,
            unitWeightKg: 59.3,
            unitVolumeM3: 0.3,
            tempRequirement: TemperatureRequirement.AMBIENT,
          },
        ],
      },
    },
  });

  // Orders for VEH018
  const order4001 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-4001' },
    update: {
      outletId: outletMap['#118'],
      requestedDeliveryDate: today,
      totalWeightKg: 680,
      totalVolumeM3: 3.2,
    },
    create: {
      orderNumber: 'ORD-4001',
      outletId: outletMap['#118'],
      requestedDeliveryDate: today,
      totalWeightKg: 680,
      totalVolumeM3: 3.2,
      items: {
        create: [
          {
            productName: 'Specialty Bakery Ingredients',
            quantity: 12,
            unitWeightKg: 56.6,
            unitVolumeM3: 0.26,
            tempRequirement: TemperatureRequirement.AMBIENT,
          },
        ],
      },
    },
  });

  console.log('Seeding Trips & Loading Records...');

  // TRIP 1: VEH014 (NOT_STARTED)
  const departureVEH014 = new Date(today);
  departureVEH014.setHours(5, 45, 0, 0);

  const trip1 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-2026-0929-01' },
    update: {
      vehicleId: vehicleMap['WP-CAD-8821'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.PLANNED,
      totalWeightKg: 2480,
      totalVolumeM3: 15.2,
      plannedDepartureTime: departureVEH014,
    },
    create: {
      tripNumber: 'TRIP-2026-0929-01',
      vehicleId: vehicleMap['WP-CAD-8821'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.PLANNED,
      totalWeightKg: 2480,
      totalVolumeM3: 15.2,
      plannedDepartureTime: departureVEH014,
    },
  });

  // Trip orders for Trip 1
  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip1.id, orderId: order1042.id } },
    update: { sequenceNumber: 1 },
    create: { tripId: trip1.id, orderId: order1042.id, sequenceNumber: 1 },
  });
  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip1.id, orderId: order1043.id } },
    update: { sequenceNumber: 2 },
    create: { tripId: trip1.id, orderId: order1043.id, sequenceNumber: 2 },
  });
  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip1.id, orderId: order1044.id } },
    update: { sequenceNumber: 3 },
    create: { tripId: trip1.id, orderId: order1044.id, sequenceNumber: 3 },
  });

  // Loading record for Trip 1
  const existingRecord1 = await prisma.loadingRecord.findFirst({
    where: { tripId: trip1.id },
  });
  if (!existingRecord1) {
    await prisma.loadingRecord.create({
      data: {
        tripId: trip1.id,
        loaderId: userMap['loader@waypoint.local'],
        status: LoadingStatus.NOT_STARTED,
        notes: JSON.stringify({
          bay: 'BAY 04',
          preCoolTemp: '3.8°C',
          loadedItems: 0,
          modelName: 'Isuzu 4T Reefer',
          items: {
            'Highland Fresh Milk (1L x 12 pkg)': {
              stagedQuantity: 8,
              shortageDetails: 'Shortage detected: 2 cartons missing from pallet #P-104',
            },
          },
        }),
      },
    });
  } else {
    // Ensure synthetic development notes include staging metadata if not yet initialized
    try {
      const parsed = JSON.parse(existingRecord1.notes || '{}');
      if (!parsed.items) {
        parsed.items = {
          'Highland Fresh Milk (1L x 12 pkg)': {
            stagedQuantity: 8,
            shortageDetails: 'Shortage detected: 2 cartons missing from pallet #P-104',
          },
        };
        await prisma.loadingRecord.update({
          where: { id: existingRecord1.id },
          data: { notes: JSON.stringify(parsed) },
        });
      }
    } catch {
      // ignore
    }
  }

  // TRIP 2: VEH021 (IN_PROGRESS)
  const departureVEH021 = new Date(today);
  departureVEH021.setHours(6, 15, 0, 0);

  const trip2 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-2026-0929-02' },
    update: {
      vehicleId: vehicleMap['WP-LF-6590'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.LOADING,
      totalWeightKg: 1200,
      totalVolumeM3: 6.0,
      plannedDepartureTime: departureVEH021,
    },
    create: {
      tripNumber: 'TRIP-2026-0929-02',
      vehicleId: vehicleMap['WP-LF-6590'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.LOADING,
      totalWeightKg: 1200,
      totalVolumeM3: 6.0,
      plannedDepartureTime: departureVEH021,
    },
  });

  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip2.id, orderId: order2001.id } },
    update: { sequenceNumber: 1 },
    create: { tripId: trip2.id, orderId: order2001.id, sequenceNumber: 1 },
  });

  const existingRecord2 = await prisma.loadingRecord.findFirst({
    where: { tripId: trip2.id },
  });
  if (!existingRecord2) {
    await prisma.loadingRecord.create({
      data: {
        tripId: trip2.id,
        loaderId: userMap['loader@waypoint.local'],
        status: LoadingStatus.IN_PROGRESS,
        notes: JSON.stringify({
          bay: 'BAY 02',
          loadedItems: 18,
          modelName: 'Mitsubishi 5T Dry Box',
        }),
      },
    });
  }

  // TRIP 3: VEH033 (ISSUE_REPORTED)
  const departureVEH033 = new Date(today);
  departureVEH033.setHours(6, 0, 0, 0);

  const trip3 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-2026-0929-03' },
    update: {
      vehicleId: vehicleMap['WP-GA-3491'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.LOADING,
      totalWeightKg: 950,
      totalVolumeM3: 4.8,
      plannedDepartureTime: departureVEH033,
    },
    create: {
      tripNumber: 'TRIP-2026-0929-03',
      vehicleId: vehicleMap['WP-GA-3491'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.LOADING,
      totalWeightKg: 950,
      totalVolumeM3: 4.8,
      plannedDepartureTime: departureVEH033,
    },
  });

  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip3.id, orderId: order3001.id } },
    update: { sequenceNumber: 1 },
    create: { tripId: trip3.id, orderId: order3001.id, sequenceNumber: 1 },
  });

  const existingRecord3 = await prisma.loadingRecord.findFirst({
    where: { tripId: trip3.id },
  });
  if (!existingRecord3) {
    const record3 = await prisma.loadingRecord.create({
      data: {
        tripId: trip3.id,
        loaderId: userMap['loader@waypoint.local'],
        status: LoadingStatus.ISSUE_REPORTED,
        notes: JSON.stringify({
          bay: 'BAY 06',
          loadedItems: 14,
          modelName: 'Hino 3T Van',
          issueDetails:
            'Carton #C-881 crush damage: Waiting for Floor Coordinator replacement authorization.',
        }),
      },
    });

    await prisma.loadingIssue.create({
      data: {
        loadingRecordId: record3.id,
        issueType: '1 DAMAGED BOX',
        description:
          'Carton #C-881 crush damage: Waiting for Floor Coordinator replacement authorization.',
        resolved: false,
      },
    });
  }

  // TRIP 4: VEH018 (READY_FOR_DISPATCH)
  const departureVEH018 = new Date(today);
  departureVEH018.setHours(5, 30, 0, 0);

  const trip4 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-2026-0929-04' },
    update: {
      vehicleId: vehicleMap['WP-PX-1290'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.READY_FOR_DISPATCH,
      totalWeightKg: 680,
      totalVolumeM3: 3.2,
      plannedDepartureTime: departureVEH018,
    },
    create: {
      tripNumber: 'TRIP-2026-0929-04',
      vehicleId: vehicleMap['WP-PX-1290'],
      driverId: userMap['driver@waypoint.local'],
      tripDate: today,
      tripSequenceNumber: 1,
      status: TripStatus.READY_FOR_DISPATCH,
      totalWeightKg: 680,
      totalVolumeM3: 3.2,
      plannedDepartureTime: departureVEH018,
    },
  });

  await prisma.tripOrder.upsert({
    where: { tripId_orderId: { tripId: trip4.id, orderId: order4001.id } },
    update: { sequenceNumber: 1 },
    create: { tripId: trip4.id, orderId: order4001.id, sequenceNumber: 1 },
  });

  const existingRecord4 = await prisma.loadingRecord.findFirst({
    where: { tripId: trip4.id },
  });
  if (!existingRecord4) {
    await prisma.loadingRecord.create({
      data: {
        tripId: trip4.id,
        loaderId: userMap['loader@waypoint.local'],
        status: LoadingStatus.READY_FOR_DISPATCH,
        notes: JSON.stringify({
          bay: 'BAY 01',
          loadedItems: 12,
          sealNumber: '#SL-9942',
          modelName: 'Toyota HiAce Van (WP-PX-1290)',
        }),
      },
    });
  }

  console.log('Seed initialization complete. Baseline accounts and loading tasks are ready.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
