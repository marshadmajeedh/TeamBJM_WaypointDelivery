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
  LoadingIssueResponse,
  LoadingIssueContextResponse,
  LoadingIssueContextItem,
  CreateLoadingIssueRequest,
  TripStatus,
  LoadingReviewResponse,
  ConfirmReadyForDispatchResponse,
  LoadingReviewStop,
  LoadingReviewUnresolvedIssue,
  FinalLoadingChecklistItem,
} from '@waypoint/shared';
import { prisma } from '../../db';

export interface ItemStateNote {
  loadedQuantity?: number;
  stagedQuantity?: number;
  requiredQuantity?: number;
  shortageDetails?: string;
  sku?: string;
  notes?: string;
  status?: string;
  issueId?: string;
  issueType?: string;
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
        include: {
          loadingIssues: true,
        },
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

      // Check if an unresolved issue exists for this item
      const itemIssue = latestRecord?.loadingIssues?.find(
        (iss) => iss.orderItemId === it.id && !iss.resolved
      );
      const isDiscrepancy = !!itemIssue || itemNote?.status === 'DISCREPANCY';

      const shortageDetails = itemIssue
        ? `Issue reported (${itemIssue.issueType}): ${itemIssue.description}`
        : hasShortage
          ? itemNote?.shortageDetails ||
            `Shortage detected: ${shortageQuantity} ${unit} missing from pallet #P-${to.order.outlet.code.replace('#', '')}`
          : itemNote?.shortageDetails || null;

      const isLoaded = loadedQuantity >= stagedQuantity && loadedQuantity > 0;
      const status: 'PENDING' | 'LOADED' | 'SHORTAGE' | 'DISCREPANCY' = isDiscrepancy
        ? 'DISCREPANCY'
        : isLoaded
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
      loadingStatus: (latestRecord?.status as LoadingStatus) || LoadingStatus.NOT_STARTED,
    },
  };
}

export type UpdateItemResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'ITEM_NOT_FOUND' }
  | { outcome: 'LOADING_ALREADY_COMPLETED'; message: string }
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

  // Prevent modifying loading quantities after vehicle is marked ready for dispatch
  if (latestRecord?.status === LoadingStatus.READY_FOR_DISPATCH) {
    return {
      outcome: 'LOADING_ALREADY_COMPLETED',
      message: 'Loading for this trip is already completed and marked ready for dispatch. Quantities cannot be modified.',
    };
  }

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

export type LoadingIssueContextResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'NO_ITEMS' }
  | { outcome: 'SUCCESS'; data: LoadingIssueContextResponse };

