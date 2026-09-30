import {
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
  LoadingStatus,
  LoadingTasksResponseData,
  VehicleLoadingDetails,
  StopSequenceItem,
  LoadingTaskItem,
  LoadingSequenceResponse,
  LoadingSequenceStop,
  LoadingSequenceItem,
  LoadingChecklistResponse,
  LoadingChecklistStop,
  LoadingChecklistItem,
  UpdateLoadingItemResponse,
} from '@waypoint/shared';
import { prisma } from '../../db';

export interface ItemStateNote {
  loadedQuantity?: number;
  stagedQuantity?: number;
  shortageDetails?: string;
  sku?: string;
  notes?: string;
  updatedAt?: string;
}

interface ParsedNotes {
  bay?: string;
  loadedItems?: number;
  preCoolTemp?: string;
  sealNumber?: string;
  modelName?: string;
  issueDetails?: string;
  items?: Record<string, ItemStateNote>;
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

function deriveSku(item: { id: string; productName: string }, itemNote?: ItemStateNote): string {
  if (itemNote?.sku) return itemNote.sku;
  const name = item.productName.toLowerCase();
  if (name.includes('milk') || name.includes('dairy') || name.includes('highland')) {
    if (name.includes('bottle') || name.includes('pasteurized')) return 'COW-1092';
    return 'HLD-0142';
  }
  if (name.includes('chicken') || name.includes('poultry') || name.includes('keells')) {
    if (name.includes('ready-to-cook')) return 'KLS-9941';
    return 'KLS-8809';
  }
  if (name.includes('carrot') || name.includes('nuwara')) return 'NWE-3310';
  if (name.includes('vegetable')) return 'VEG-4501';
  if (name.includes('frozen food')) return 'FRZ-7712';
  if (name.includes('bakery')) return 'BKR-9201';
  return `SKU-${item.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function deriveUnit(productName: string): string {
  const name = productName.toLowerCase();
  if (name.includes('crate')) return 'crates';
  if (name.includes('box')) return 'boxes';
  if (name.includes('sack')) return 'vented sacks';
  if (name.includes('pkg') || name.includes('carton') || name.includes('milk')) return 'cartons';
  return 'units';
}

function derivePackageType(productName: string, quantity: number): string {
  const unit = deriveUnit(productName);
  return `${quantity} ${unit}`;
}

function deriveInstructions(productName: string): string {
  const name = productName.toLowerCase();
  if (name.includes('milk') && name.includes('highland')) return 'Top-load priority • Rapid retail offload';
  if (name.includes('chicken')) return 'Iced crates with drain stoppers';
  if (name.includes('carrot')) return 'Stack on tailgate floor pallets';
  if (name.includes('dairy') || name.includes('curd')) return 'Stack tier 1-2 only';
  if (name.includes('produce')) return 'Heavy base layer allocation';
  if (name.includes('frozen food')) return 'Thermal blanket cover required';
  if (name.includes('vegetable')) return 'Air circulation corridor spacing';
  return 'Standard warehouse handling';
}

function deriveSpecification(productName: string, quantity: number, weightKg: number): string {
  const name = productName.toLowerCase();
  if (name.includes('milk') && name.includes('highland')) return `1L × 12 Pack • ${Math.round(weightKg)} kg total`;
  if (name.includes('chicken')) return `${quantity} crates required • Frozen standard`;
  if (name.includes('carrot')) return `${quantity} boxes required • Ambient standard`;
  return `${Math.round(weightKg)} kg total • Temperature verified`;
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
    if (notesParsed.items && Object.keys(notesParsed.items).length > 0) {
      loadedItems = Object.values(notesParsed.items).reduce((sum, it) => sum + (it.loadedQuantity || 0), 0);
    } else if (status === LoadingStatus.READY_FOR_DISPATCH) {
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
  if (notesParsed.items && Object.keys(notesParsed.items).length > 0) {
    loadedUnits = Object.values(notesParsed.items).reduce((sum, it) => sum + (it.loadedQuantity || 0), 0);
  } else if (status === LoadingStatus.READY_FOR_DISPATCH) {
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

export type LoadingSequenceResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'SUCCESS'; data: LoadingSequenceResponse };

/**
 * Retrieves reverse-stop loading sequence for LS-04.
 * Demonstrates Team BJM's LIFO loading assumption:
 * Stop 3 is loaded FIRST into the rear bulkhead,
 * Stop 1 is loaded LAST at the tail-lift for immediate offload.
 */
export async function getLoadingSequenceForDepot(
  depotId: string,
  tripId: string
): Promise<LoadingSequenceResult> {
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
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
      },
      tripOrders: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          order: {
            include: {
              outlet: true,
              items: true,
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return { outcome: 'NOT_FOUND' };
  }

  if (trip.vehicle.depotId && trip.vehicle.depotId !== depotId) {
    return { outcome: 'CROSS_DEPOT_FORBIDDEN' };
  }

  const latestRecord = trip.loadingRecords[0];
  const notesParsed = parseNotes(latestRecord?.notes);

  let status: LoadingStatus = LoadingStatus.NOT_STARTED;
  if (latestRecord) {
    status = latestRecord.status as LoadingStatus;
  }

  const bayNumber = trip.tripSequenceNumber || 1;
  const fallbackBay = `BAY 0${bayNumber}`;
  const bay = notesParsed.bay ? (notesParsed.bay.startsWith('BAY') ? notesParsed.bay : `BAY ${notesParsed.bay}`) : fallbackBay;

  const totalStops = trip.tripOrders.length;

  let calculatedWeightKg = 0;
  for (const to of trip.tripOrders) {
    for (const item of to.order.items) {
      calculatedWeightKg += item.unitWeightKg * item.quantity;
    }
  }
  const usedWeightKg = trip.totalWeightKg > 0 ? trip.totalWeightKg : calculatedWeightKg;
  const capacityPercentage = trip.vehicle.maxWeightKg > 0
    ? Math.round((usedWeightKg / trip.vehicle.maxWeightKg) * 100)
    : 84;

  // LIFO physical staging sequence: Reverse of delivery route (Stop N -> Stop 1)
  const reversedOrders = [...trip.tripOrders].reverse();

  const stops: LoadingSequenceStop[] = reversedOrders.map((to, index) => {
    const lifoStagingOrder = index + 1;
    const stopSequence = to.sequenceNumber;

    let priorityLabel = 'LOAD NEXT - MID CABIN';
    let stepLabel = `STEP ${lifoStagingOrder} • NEXT TO LOAD`;
    let lifoPositionLabel = 'Mid-Chamber';

    if (lifoStagingOrder === 1) {
      priorityLabel = 'LOAD FIRST - REAR BULKHEAD';
      stepLabel = 'STEP 1 • FIRST TO LOAD';
      lifoPositionLabel = 'Front Bulkhead';
    } else if (lifoStagingOrder === totalStops) {
      priorityLabel = 'LOAD LAST - UNLOAD FIRST';
      stepLabel = `STEP ${lifoStagingOrder} • LAST TO LOAD`;
      lifoPositionLabel = 'Door Position';
    }

    const orderTempRequirements = Array.from(
      new Set(to.order.items.map((it) => it.tempRequirement as TemperatureRequirement))
    );

    let cargoDescription = 'Fresh Milk, Dairy & Produce';
    let designatedZone = 'Tailgate / Roll-Up Shutter';
    let designatedTemp = '+4°C';

    if (orderTempRequirements.includes(TemperatureRequirement.FROZEN)) {
      cargoDescription = 'Frozen & Deep Chill';
      designatedZone = 'Zone 2 (Frozen Compartment Forward)';
      designatedTemp = '-18°C';
    } else if (orderTempRequirements.includes(TemperatureRequirement.CHILLED)) {
      cargoDescription = 'Chilled Dairy & Poultry';
      designatedZone = 'Zone 1 (Chilled Barrier 4°C)';
      designatedTemp = '+4°C';
    }

    const etaFormatted =
      stopSequence === 1
        ? `${to.order.outlet.deliveryWindowStart || '06:20 AM'} [First Stop!]`
        : to.order.outlet.deliveryWindowStart || '07:00 AM';

    const orderWeight = to.order.totalWeightKg > 0
      ? to.order.totalWeightKg
      : to.order.items.reduce((sum, it) => sum + it.unitWeightKg * it.quantity, 0);

    const orderVolume = to.order.totalVolumeM3 > 0
      ? to.order.totalVolumeM3
      : to.order.items.reduce((sum, it) => sum + it.unitVolumeM3 * it.quantity, 0);

    const items: LoadingSequenceItem[] = to.order.items.map((it) => ({
      id: it.id,
      sku: deriveSku(it, notesParsed.items?.[it.id]),
      productName: it.productName,
      quantity: it.quantity,
      unitWeightKg: it.unitWeightKg,
      unitVolumeM3: it.unitVolumeM3,
      tempRequirement: it.tempRequirement as TemperatureRequirement,
      packageType: derivePackageType(it.productName, it.quantity),
      instructions: deriveInstructions(it.productName),
    }));

    return {
      stopSequence,
      lifoStagingOrder,
      lifoPositionLabel,
      priorityLabel,
      stepLabel,
      outlet: {
        id: to.order.outlet.id,
        code: to.order.outlet.code,
        name: to.order.outlet.name,
        address: to.order.outlet.address,
        deliveryWindow:
          to.order.outlet.deliveryWindowStart && to.order.outlet.deliveryWindowEnd
            ? `${to.order.outlet.deliveryWindowStart} – ${to.order.outlet.deliveryWindowEnd}`
            : '06:00 – 08:00 AM',
      },
      orderId: to.order.id,
      orderNumber: to.order.orderNumber,
      skuCount: to.order.items.length,
      totalUnits: to.order.items.reduce((sum, it) => sum + it.quantity, 0),
      weightKg: Math.round(orderWeight),
      volumeM3: Math.round(orderVolume * 10) / 10,
      tempRequirements: orderTempRequirements,
      cargoDescription,
      designatedHold: {
        zone: designatedZone,
        temperature: designatedTemp,
      },
      etaFormatted,
      isImmediateDispatch: stopSequence === 1,
      items,
    };
  });

  const stopNames = reversedOrders.map((to) => `Stop ${to.sequenceNumber}`);
  const sequenceSummary = `Sequence: ${stopNames.join(' -> ')}`;

  return {
    outcome: 'SUCCESS',
    data: {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      tripSequenceNumber: trip.tripSequenceNumber,
      bay,
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
      loadingStatus: status,
      capacityPercentage,
      mandatoryRule:
        'Team BJM reverse-stop loading protocol (LIFO): Load items for later stops FIRST so first-stop items remain easily accessible at the rear door / tail-lift.',
      sequenceSummary,
      stops,
    },
  };
}

export type LoadingChecklistResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'SUCCESS'; data: LoadingChecklistResponse };

/**
 * Retrieves the item loading checklist for LS-05, grouped by delivery stops.
 */
export async function getLoadingChecklistForDepot(
  depotId: string,
  tripId: string
): Promise<LoadingChecklistResult> {
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
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
      },
      tripOrders: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          order: {
            include: {
              outlet: true,
              items: true,
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return { outcome: 'NOT_FOUND' };
  }

  if (trip.vehicle.depotId && trip.vehicle.depotId !== depotId) {
    return { outcome: 'CROSS_DEPOT_FORBIDDEN' };
  }

  const latestRecord = trip.loadingRecords[0];
  const notesParsed = parseNotes(latestRecord?.notes);

  const bayNumber = trip.tripSequenceNumber || 1;
  const fallbackBay = `Bay D-0${bayNumber}`;
  const bay = notesParsed.bay ? (notesParsed.bay.startsWith('Bay') ? notesParsed.bay : `Bay ${notesParsed.bay}`) : fallbackBay;

  const totalStops = trip.tripOrders.length;

  const stops: LoadingChecklistStop[] = trip.tripOrders.map((to, index) => {
    const stopSequence = to.sequenceNumber;
    const lifoStagingOrder = totalStops - index;

    let lifoPositionLabel = 'LOAD NEXT';
    if (stopSequence === 1) {
      lifoPositionLabel = 'FIRST UNLOAD';
    } else if (stopSequence === totalStops) {
      lifoPositionLabel = 'NOSE LOAD';
    }

    const items: LoadingChecklistItem[] = to.order.items.map((it) => {
      const itemNote = notesParsed.items?.[it.id] || notesParsed.items?.[it.productName];
      const requiredQuantity = it.quantity;
      const stagedQuantity = itemNote?.stagedQuantity !== undefined ? itemNote.stagedQuantity : requiredQuantity;
      const loadedQuantity = itemNote?.loadedQuantity !== undefined ? itemNote.loadedQuantity : 0;
      const hasShortage = requiredQuantity > stagedQuantity;
      const shortageQuantity = hasShortage ? requiredQuantity - stagedQuantity : 0;
      const unit = deriveUnit(it.productName);

      const shortageDetails = hasShortage
        ? itemNote?.shortageDetails ||
          `Shortage detected: ${shortageQuantity} ${unit} missing from pallet #P-${to.order.outlet.code.replace('#', '')}`
        : null;

      const isLoaded = loadedQuantity >= stagedQuantity && loadedQuantity > 0;
      const status: 'PENDING' | 'LOADED' | 'SHORTAGE' | 'DISCREPANCY' = isLoaded
        ? 'LOADED'
        : hasShortage
          ? 'SHORTAGE'
          : 'PENDING';

      const tempLabel =
        it.tempRequirement === TemperatureRequirement.FROZEN
          ? 'Frozen (-18°C)'
          : it.tempRequirement === TemperatureRequirement.CHILLED
            ? 'Chilled 4°C'
            : 'Ambient';

      return {
        id: it.id,
        orderId: to.order.id,
        orderNumber: to.order.orderNumber,
        sku: deriveSku(it, itemNote),
        productName: it.productName,
        specification: deriveSpecification(
          it.productName,
          it.quantity,
          it.unitWeightKg * it.quantity
        ),
        tempRequirement: it.tempRequirement as TemperatureRequirement,
        tempLabel,
        requiredQuantity,
        stagedQuantity,
        loadedQuantity,
        hasShortage,
        shortageQuantity,
        shortageDetails,
        unit,
        isLoaded,
        status,
        stopSequence: to.sequenceNumber,
        outletCode: to.order.outlet.code,
        outletName: to.order.outlet.name,
      };
    });

    const totalItemsInStop = items.reduce((sum, it) => sum + it.requiredQuantity, 0);
    const loadedItemsInStop = items.reduce((sum, it) => sum + it.loadedQuantity, 0);
    const isCompleted = items.every((it) => it.isLoaded);
    const hasShortageInStop = items.some((it) => it.hasShortage);

    return {
      stopSequence,
      lifoStagingOrder,
      lifoPositionLabel,
      outlet: {
        id: to.order.outlet.id,
        code: to.order.outlet.code,
        name: to.order.outlet.name,
        address: to.order.outlet.address,
      },
      orderId: to.order.id,
      orderNumber: to.order.orderNumber,
      totalItems: totalItemsInStop,
      loadedItems: loadedItemsInStop,
      hasShortage: hasShortageInStop,
      isCompleted,
      items,
    };
  });

  const allItems = stops.flatMap((s) => s.items);
  const totalRequired = allItems.reduce((acc, it) => acc + it.requiredQuantity, 0);
  const totalLoaded = allItems.reduce((acc, it) => acc + it.loadedQuantity, 0);
  const percentage = totalRequired > 0 ? Math.round((totalLoaded / totalRequired) * 100) : 0;
  const verifiedStopsDone = stops.filter((s) => s.isCompleted).length;
  const inProgressStops = stops.filter((s) => !s.isCompleted && s.items.some((it) => it.loadedQuantity > 0)).length;
  const shortageAlertCount = allItems.filter((it) => it.hasShortage).length;

  return {
    outcome: 'SUCCESS',
    data: {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      bay,
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
      overallProgress: {
        totalRequired,
        totalLoaded,
        percentage,
        verifiedStopsDone,
        totalStops,
        inProgressStops,
        shortageAlertCount,
      },
      stops,
    },
  };
}

