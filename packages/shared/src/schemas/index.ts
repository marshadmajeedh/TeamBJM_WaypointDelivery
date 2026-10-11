import { z } from 'zod';
import {
  UserRole,
  OrderStatus,
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
  TripStatus,
  LoadingStatus,
  DeliveryOutcome,
  SyncStatus,
} from '../enums';

export const UserRoleSchema = z.nativeEnum(UserRole);
export const OrderStatusSchema = z.nativeEnum(OrderStatus);
export const VehicleTypeSchema = z.nativeEnum(VehicleType);
export const VehicleTemperatureTypeSchema = z.nativeEnum(VehicleTemperatureType);
export const TemperatureRequirementSchema = z.nativeEnum(TemperatureRequirement);
export const TripStatusSchema = z.nativeEnum(TripStatus);
export const LoadingStatusSchema = z.nativeEnum(LoadingStatus);
export const DeliveryOutcomeSchema = z.nativeEnum(DeliveryOutcome);
export const SyncStatusSchema = z.nativeEnum(SyncStatus);

// API Response Schemas
export const ApiResponseSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiResponseErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('waypoint-api'),
});

// Auth Baseline Schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: UserRoleSchema,
  depotId: z.string().nullable().optional(),
});

export const AuthenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  name: z.string().optional(),
  depotId: z.string().nullable().optional(),
});

export const LoginResponseDataSchema = z.object({
  token: z.string(),
  user: AuthenticatedUserSchema,
});

export const TokenPayloadSchema = z.object({
  sub: z.string(),
  role: UserRoleSchema,
});

// Loader Task Dashboard & Vehicle Details Schemas (LS-02 & LS-03)
export const LoadingTaskSummarySchema = z.object({
  vehiclesToLoad: z.number(),
  inProgress: z.number(),
  readyForDispatch: z.number(),
  discrepancies: z.number(),
  activeBaysCount: z.number(),
});

export const LoadingTaskItemSchema = z.object({
  id: z.string(),
  tripNumber: z.string(),
  tripSequenceNumber: z.number(),
  bay: z.string(),
  status: LoadingStatusSchema,
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    type: VehicleTypeSchema,
    tempType: VehicleTemperatureTypeSchema,
    modelName: z.string(),
  }),
  plannedDepartureTime: z.string().nullable(),
  departureFormatted: z.string(),
  departureCountdown: z.string(),
  ordersCount: z.number(),
  stopsCount: z.number(),
  stopsSummary: z.string(),
  temperatureRequirement: z.string(),
  targetTemperatureVerified: z.boolean(),
  progress: z.object({
    loadedItems: z.number(),
    totalItems: z.number(),
    percentage: z.number(),
    label: z.string(),
  }),
  issue: z
    .object({
      hasIssue: z.boolean(),
      issueType: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
    .nullable(),
  driver: z
    .object({
      name: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  sealNumber: z.string().nullable().optional(),
});

export const LoadingTasksResponseDataSchema = z.object({
  summary: LoadingTaskSummarySchema,
  tasks: z.array(LoadingTaskItemSchema),
});

export const StopSequenceItemSchema = z.object({
  stopSequence: z.number(),
  lifoStagingOrder: z.number(),
  lifoPositionLabel: z.string(),
  outlet: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    address: z.string(),
    deliveryWindow: z.string(),
  }),
  orderId: z.string(),
  orderNumber: z.string(),
  skuCount: z.number(),
  totalUnits: z.number(),
  weightKg: z.number(),
  volumeM3: z.number(),
  tempRequirements: z.array(TemperatureRequirementSchema),
  items: z.array(
    z.object({
      id: z.string(),
      productName: z.string(),
      quantity: z.number(),
      unitWeightKg: z.number(),
      unitVolumeM3: z.number(),
      tempRequirement: TemperatureRequirementSchema,
    })
  ),
});

export const VehicleLoadingDetailsSchema = z.object({
  tripId: z.string(),
  tripNumber: z.string(),
  tripSequenceNumber: z.number(),
  plannedDepartureTime: z.string().nullable(),
  departureFormatted: z.string(),
  departureCountdown: z.string(),
  bay: z.string(),
  preCoolTemp: z.string().nullable().optional(),
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    type: VehicleTypeSchema,
    tempType: VehicleTemperatureTypeSchema,
    modelName: z.string(),
    maxWeightKg: z.number(),
    maxVolumeM3: z.number(),
  }),
  driver: z
    .object({
      id: z.string().optional(),
      name: z.string(),
      phone: z.string().nullable().optional(),
      roleTitle: z.string(),
    })
    .nullable()
    .optional(),
  capacities: z.object({
    usedWeightKg: z.number(),
    weightCapacityKg: z.number(),
    weightPercentage: z.number(),
    usedVolumeM3: z.number(),
    volumeCapacityM3: z.number(),
    volumePercentage: z.number(),
  }),
  temperatureSpecs: z.object({
    vehicleTempType: VehicleTemperatureTypeSchema,
    isReefer: z.boolean(),
    chamberDescription: z.string(),
    chilledRequirement: z.string().nullable(),
    frozenRequirement: z.string().nullable(),
  }),
  loadingStatus: z.object({
    status: LoadingStatusSchema,
    loadedUnits: z.number(),
    totalUnits: z.number(),
    progressPercentage: z.number(),
    statusLabel: z.string(),
  }),
  consignment: z.object({
    outletCount: z.number(),
    totalLineUnits: z.number(),
    ordersCount: z.number(),
  }),
  stops: z.array(StopSequenceItemSchema),
});