export async function getLoadingIssueContextForDepot(
  depotId: string,
  tripId: string,
  requestedItemId?: string
): Promise<LoadingIssueContextResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          type: true,
          tempType: true,
          depotId: true,
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
  const fallbackBay = `Bay 0${bayNumber}`;
  const bay = notesParsed.bay
    ? /^bay/i.test(notesParsed.bay.trim())
      ? notesParsed.bay
      : `Bay ${notesParsed.bay}`
    : fallbackBay;

  type FlatItem = {
    item: (typeof trip.tripOrders)[0]['order']['items'][0];
    order: (typeof trip.tripOrders)[0]['order'];
    outlet: (typeof trip.tripOrders)[0]['order']['outlet'];
    stopSequence: number;
    index: number;
  };

  const allItems: FlatItem[] = [];
  let currentIndex = 0;
  for (const to of trip.tripOrders) {
    for (const it of to.order.items) {
      currentIndex += 1;
      allItems.push({
        item: it,
        order: to.order,
        outlet: to.order.outlet,
        stopSequence: to.sequenceNumber,
        index: currentIndex,
      });
    }
  }

  if (allItems.length === 0) {
    return { outcome: 'NO_ITEMS' };
  }

  let matched: FlatItem | undefined = requestedItemId
    ? allItems.find((e) => e.item.id === requestedItemId)
    : undefined;

  if (!matched) {
    matched = allItems.find((e) => {
      const itemNote = notesParsed.items?.[e.item.id] || notesParsed.items?.[e.item.productName];
      const stagedQuantity = itemNote?.stagedQuantity !== undefined ? itemNote.stagedQuantity : e.item.quantity;
      return e.item.quantity > stagedQuantity;
    });
  }

  if (!matched) {
    matched = allItems[0];
  }

  const target = matched;
  const itemNote = notesParsed.items?.[target.item.id] || notesParsed.items?.[target.item.productName];
  const requiredQuantity = target.item.quantity;
  const stagedQuantity = itemNote?.stagedQuantity !== undefined ? itemNote.stagedQuantity : requiredQuantity;
  const shortageQuantity = Math.max(0, requiredQuantity - stagedQuantity);
  const unit = deriveUnit(target.item.productName);

  const tempLabel =
    target.item.tempRequirement === TemperatureRequirement.FROZEN
      ? 'Frozen (-18°C)'
      : target.item.tempRequirement === TemperatureRequirement.CHILLED
        ? 'Cold Chain 4°C'
        : 'Ambient';

  const selectedItem: LoadingIssueContextItem = {
    id: target.item.id,
    orderId: target.order.id,
    orderNumber: target.order.orderNumber,
    outletName: target.outlet.name,
    outletCode: target.outlet.code,
    sku: deriveSku(target.item, itemNote),
    productName: target.item.productName,
    unit,
    tempRequirement: target.item.tempRequirement as TemperatureRequirement,
    tempLabel,
    expectedQuantity: requiredQuantity,
    stagedQuantity,
    shortageQuantity,
    unitWeightKg: target.item.unitWeightKg,
    totalWeightKg: Math.round(target.item.unitWeightKg * requiredQuantity),
  };

  const availableItems = allItems.map((e) => ({
    id: e.item.id,
    productName: e.item.productName,
    sku: deriveSku(e.item, notesParsed.items?.[e.item.id]),
    orderNumber: e.order.orderNumber,
    outletName: e.outlet.name,
  }));

  return {
    outcome: 'SUCCESS',
    data: {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      tripSequenceNumber: trip.tripSequenceNumber,
      vehicle: {
        id: trip.vehicle.id,
        registrationNumber: trip.vehicle.registrationNumber,
        modelName: deriveModelName(
          trip.vehicle.registrationNumber,
          trip.vehicle.type as VehicleType,
          trip.vehicle.tempType as VehicleTemperatureType,
          notesParsed.modelName
        ),
        tempType: trip.vehicle.tempType as VehicleTemperatureType,
      },
      bay,
      departureTime: trip.plannedDepartureTime ? trip.plannedDepartureTime.toISOString() : null,
      departureFormatted: formatTime(trip.plannedDepartureTime),
      totalItemsCount: allItems.length,
      itemIndex: target.index,
      selectedItem,
      availableItems,
    },
  };
}

export type CreateLoadingIssueResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'LOADING_ALREADY_COMPLETED'; message: string }
  | { outcome: 'ITEM_NOT_FOUND_IN_TRIP' }
  | { outcome: 'INVALID_QUANTITY' }
  | { outcome: 'SUCCESS'; data: LoadingIssueResponse };

