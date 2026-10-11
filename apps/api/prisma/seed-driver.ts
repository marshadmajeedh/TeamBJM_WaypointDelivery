import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Optional development fixture; all screens consume it through the real Driver API.
// Run after the existing auth seed. No new users or authentication are created here.
const prisma = new PrismaClient();
async function main() {
  const driver = await prisma.user.findUnique({ where: { email: 'driver@waypoint.local' } });
  if (!driver || driver.role !== 'DRIVER')
    throw new Error('Run the existing auth seed first to create the driver account.');
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const date = new Date(`${day}T00:00:00+05:30`);
  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNumber: 'DEMO-VEH014' },
    update: {},
    create: {
      registrationNumber: 'DEMO-VEH014',
      type: 'TRUCK',
      tempType: 'REEFER',
      maxWeightKg: 6000,
      maxVolumeM3: 30,
      weeklyFuelQuotaLiters: 250,
      depotId: driver.depotId,
    },
  });
  const tripNumber = `DRIVER-DEMO-${day}`;
  await prisma.$transaction(
    async (tx) => {
      const trip = await tx.trip.upsert({
        where: { tripNumber },
        update: {},
        create: {
          tripNumber,
          driverId: driver.id,
          vehicleId: vehicle.id,
          tripDate: date,
          status: 'READY_FOR_DISPATCH',
          plannedDepartureTime: new Date(`${day}T05:45:00+05:30`),
          totalWeightKg: 423,
        },
      });
      const branches = [
        'Nugegoda',
        'Maharagama',
        'Kottawa',
        'Homagama',
        'High Street',
        'Pannipitiya',
        'Athugiriya',
        'Malabe',
        'Kaduwela',
      ];
      for (const [index, branch] of branches.entries()) {
        const outlet = await tx.outlet.upsert({
          where: { code: `DRIVER-DEMO-${index + 1}` },
          update: {},
          create: {
            code: `DRIVER-DEMO-${index + 1}`,
            name: `Waypoint Fresh – ${branch}`,
            address: `${branch}, Western Province`,
            contactPerson: 'Receiving Manager',
            deliveryWindowStart: '06:00',
            deliveryWindowEnd: '10:00',
            depotId: driver.depotId,
          },
        });
        const order = await tx.order.upsert({
          where: { orderNumber: `DEMO-${day}-${1042 + index}` },
          update: {},
          create: {
            orderNumber: `DEMO-${day}-${1042 + index}`,
            outletId: outlet.id,
            requestedDeliveryDate: date,
            status: 'PLANNED',
            totalWeightKg: 47,
            totalVolumeM3: 0.2,
            items: {
              create: [
                {
                  productName: 'Fresh Milk',
                  quantity: 20,
                  unitWeightKg: 1,
                  unitVolumeM3: 0.004,
                  tempRequirement: 'CHILLED',
                },
                {
                  productName: 'Fresh Chicken',
                  quantity: 12,
                  unitWeightKg: 1,
                  unitVolumeM3: 0.004,
                  tempRequirement: 'FROZEN',
                },
                {
                  productName: 'Carrots',
                  quantity: 15,
                  unitWeightKg: 1,
                  unitVolumeM3: 0.004,
                  tempRequirement: 'CHILLED',
                },
              ],
            },
          },
        });
        await tx.tripOrder.upsert({
          where: { tripId_orderId: { tripId: trip.id, orderId: order.id } },
          update: {},
          create: { tripId: trip.id, orderId: order.id, sequenceNumber: index + 1 },
        });
      }
    },
    { timeout: 30000 }
  );
  console.log(
    'Driver development trip is ready with nine consistent stops. Existing credentials are unchanged.'
  );
}
main()
  .catch(() => {
    console.error(
      'Driver fixture could not be created. Check the existing backend database configuration and auth seed.'
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
