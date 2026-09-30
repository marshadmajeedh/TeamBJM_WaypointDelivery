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
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  depotId: z.string().uuid().nullable().optional(),
});