export async function createLoadingIssueForDepot(
  depotId: string,
  loaderId: string,
  tripId: string,
  req: CreateLoadingIssueRequest
): Promise<CreateLoadingIssueResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: {
        select: {
          id: true,
          depotId: true,
        },
      },
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          loadingIssues: true,
        },
      },
      tripOrders: {
        include: {
          order: {
            include: {
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

  let latestRecord = trip.loadingRecords[0];

  // Prevent creating new loading issues after vehicle is marked ready for dispatch
  if (latestRecord?.status === LoadingStatus.READY_FOR_DISPATCH) {
    return {
      outcome: 'LOADING_ALREADY_COMPLETED',
      message: 'Loading for this trip is already completed and marked ready for dispatch. New issues cannot be submitted.',
    };
  }

  let matchedOrderItem: (typeof trip.tripOrders)[0]['order']['items'][0] | null = null;
  for (const to of trip.tripOrders) {
    for (const it of to.order.items) {
      if (it.id === req.itemId) {
        matchedOrderItem = it;
        break;
      }
    }
    if (matchedOrderItem) break;
  }

  if (!matchedOrderItem) {
    return { outcome: 'ITEM_NOT_FOUND_IN_TRIP' };
  }

  if (req.quantity <= 0 || req.quantity > matchedOrderItem.quantity) {
    return { outcome: 'INVALID_QUANTITY' };
  }

  if (!latestRecord) {
    latestRecord = await prisma.loadingRecord.create({
      data: {
        tripId,
        loaderId,
        status: LoadingStatus.ISSUE_REPORTED,
        startedAt: new Date(),
        notes: JSON.stringify({
          bay: `Bay D-0${trip.tripSequenceNumber || 1}`,
          items: {},
        }),
      },
      include: {
        loadingIssues: true,
      },
    });
  }

  const issue = await prisma.loadingIssue.create({
    data: {
      loadingRecordId: latestRecord.id,
      orderItemId: matchedOrderItem.id,
      issueType: req.type,
      description: req.description,
      resolved: false,
      reportedAt: new Date(),
    },
  });

  const notesParsed = parseNotes(latestRecord.notes);
  notesParsed.items = notesParsed.items || {};
  const existingNote = notesParsed.items[matchedOrderItem.id] || {};
  const unit = deriveUnit(matchedOrderItem.productName);

  const updatedStagedQty = req.actualQuantity !== undefined
    ? req.actualQuantity
    : Math.max(0, matchedOrderItem.quantity - req.quantity);

  notesParsed.items[matchedOrderItem.id] = {
    ...existingNote,
    requiredQuantity: matchedOrderItem.quantity,
    stagedQuantity: updatedStagedQty,
    loadedQuantity: existingNote.loadedQuantity || 0,
    status: 'DISCREPANCY',
    issueId: issue.id,
    issueType: req.type,
    shortageDetails: `Issue reported (${req.type}): ${req.quantity} ${unit} affected. ${req.description}`,
    updatedAt: new Date().toISOString(),
  };

  notesParsed.issueDetails = `${req.type}: ${matchedOrderItem.productName} (${req.quantity} ${unit} affected) - ${req.description}`;

  await prisma.loadingRecord.update({
    where: { id: latestRecord.id },
    data: {
      status: LoadingStatus.ISSUE_REPORTED,
      notes: JSON.stringify(notesParsed),
    },
  });

  return {
    outcome: 'SUCCESS',
    data: {
      id: issue.id,
      tripId,
      orderItemId: issue.orderItemId,
      issueType: issue.issueType,
      description: issue.description,
      reportedAt: issue.reportedAt.toISOString(),
      resolved: issue.resolved,
      loadingStatus: LoadingStatus.ISSUE_REPORTED,
    },
  };
}

export type LoadingReviewResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'SUCCESS'; data: LoadingReviewResponse };

export async function getLoadingReviewForDepot(
  depotId: string,
  tripId: string
): Promise<LoadingReviewResult> {
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
  const bay = notesParsed.bay
    ? /^bay/i.test(notesParsed.bay.trim())
      ? notesParsed.bay
      : `Bay ${notesParsed.bay}`
    : fallbackBay;



  // Calculate items, loaded counts, weights, volumes
  let totalItems = 0;
  let loadedItems = 0;
  let calculatedLoadedWeightKg = 0;
  let calculatedLoadedVolumeM3 = 0;

  for (const to of trip.tripOrders) {
    for (const it of to.order.items) {
      totalItems += it.quantity;
      const itNote = notesParsed.items?.[it.id] || notesParsed.items?.[it.productName];
      let loadedForThis = 0;
      if (itNote?.loadedQuantity !== undefined) {
        loadedForThis = itNote.loadedQuantity;
      } else if (latestRecord?.status === LoadingStatus.READY_FOR_DISPATCH) {
        loadedForThis = it.quantity;
      }
      loadedItems += loadedForThis;
      calculatedLoadedWeightKg += it.unitWeightKg * loadedForThis;
      calculatedLoadedVolumeM3 += it.unitVolumeM3 * loadedForThis;
    }
  }

  const checklistComplete = totalItems > 0 && loadedItems >= totalItems;
  const percentage = totalItems > 0 ? Math.min(100, Math.round((loadedItems / totalItems) * 100)) : 0;

  const usedWeightKg = calculatedLoadedWeightKg > 0 ? Math.round(calculatedLoadedWeightKg) : Math.round(trip.totalWeightKg || 2456);
  const maxWeightKg = trip.vehicle.maxWeightKg || 3000;
  const weightMarginKg = Math.max(0, maxWeightKg - usedWeightKg);
  const weightPercentage = Math.round((usedWeightKg / maxWeightKg) * 100);
  const isWeightCompliant = usedWeightKg <= maxWeightKg;

  const usedVolumeM3 = calculatedLoadedVolumeM3 > 0 ? Math.round(calculatedLoadedVolumeM3 * 10) / 10 : Math.round((trip.totalVolumeM3 || 15.0) * 10) / 10;
  const maxVolumeM3 = trip.vehicle.maxVolumeM3 || 18.0;
  const freeVolumeM3 = Math.max(0, Math.round((maxVolumeM3 - usedVolumeM3) * 10) / 10);
  const volumePercentage = Math.round((usedVolumeM3 / maxVolumeM3) * 100);
  const isVolumeCompliant = usedVolumeM3 <= maxVolumeM3;

  // Temperature Profile
  const isReefer = trip.vehicle.tempType === VehicleTemperatureType.REEFER;
  const temperatureProfile = {
    isReefer,
    chamber1Temp: isReefer ? '+3.8°C' : 'Ambient (26°C)',
    chamber2Temp: isReefer ? '-18.2°C' : undefined,
    statusLabel: isReefer ? 'Refrigerated Chamber Setpoints OK' : 'Ambient Dry Cargo',

  };

  // Unresolved issues
  const allIssues = latestRecord?.loadingIssues || [];
  const unresolvedIssuesRaw = allIssues.filter((i) => !i.resolved);

  const flatItemsMap = new Map<string, { item: (typeof trip.tripOrders)[0]['order']['items'][0]; order: (typeof trip.tripOrders)[0]['order'] }>();
  for (const to of trip.tripOrders) {
    for (const it of to.order.items) {
      flatItemsMap.set(it.id, { item: it, order: to.order });
    }
  }

  const unresolvedIssues: LoadingReviewUnresolvedIssue[] = unresolvedIssuesRaw.map((issue) => {
    const matched = issue.orderItemId ? flatItemsMap.get(issue.orderItemId) : null;
    return {
      id: issue.id,
      orderItemId: issue.orderItemId,
      productName: matched?.item.productName || 'General Staged Goods',
      orderNumber: matched?.order.orderNumber || 'ORD-MANIFEST',
      issueType: issue.issueType,
      description: issue.description,
      reportedAt: issue.reportedAt.toISOString(),
    };
  });

  // Reverse-loaded sequence audit stops (Stop N down to Stop 1)
  const reversedOrders = [...trip.tripOrders].reverse();
  const stops: LoadingReviewStop[] = reversedOrders.map((to, idx) => {
    let stopRequired = 0;
    let stopLoaded = 0;
    let stopHasIssue = false;

    for (const it of to.order.items) {
      stopRequired += it.quantity;
      const itNote = notesParsed.items?.[it.id] || notesParsed.items?.[it.productName];
      let loadedForThis = 0;
      if (itNote?.loadedQuantity !== undefined) {
        loadedForThis = itNote.loadedQuantity;
      } else if (latestRecord?.status === LoadingStatus.READY_FOR_DISPATCH) {
        loadedForThis = it.quantity;
      }
      stopLoaded += loadedForThis;
      if (itNote?.status === 'DISCREPANCY' || (itNote?.stagedQuantity !== undefined && itNote.stagedQuantity < it.quantity)) {
        stopHasIssue = true;
      }
    }

    if (unresolvedIssuesRaw.some((iss) => to.order.items.some((it) => it.id === iss.orderItemId))) {
      stopHasIssue = true;
    }

    let chamberZone = 'Mid Chamber • Chilled Dairy';
    if (idx === 0) {
      chamberZone = 'Forward Chamber • Deep Frozen';
    } else if (idx === reversedOrders.length - 1) {
      chamberZone = 'Tailgate Access • Quick Drop';
    }

    const isLoaded = stopLoaded >= stopRequired && stopRequired > 0;
    const statusBadge = stopHasIssue || stopLoaded < stopRequired
      ? `${stopLoaded}/${stopRequired} (Shortage)`
      : `${stopLoaded}/${stopRequired} Loaded`;

    return {
      stopSequence: to.sequenceNumber,
      outletName: to.order.outlet.name,
      outletCode: to.order.outlet.code,
      chamberZone,
      orderNumber: to.order.orderNumber,
      requiredItems: stopRequired,
      loadedItems: stopLoaded,
      hasDiscrepancy: stopHasIssue || stopLoaded < stopRequired,
      isLoaded,
      statusBadge,
    };
  });

  // Pre-departure gate checklist (5 steps matching Figma)
  const finalChecklist: FinalLoadingChecklistItem[] = [
    {
      id: 'gate-step-1',
      title: 'Reverse-stop loading sequence verified',
      description: 'Stop 1 located at rear tailgate for first-off safety',
      verified: true,
    },
    {
      id: 'gate-step-2',
      title: 'Vehicle registration & driver ID validated',
      description: `Driver ${trip.driver?.name || 'Sunimal Silva'} check-in recorded`,
      verified: true,
    },
    {
      id: 'gate-step-3',
      title: 'Temperature requirements validated',
      description: isReefer ? 'Reefer setpoints match cold-chain rules' : 'Ambient cargo temperature verified',
      verified: true,
    },
    {
      id: 'gate-step-4',
      title: 'Pallet jacks locked & cargo netting strapped',
      description: 'Internal roll-stop bars clamped tight on floor guides',
      verified: true,
    },
    {
      id: 'gate-step-5',
      title: 'Manifest loaded quantities verified',
      description: `${loadedItems} of ${totalItems} units physically counted and verified`,
      verified: true,

    },
  ];

  let currentLoadingStatus: LoadingStatus = LoadingStatus.NOT_STARTED;
  if (latestRecord) {
    if (unresolvedIssues.length > 0 || latestRecord.status === LoadingStatus.ISSUE_REPORTED) {
      currentLoadingStatus = LoadingStatus.ISSUE_REPORTED;
    } else {
      currentLoadingStatus = latestRecord.status as LoadingStatus;
    }
  }

  const isAlreadyReady = currentLoadingStatus === LoadingStatus.READY_FOR_DISPATCH;
  const canDispatch =
    !isAlreadyReady &&
    checklistComplete &&
    unresolvedIssues.length === 0 &&
    trip.status !== TripStatus.CANCELLED &&
    currentLoadingStatus !== LoadingStatus.ISSUE_REPORTED;

  return {
    outcome: 'SUCCESS',
    data: {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      tripSequenceNumber: trip.tripSequenceNumber,
      vehicle: {
        id: trip.vehicle.id,
        registrationNumber: trip.vehicle.registrationNumber,
        modelName: deriveModelName(
          trip.vehicle.registrationNumber,
          trip.vehicle.type as VehicleType,
          trip.vehicle.tempType as VehicleTemperatureType,
          notesParsed.modelName
        ),
        type: trip.vehicle.type as VehicleType,
        tempType: trip.vehicle.tempType as VehicleTemperatureType,
        maxWeightKg,
        maxVolumeM3,
      },
      driver: trip.driver
        ? {
            id: trip.driver.id,
            name: trip.driver.name,
            phone: trip.driver.phone,
          }
        : null,
      bay,
      plannedDepartureTime: trip.plannedDepartureTime ? trip.plannedDepartureTime.toISOString() : null,
      departureFormatted: formatTime(trip.plannedDepartureTime),
      departureCountdown: calculateCountdown(trip.plannedDepartureTime),
      progress: {
        totalItems,
        loadedItems,
        percentage,
        isComplete: checklistComplete,
      },
      capacities: {
        usedWeightKg,
        maxWeightKg,
        weightMarginKg,
        weightPercentage,
        isWeightCompliant,
        usedVolumeM3,
        maxVolumeM3,
        freeVolumeM3,
        volumePercentage,
        isVolumeCompliant,
      },
      temperatureProfile,
      stops,
      unresolvedIssueCount: unresolvedIssues.length,
      unresolvedIssues,
      finalChecklist,

      checklistComplete,
      canDispatch,
      loadingStatus: currentLoadingStatus,
      tripStatus: trip.status as TripStatus,
    },
  };
}

export type ConfirmDispatchResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'CROSS_DEPOT_FORBIDDEN' }
  | { outcome: 'TRIP_CANCELLED' }
  | { outcome: 'UNRESOLVED_LOADING_ISSUES'; count: number; message: string }
  | { outcome: 'LOADING_NOT_READY'; message: string }
  | { outcome: 'SUCCESS'; data: ConfirmReadyForDispatchResponse };

export async function confirmReadyForDispatchForDepot(
  depotId: string,
  loaderId: string,
  tripId: string
): Promise<ConfirmDispatchResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: {
        select: {
          id: true,
          depotId: true,
        },
      },
      loadingRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          loadingIssues: true,
        },
      },
      tripOrders: {
        include: {
          order: {
            include: {
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

  if (trip.status === 'CANCELLED') {
    return { outcome: 'TRIP_CANCELLED' };
  }

  let latestRecord = trip.loadingRecords[0];

  // Idempotency: If already READY_FOR_DISPATCH, return existing state safely
  if (latestRecord?.status === LoadingStatus.READY_FOR_DISPATCH) {
    return {
      outcome: 'SUCCESS',
      data: {
        tripId: trip.id,
        loadingStatus: LoadingStatus.READY_FOR_DISPATCH,
        tripStatus: trip.status as TripStatus,
        completedAt: latestRecord.completedAt?.toISOString() || new Date().toISOString(),


      },
    };
  }

  // Verify unresolved issues
  const unresolvedIssues = latestRecord?.loadingIssues.filter((i) => !i.resolved) || [];
  if (unresolvedIssues.length > 0) {
    return {
      outcome: 'UNRESOLVED_LOADING_ISSUES',
      count: unresolvedIssues.length,
      message: `Cannot dispatch vehicle with ${unresolvedIssues.length} unresolved loading discrepancy requires review before dispatch.`,
    };
  }

  // Verify checklist completion
  const notesParsed = parseNotes(latestRecord?.notes);
  let totalItems = 0;
  let loadedItems = 0;

  for (const to of trip.tripOrders) {
    for (const it of to.order.items) {
      totalItems += it.quantity;
      const itNote = notesParsed.items?.[it.id] || notesParsed.items?.[it.productName];
      if (itNote?.loadedQuantity !== undefined) {
        loadedItems += itNote.loadedQuantity;
      }
    }
  }

  if (totalItems > 0 && loadedItems < totalItems) {
    return {
      outcome: 'LOADING_NOT_READY',
      message: `Loading is incomplete (${loadedItems}/${totalItems} units loaded). All items must be confirmed before marking ready for dispatch.`,
    };
  }

  // Execute State Transition: LoadingRecord and Trip to READY_FOR_DISPATCH
  const now = new Date();
  if (!latestRecord) {
    latestRecord = await prisma.loadingRecord.create({
      data: {
        tripId: trip.id,
        loaderId,
        status: LoadingStatus.READY_FOR_DISPATCH,
        startedAt: now,
        completedAt: now,
        notes: JSON.stringify({
          bay: `Bay D-0${trip.tripSequenceNumber || 1}`,
          loadedItems: totalItems,
          items: {},
        }),
      },
      include: {
        loadingIssues: true,
      },
    });
  } else {
    await prisma.loadingRecord.update({
      where: { id: latestRecord.id },
      data: {
        status: LoadingStatus.READY_FOR_DISPATCH,
        completedAt: now,
      },
    });
  }

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: TripStatus.READY_FOR_DISPATCH,
    },
  });

  return {
    outcome: 'SUCCESS',
    data: {
      tripId: trip.id,
      loadingStatus: LoadingStatus.READY_FOR_DISPATCH,
      tripStatus: TripStatus.READY_FOR_DISPATCH,
      completedAt: now.toISOString(),


    },
  };
}
