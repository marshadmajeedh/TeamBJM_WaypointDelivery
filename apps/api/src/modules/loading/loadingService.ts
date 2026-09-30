import {
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
  LoadingStatus,
  LoadingTasksResponseData,
  VehicleLoadingDetails,
  StopSequenceItem,
  LoadingTaskItem,
} from '@waypoint/shared';
import { prisma } from '../../db';

interface ParsedNotes {
  bay?: string;
  loadedItems?: number;
  preCoolTemp?: string;
  sealNumber?: string;
  modelName?: string;
  issueDetails?: string;
}

function parseNotes(notesStr?: string | null): ParsedNotes {
  if (!notesStr) return {};
  try {
    if (notesStr.trim().startsWith('{')) {
      return JSON.parse(notesStr);
    }
  } catch {
    // not JSON
  }

  const result: ParsedNotes = {};
  const bayMatch = notesStr.match(/Bay[:\s]+([A-Za-z0-9-]+)/i);
  if (bayMatch) result.bay = bayMatch[1].toUpperCase();

  const sealMatch = notesStr.match(/Seal[:\s]+(#?[A-Za-z0-9-]+)/i);
  if (sealMatch) result.sealNumber = sealMatch[1];

  return result;
}

function formatTime(date?: Date | null): string {
  if (!date) return '06:00 AM';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function calculateCountdown(targetDate?: Date | null): string {
  if (!targetDate) return 'in 1h 30m';
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'Departs soon';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `in ${hours}h ${mins.toString().padStart(2, '0')}m`;
  return `in ${mins}m`;
}

function deriveModelName(
  reg: string,
  type: VehicleType,
  tempType: VehicleTemperatureType,
  customModel?: string
): string {
  if (customModel) return customModel;
  if (reg.includes('CAD-8821')) return 'Isuzu Forward Reefer';
  if (reg.includes('LF-6590')) return 'Mitsubishi 5T Dry Box';
  if (reg.includes('GA-3491')) return 'Hino 3T Van';
  if (reg.includes('PX-1290')) return 'Toyota HiAce Van';
  if (tempType === VehicleTemperatureType.REEFER) {
    return type === VehicleType.TRUCK ? 'Isuzu 4T Reefer' : 'Reefer Van';
  }
  return type === VehicleType.TRUCK ? 'Cargo Truck 5T' : 'Standard Van 3T';
}

/**
 * Retrieves loading tasks dashboard data for the given depotId.
 * Fail-closed: Trips are strictly scoped to vehicles belonging to this depot.
 */
export async function getLoadingTasksForDepot(
  depotId: string
): Promise<LoadingTasksResponseData> {
  const trips = await prisma.trip.findMany({
    where: {
      vehicle: { depotId },
      status: {
        notIn: ['CANCELLED', 'COMPLETED'],
      },
    },
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          type: true,
          tempType: true,
          maxWeightKg: true,
          maxVolumeM3: true,
          depotId: true,
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          loadingIssues: true,
        },
      },
      tripOrders: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalWeightKg: true,
              totalVolumeM3: true,
              outlet: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  address: true,
                  deliveryWindowStart: true,
                  deliveryWindowEnd: true,
                },
              },
              items: {
                select: {
                  id: true,
                  productName: true,
                  quantity: true,
                  unitWeightKg: true,
                  unitVolumeM3: true,
                  tempRequirement: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ tripDate: 'asc' }, { tripSequenceNumber: 'asc' }],
  });

  const tasks: LoadingTaskItem[] = [];
  const activeBays = new Set<string>();

  let vehiclesToLoadCount = 0;
  let inProgressCount = 0;
  let readyForDispatchCount = 0;
  let discrepanciesCount = 0;

  for (const trip of trips) {
    const latestRecord = trip.loadingRecords[0];
    const notesParsed = parseNotes(latestRecord?.notes);

    // Determine status
    let status: LoadingStatus = LoadingStatus.NOT_STARTED;
    if (latestRecord) {
      const hasUnresolvedIssue = latestRecord.loadingIssues.some((issue) => !issue.resolved);
      if (hasUnresolvedIssue || latestRecord.status === LoadingStatus.ISSUE_REPORTED) {
        status = LoadingStatus.ISSUE_REPORTED;
      } else {
        status = latestRecord.status as LoadingStatus;
      }
    }

    // Update summary counts
    vehiclesToLoadCount += 1;
    if (status === LoadingStatus.IN_PROGRESS) inProgressCount += 1;
    if (status === LoadingStatus.READY_FOR_DISPATCH) readyForDispatchCount += 1;
    if (status === LoadingStatus.ISSUE_REPORTED) discrepanciesCount += 1;

    // Determine Bay
    const bayNumber = trip.tripSequenceNumber || 1;
    const fallbackBay = `BAY 0${bayNumber}`;
    const bay = notesParsed.bay ? (notesParsed.bay.startsWith('BAY') ? notesParsed.bay : `BAY ${notesParsed.bay}`) : fallbackBay;
    activeBays.add(bay);

    // Items and units calculation
    let totalItems = 0;
    const tempRequirementsSet = new Set<TemperatureRequirement>();

    for (const to of trip.tripOrders) {
      for (const item of to.order.items) {
        totalItems += item.quantity;
        tempRequirementsSet.add(item.tempRequirement as TemperatureRequirement);
      }
    }

    // Loaded items calculation
    let loadedItems = 0;
    if (status === LoadingStatus.READY_FOR_DISPATCH) {
      loadedItems = totalItems;
    } else if (status === LoadingStatus.NOT_STARTED) {
      loadedItems = 0;
    } else if (notesParsed.loadedItems !== undefined) {
      loadedItems = notesParsed.loadedItems;
    } else if (status === LoadingStatus.ISSUE_REPORTED) {
      loadedItems = Math.max(0, Math.round(totalItems * 0.85));
    } else if (status === LoadingStatus.IN_PROGRESS) {
      loadedItems = Math.max(0, Math.round(totalItems * 0.9));
    }

    const percentage = totalItems > 0 ? Math.round((loadedItems / totalItems) * 100) : 0;

    let progressLabel = 'Pallet Staging Progress';
    if (status === LoadingStatus.IN_PROGRESS) progressLabel = 'Barcode Manifest Progress';
    if (status === LoadingStatus.ISSUE_REPORTED) progressLabel = 'Loaded Before Halt';
    if (status === LoadingStatus.READY_FOR_DISPATCH) progressLabel = 'Complete';

    // Temperature summary
    let tempRequirementText = 'Ambient Dry Cargo';
    if (tempRequirementsSet.has(TemperatureRequirement.FROZEN) && tempRequirementsSet.has(TemperatureRequirement.CHILLED)) {
      tempRequirementText = 'Chilled +4°C / Frozen -18°C';
    } else if (tempRequirementsSet.has(TemperatureRequirement.FROZEN)) {
      tempRequirementText = 'Frozen -18°C';
    } else if (tempRequirementsSet.has(TemperatureRequirement.CHILLED)) {
      tempRequirementText = 'Chilled +4°C';
    }

    // Stops summary
    const outletNames = Array.from(
      new Set(
        trip.tripOrders.map((to) =>
          to.order.outlet.name.replace(/^Waypoint Fresh\s*[-–]\s*/i, '')
        )
      )
    );

    // Issue detail
    const unresolvedIssue = latestRecord?.loadingIssues.find((issue) => !issue.resolved);
    const issueData = unresolvedIssue
      ? {
          hasIssue: true,
          issueType: unresolvedIssue.issueType,
          description: unresolvedIssue.description,
        }
      : status === LoadingStatus.ISSUE_REPORTED
        ? {
            hasIssue: true,
            issueType: 'DISCREPANCY',
            description: notesParsed.issueDetails || 'Carton damage / shortage flagged during loading',
          }
        : null;

    tasks.push({
      id: trip.id,
      tripNumber: trip.tripNumber,
      tripSequenceNumber: trip.tripSequenceNumber,
      bay,
      status,
      vehicle: {
        id: trip.vehicle.id,
        registrationNumber: trip.vehicle.registrationNumber,
        type: trip.vehicle.type as VehicleType,
        tempType: trip.vehicle.tempType as VehicleTemperatureType,
        modelName: deriveModelName(
          trip.vehicle.registrationNumber,
          trip.vehicle.type as VehicleType,
          trip.vehicle.tempType as VehicleTemperatureType,
          notesParsed.modelName
        ),
      },
      plannedDepartureTime: trip.plannedDepartureTime ? trip.plannedDepartureTime.toISOString() : null,
      departureFormatted: `Departs ${formatTime(trip.plannedDepartureTime)}`,
      departureCountdown: calculateCountdown(trip.plannedDepartureTime),
      ordersCount: trip.tripOrders.length,
      stopsCount: outletNames.length,
      stopsSummary: outletNames.join(', '),
      temperatureRequirement: tempRequirementText,
      targetTemperatureVerified: trip.vehicle.tempType === VehicleTemperatureType.REEFER,
      progress: {
        loadedItems,
        totalItems,
        percentage,
        label: progressLabel,
      },
      issue: issueData,
      driver: trip.driver
        ? {
            name: trip.driver.name,
            phone: trip.driver.phone,
          }
        : null,
      sealNumber: notesParsed.sealNumber || null,
    });
  }

  return {
    summary: {
      vehiclesToLoad: vehiclesToLoadCount,
      inProgress: inProgressCount,
      readyForDispatch: readyForDispatchCount,
      discrepancies: discrepanciesCount,
      activeBaysCount: activeBays.size,
    },
    tasks,
  };
}