// Loading Sequence Schemas (LS-04)
export const LoadingSequenceItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitWeightKg: z.number(),
  unitVolumeM3: z.number(),
  tempRequirement: TemperatureRequirementSchema,
  packageType: z.string(),
  instructions: z.string().nullable().optional(),
});

export const LoadingSequenceStopSchema = z.object({
  stopSequence: z.number(),
  lifoStagingOrder: z.number(),
  lifoPositionLabel: z.string(),
  priorityLabel: z.string(),
  stepLabel: z.string(),
  outlet: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    address: z.string(),
    deliveryWindow: z.string(),
  }),
  orderId: z.string(),
  orderNumber: z.string(),
  skuCount: z.number(),
  totalUnits: z.number(),
  weightKg: z.number(),
  volumeM3: z.number(),
  tempRequirements: z.array(TemperatureRequirementSchema),
  cargoDescription: z.string(),
  designatedHold: z.object({
    zone: z.string(),
    temperature: z.string(),
  }),
  etaFormatted: z.string(),
  isImmediateDispatch: z.boolean(),
  items: z.array(LoadingSequenceItemSchema),
});

export const LoadingSequenceResponseSchema = z.object({
  tripId: z.string(),
  tripNumber: z.string(),
  tripSequenceNumber: z.number(),
  bay: z.string(),
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    type: VehicleTypeSchema,
    tempType: VehicleTemperatureTypeSchema,
    modelName: z.string(),
  }),
  plannedDepartureTime: z.string().nullable(),
  departureFormatted: z.string(),
  loadingStatus: LoadingStatusSchema,
  capacityPercentage: z.number(),
  mandatoryRule: z.string(),
  sequenceSummary: z.string(),
  stops: z.array(LoadingSequenceStopSchema),
});

// Loading Checklist Schemas (LS-05)
export const LoadingChecklistItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  sku: z.string(),
  productName: z.string(),
  specification: z.string(),
  tempRequirement: TemperatureRequirementSchema,
  tempLabel: z.string(),
  requiredQuantity: z.number(),
  stagedQuantity: z.number(),
  loadedQuantity: z.number(),
  hasShortage: z.boolean(),
  shortageQuantity: z.number(),
  shortageDetails: z.string().nullable().optional(),
  unit: z.string(),
  isLoaded: z.boolean(),
  status: z.enum(['PENDING', 'LOADED', 'SHORTAGE', 'DISCREPANCY']),
  stopSequence: z.number(),
  outletCode: z.string(),
  outletName: z.string(),
});

export const LoadingChecklistStopSchema = z.object({
  stopSequence: z.number(),
  lifoStagingOrder: z.number(),
  lifoPositionLabel: z.string(),
  outlet: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    address: z.string(),
  }),
  orderId: z.string(),
  orderNumber: z.string(),
  totalItems: z.number(),
  loadedItems: z.number(),
  hasShortage: z.boolean(),
  isCompleted: z.boolean(),
  items: z.array(LoadingChecklistItemSchema),
});

export const LoadingChecklistOverallProgressSchema = z.object({
  totalRequired: z.number(),
  totalLoaded: z.number(),
  percentage: z.number(),
  verifiedStopsDone: z.number(),
  totalStops: z.number(),
  inProgressStops: z.number(),
  shortageAlertCount: z.number(),
});

export const LoadingChecklistResponseSchema = z.object({
  tripId: z.string(),
  tripNumber: z.string(),
  bay: z.string(),
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    type: VehicleTypeSchema,
    tempType: VehicleTemperatureTypeSchema,
    modelName: z.string(),
  }),
  plannedDepartureTime: z.string().nullable(),
  departureFormatted: z.string(),
  overallProgress: LoadingChecklistOverallProgressSchema,
  stops: z.array(LoadingChecklistStopSchema),
  loadingStatus: LoadingStatusSchema.optional(),
});

export const UpdateLoadingItemRequestSchema = z.object({
  loadedQuantity: z.number().int().min(0),
});

export const UpdateLoadingItemResponseSchema = z.object({
  item: LoadingChecklistItemSchema,
  overallProgress: LoadingChecklistOverallProgressSchema,
  loadingStatus: LoadingStatusSchema,
});