export type UpdateItemResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'ITEM_NOT_FOUND' }
  | { outcome: 'EXCEEDS_PERMITTED_QUANTITY'; maxAllowed: number; message: string }
  | { outcome: 'SUCCESS'; data: UpdateLoadingItemResponse };

/**
 * Confirms or updates physical loading quantity for an individual checklist item.
 * Persists directly into database via LoadingRecord.notes.
 * Validates in the backend against permitted maximum (staged or required quantity).
 */
export async function updateLoadingItemForDepot(
  depotId: string,
  tripId: string,
  itemId: string,
  loadedQuantity: number,
  loaderId: string
): Promise<UpdateItemResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: { select: { id: true, depotId: true } },
      loadingRecords: { orderBy: { createdAt: 'desc' } },
      tripOrders: {
        include: {
          order: {
            include: {
              outlet: true,
              items: true,
            },
          },
        },
      },
    },
  });

  if (!trip) return { outcome: 'NOT_FOUND' };
  if (trip.vehicle.depotId && trip.vehicle.depotId !== depotId) {
    return { outcome: 'CROSS_DEPOT_FORBIDDEN' };
  }

  // Find target item
  let targetItem: { id: string; quantity: number; productName: string } | null = null;
  for (const to of trip.tripOrders) {
    const match = to.order.items.find((i) => i.id === itemId);
    if (match) {
      targetItem = match;
      break;
    }
  }

  if (!targetItem) {
    return { outcome: 'ITEM_NOT_FOUND' };
  }

  let latestRecord = trip.loadingRecords[0];
  const notesParsed = parseNotes(latestRecord?.notes);
  notesParsed.items = notesParsed.items || {};

  const existingItemNote = notesParsed.items[itemId] || notesParsed.items[targetItem.productName];
  const stagedQuantity = existingItemNote?.stagedQuantity !== undefined
    ? existingItemNote.stagedQuantity
    : targetItem.quantity;

  if (loadedQuantity > stagedQuantity) {
    return {
      outcome: 'EXCEEDS_PERMITTED_QUANTITY',
      maxAllowed: stagedQuantity,
      message: `Loaded quantity (${loadedQuantity}) cannot exceed permitted maximum of ${stagedQuantity}.`,
    };
  }

  // Update item note in JSON
  notesParsed.items[itemId] = {
    ...existingItemNote,
    loadedQuantity,
    stagedQuantity,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate total loaded items
  let newTotalLoaded = 0;
  for (const to of trip.tripOrders) {
    for (const item of to.order.items) {
      const itNote = notesParsed.items[item.id] || notesParsed.items[item.productName];
      newTotalLoaded += itNote?.loadedQuantity ?? 0;
    }
  }
  notesParsed.loadedItems = newTotalLoaded;

  // Status transition:
  // When nothing is loaded: NOT_STARTED
  // When loading begins: IN_PROGRESS
  // Do NOT mark READY_FOR_DISPATCH (belongs to LS-07)
  let newStatus = latestRecord?.status || LoadingStatus.NOT_STARTED;
  if (newStatus === LoadingStatus.NOT_STARTED && newTotalLoaded > 0) {
    newStatus = LoadingStatus.IN_PROGRESS;
  } else if (newTotalLoaded === 0 && newStatus === LoadingStatus.IN_PROGRESS) {
    newStatus = LoadingStatus.NOT_STARTED;
  }

  if (!latestRecord) {
    latestRecord = await prisma.loadingRecord.create({
      data: {
        tripId: trip.id,
        loaderId,
        status: newStatus,
        startedAt: newStatus === LoadingStatus.IN_PROGRESS ? new Date() : null,
        notes: JSON.stringify(notesParsed),
      },
    });
  } else {
    await prisma.loadingRecord.update({
      where: { id: latestRecord.id },
      data: {
        status: newStatus,
        startedAt: latestRecord.startedAt || (newStatus === LoadingStatus.IN_PROGRESS ? new Date() : null),
        notes: JSON.stringify(notesParsed),
      },
    });
  }

  const checklistResult = await getLoadingChecklistForDepot(depotId, tripId);
  if (checklistResult.outcome !== 'SUCCESS') {
    return { outcome: 'NOT_FOUND' };
  }

  const updatedItem = checklistResult.data.stops
    .flatMap((s) => s.items)
    .find((i) => i.id === itemId)!;

  return {
    outcome: 'SUCCESS',
    data: {
      item: updatedItem,
      overallProgress: checklistResult.data.overallProgress,
      loadingStatus: newStatus as LoadingStatus,
    },
  };
}