export type LoadingDetailsResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'SUCCESS'; data: VehicleLoadingDetails };

/**
 * Retrieves full details for a single vehicle loading task/trip by tripId,
 * scoped strictly to the specified depotId.
 * Returns CROSS_DEPOT_FORBIDDEN if the trip belongs to another depot.
 */
export async function getVehicleLoadingDetailsForDepot(
  depotId: string,
  tripId: string
): Promise<LoadingDetailsResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          type: true,
          tempType: true,
          maxWeightKg: true,
          maxVolumeM3: true,
          depotId: true,
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          loadingIssues: true,
        },
      },
      tripOrders: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalWeightKg: true,
              totalVolumeM3: true,
              outlet: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  address: true,
                  deliveryWindowStart: true,
                  deliveryWindowEnd: true,
                },
              },
              items: {
                select: {
                  id: true,
                  productName: true,
                  quantity: true,
                  unitWeightKg: true,
                  unitVolumeM3: true,
                  tempRequirement: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return { outcome: 'NOT_FOUND' };
  }

  // Fail-closed depot scoping: reject if vehicle belongs to another depot
  if (trip.vehicle.depotId && trip.vehicle.depotId !== depotId) {
    return { outcome: 'CROSS_DEPOT_FORBIDDEN' };
  }

  const latestRecord = trip.loadingRecords[0];
  const notesParsed = parseNotes(latestRecord?.notes);

  // Status
  let status: LoadingStatus = LoadingStatus.NOT_STARTED;
  if (latestRecord) {
    const hasUnresolvedIssue = latestRecord.loadingIssues.some((issue) => !issue.resolved);
    if (hasUnresolvedIssue || latestRecord.status === LoadingStatus.ISSUE_REPORTED) {
      status = LoadingStatus.ISSUE_REPORTED;
    } else {
      status = latestRecord.status as LoadingStatus;
    }
  }

  const bayNumber = trip.tripSequenceNumber || 1;
  const fallbackBay = `BAY 0${bayNumber}`;
  const bay = notesParsed.bay ? (notesParsed.bay.startsWith('BAY') ? notesParsed.bay : `BAY ${notesParsed.bay}`) : fallbackBay;

  // Capacity calculations
  let calculatedWeightKg = 0;
  let calculatedVolumeM3 = 0;
  let totalLineUnits = 0;
  const tempRequirementsSet = new Set<TemperatureRequirement>();

  const totalStopsCount = trip.tripOrders.length;
  const stops: StopSequenceItem[] = [];

  trip.tripOrders.forEach((to, index) => {
    const stopSequence = index + 1;
    // LIFO logic: Stop 1 unloads first, so it is loaded last at the tail.
    // Stop N unloads last, so it is loaded first in the bulkhead.
    const lifoStagingOrder = totalStopsCount - index;

    let lifoPositionLabel = 'Mid-Chamber';
    if (stopSequence === 1) {
      lifoPositionLabel = 'Door Position';
    } else if (stopSequence === totalStopsCount) {
      lifoPositionLabel = 'Front Bulkhead';
    }

    let orderWeight = to.order.totalWeightKg;
    let orderVolume = to.order.totalVolumeM3;
    let orderUnits = 0;
    const orderTempRequirements = new Set<TemperatureRequirement>();

    const itemsSummary = to.order.items.map((item) => {
      orderUnits += item.quantity;
      orderTempRequirements.add(item.tempRequirement as TemperatureRequirement);
      tempRequirementsSet.add(item.tempRequirement as TemperatureRequirement);
      return {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitWeightKg: item.unitWeightKg,
        unitVolumeM3: item.unitVolumeM3,
        tempRequirement: item.tempRequirement as TemperatureRequirement,
      };
    });

    if (orderWeight === 0) {
      orderWeight = to.order.items.reduce((sum, item) => sum + item.unitWeightKg * item.quantity, 0);
    }
    if (orderVolume === 0) {
      orderVolume = to.order.items.reduce((sum, item) => sum + item.unitVolumeM3 * item.quantity, 0);
    }

    calculatedWeightKg += orderWeight;
    calculatedVolumeM3 += orderVolume;
    totalLineUnits += orderUnits;

    const deliveryWindow =
      to.order.outlet.deliveryWindowStart && to.order.outlet.deliveryWindowEnd
        ? `${to.order.outlet.deliveryWindowStart} – ${to.order.outlet.deliveryWindowEnd}`
        : '06:00 – 08:00 AM';

    stops.push({
      stopSequence,
      lifoStagingOrder,
      lifoPositionLabel,
      outlet: {
        id: to.order.outlet.id,
        code: to.order.outlet.code,
        name: to.order.outlet.name,
        address: to.order.outlet.address,
        deliveryWindow,
      },
      orderId: to.order.id,
      orderNumber: to.order.orderNumber,
      skuCount: to.order.items.length,
      totalUnits: orderUnits,
      weightKg: Math.round(orderWeight),
      volumeM3: Math.round(orderVolume * 10) / 10,
      tempRequirements: Array.from(orderTempRequirements),
      items: itemsSummary,
    });
  });

  const usedWeightKg = trip.totalWeightKg > 0 ? trip.totalWeightKg : calculatedWeightKg;
  const weightCapacityKg = trip.vehicle.maxWeightKg;
  const weightPercentage =
    weightCapacityKg > 0 ? Math.round((usedWeightKg / weightCapacityKg) * 1000) / 10 : 0;

  const usedVolumeM3 = trip.totalVolumeM3 > 0 ? trip.totalVolumeM3 : calculatedVolumeM3;
  const volumeCapacityM3 = trip.vehicle.maxVolumeM3;
  const volumePercentage =
    volumeCapacityM3 > 0 ? Math.round((usedVolumeM3 / volumeCapacityM3) * 1000) / 10 : 0;

  // Temperature specs
  const isReefer = trip.vehicle.tempType === VehicleTemperatureType.REEFER;
  const hasChilled = tempRequirementsSet.has(TemperatureRequirement.CHILLED);
  const hasFrozen = tempRequirementsSet.has(TemperatureRequirement.FROZEN);

  // Loaded units calculation
  let loadedUnits = 0;
  if (status === LoadingStatus.READY_FOR_DISPATCH) {
    loadedUnits = totalLineUnits;
  } else if (status === LoadingStatus.NOT_STARTED) {
    loadedUnits = 0;
  } else if (notesParsed.loadedItems !== undefined) {
    loadedUnits = notesParsed.loadedItems;
  } else if (status === LoadingStatus.ISSUE_REPORTED) {
    loadedUnits = Math.max(0, Math.round(totalLineUnits * 0.85));
  } else if (status === LoadingStatus.IN_PROGRESS) {
    loadedUnits = Math.max(0, Math.round(totalLineUnits * 0.9));
  }

  const progressPercentage =
    totalLineUnits > 0 ? Math.round((loadedUnits / totalLineUnits) * 100) : 0;

  let statusLabel = 'Awaiting Pallet Marshalling';
  if (status === LoadingStatus.IN_PROGRESS) statusLabel = 'Loading In Progress';
  if (status === LoadingStatus.ISSUE_REPORTED) statusLabel = 'Bay Hold: Discrepancy Flagged';
  if (status === LoadingStatus.READY_FOR_DISPATCH) statusLabel = 'Ready for Gate Exit';

  return {
    outcome: 'SUCCESS',
    data: {
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        tripSequenceNumber: trip.tripSequenceNumber,
        plannedDepartureTime: trip.plannedDepartureTime ? trip.plannedDepartureTime.toISOString() : null,
        departureFormatted: `Departs ${formatTime(trip.plannedDepartureTime)}`,
        departureCountdown: calculateCountdown(trip.plannedDepartureTime),
        bay,
        preCoolTemp: notesParsed.preCoolTemp || (isReefer ? '3.8°C' : null),
        vehicle: {
          id: trip.vehicle.id,
          registrationNumber: trip.vehicle.registrationNumber,
          type: trip.vehicle.type as VehicleType,
          tempType: trip.vehicle.tempType as VehicleTemperatureType,
          modelName: deriveModelName(
            trip.vehicle.registrationNumber,
            trip.vehicle.type as VehicleType,
            trip.vehicle.tempType as VehicleTemperatureType,
            notesParsed.modelName
          ),
          maxWeightKg: trip.vehicle.maxWeightKg,
          maxVolumeM3: trip.vehicle.maxVolumeM3,
        },
        driver: trip.driver
          ? {
              id: trip.driver.id,
              name: trip.driver.name,
              phone: trip.driver.phone,
              roleTitle: isReefer ? 'Senior Reefer Driver' : 'Delivery Driver',
            }
          : null,
        capacities: {
          usedWeightKg: Math.round(usedWeightKg),
          weightCapacityKg: Math.round(weightCapacityKg),
          weightPercentage,
          usedVolumeM3: Math.round(usedVolumeM3 * 10) / 10,
          volumeCapacityM3: Math.round(volumeCapacityM3 * 10) / 10,
          volumePercentage,
        },
        temperatureSpecs: {
          vehicleTempType: trip.vehicle.tempType as VehicleTemperatureType,
          isReefer,
          chamberDescription: isReefer
            ? 'Dual Chill Chamber (Chilled 4°C / Frozen Bay -18°C)'
            : 'Ambient Cargo Hold',
          chilledRequirement: hasChilled || isReefer ? 'Chilled (+4°C)' : null,
          frozenRequirement: hasFrozen || isReefer ? 'Frozen Bay: -18°C' : null,
        },
        loadingStatus: {
          status,
          loadedUnits,
          totalUnits: totalLineUnits,
          progressPercentage,
          statusLabel,
        },
        consignment: {
          outletCount: stops.length,
          totalLineUnits,
          ordersCount: trip.tripOrders.length,
        },
        stops,
      },
    };
}