// Loading Issue Schemas (LS-06)
export const LoadingIssueTypeSchema = z.enum([
  'MISSING',
  'DAMAGED',
  'TEMPERATURE_VIOLATION',
  'INCORRECT_SKU',
]);

export const CreateLoadingIssueRequestSchema = z.object({
  itemId: z.string().min(1),
  type: LoadingIssueTypeSchema,
  quantity: z.number().int().min(1),
  description: z.string().min(5).max(500),
  photoUrl: z.string().optional().nullable(),
  expectedQuantity: z.number().int().min(1).optional(),
  actualQuantity: z.number().int().min(0).optional(),
});

export const LoadingIssueResponseSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  orderItemId: z.string().nullable(),
  issueType: z.string(),
  description: z.string(),
  reportedAt: z.string(),
  resolved: z.boolean(),
  loadingStatus: LoadingStatusSchema,
});

export const LoadingIssueContextItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  outletName: z.string(),
  outletCode: z.string(),
  sku: z.string(),
  productName: z.string(),
  unit: z.string(),
  tempRequirement: TemperatureRequirementSchema,
  tempLabel: z.string(),
  expectedQuantity: z.number(),
  stagedQuantity: z.number(),
  shortageQuantity: z.number(),
  unitWeightKg: z.number(),
  totalWeightKg: z.number(),
});

export const LoadingIssueContextResponseSchema = z.object({
  tripId: z.string(),
  tripNumber: z.string(),
  tripSequenceNumber: z.number(),
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    modelName: z.string(),
    tempType: VehicleTemperatureTypeSchema,
  }),
  bay: z.string(),
  departureTime: z.string().nullable(),
  departureFormatted: z.string(),
  totalItemsCount: z.number(),
  itemIndex: z.number(),
  selectedItem: LoadingIssueContextItemSchema,
  availableItems: z.array(
    z.object({
      id: z.string(),
      productName: z.string(),
      sku: z.string(),
      orderNumber: z.string(),
      outletName: z.string(),
    })
  ),
});

// Loading Review & Ready for Dispatch Schemas (LS-07)
export const LoadingReviewStopSchema = z.object({
  stopSequence: z.number(),
  outletName: z.string(),
  outletCode: z.string(),
  chamberZone: z.string(),
  orderNumber: z.string(),
  requiredItems: z.number(),
  loadedItems: z.number(),
  hasDiscrepancy: z.boolean(),
  isLoaded: z.boolean(),
  statusBadge: z.string(),
});

export const LoadingReviewUnresolvedIssueSchema = z.object({
  id: z.string(),
  orderItemId: z.string().nullable(),
  productName: z.string(),
  orderNumber: z.string(),
  issueType: z.string(),
  description: z.string(),
  reportedAt: z.string(),
});

export const FinalLoadingChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  verified: z.boolean(),
  badge: z.string().optional(),
});
export const GateChecklistItemSchema = FinalLoadingChecklistItemSchema;

export const LoadingReviewResponseSchema = z.object({
  tripId: z.string(),
  tripNumber: z.string(),
  tripSequenceNumber: z.number(),
  vehicle: z.object({
    id: z.string(),
    registrationNumber: z.string(),
    modelName: z.string(),
    type: VehicleTypeSchema,
    tempType: VehicleTemperatureTypeSchema,
    maxWeightKg: z.number(),
    maxVolumeM3: z.number(),
  }),
  driver: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
  }).nullable(),
  bay: z.string(),
  plannedDepartureTime: z.string().nullable(),
  departureFormatted: z.string(),
  departureCountdown: z.string(),
  progress: z.object({
    totalItems: z.number(),
    loadedItems: z.number(),
    percentage: z.number(),
    isComplete: z.boolean(),
  }),
  capacities: z.object({
    usedWeightKg: z.number(),
    maxWeightKg: z.number(),
    weightMarginKg: z.number(),
    weightPercentage: z.number(),
    isWeightCompliant: z.boolean(),
    usedVolumeM3: z.number(),
    maxVolumeM3: z.number(),
    freeVolumeM3: z.number(),
    volumePercentage: z.number(),
    isVolumeCompliant: z.boolean(),
  }),
  temperatureProfile: z.object({
    isReefer: z.boolean(),
    chamber1Temp: z.string(),
    chamber2Temp: z.string().optional(),
    statusLabel: z.string(),

  }),
  stops: z.array(LoadingReviewStopSchema),
  unresolvedIssueCount: z.number(),
  unresolvedIssues: z.array(LoadingReviewUnresolvedIssueSchema),
  finalChecklist: z.array(FinalLoadingChecklistItemSchema),

  checklistComplete: z.boolean(),
  canDispatch: z.boolean(),
  loadingStatus: LoadingStatusSchema,
  tripStatus: TripStatusSchema,
});

export const ConfirmReadyForDispatchResponseSchema = z.object({
  tripId: z.string(),
  loadingStatus: LoadingStatusSchema,
  tripStatus: TripStatusSchema,
  completedAt: z.string(),


});
