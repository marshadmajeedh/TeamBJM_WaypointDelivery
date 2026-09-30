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
