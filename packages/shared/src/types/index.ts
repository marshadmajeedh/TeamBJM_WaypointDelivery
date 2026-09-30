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
import {
  ApiResponseErrorSchema,
  HealthCheckResponseSchema,
  LoginRequestSchema,
  AuthUserSchema,
  AuthenticatedUserSchema,
  LoginResponseDataSchema,
  TokenPayloadSchema,
} from '../schemas';

export type UserRoleType = `${UserRole}`;
export type OrderStatusType = `${OrderStatus}`;
export type VehicleTypeType = `${VehicleType}`;
export type VehicleTemperatureTypeType = `${VehicleTemperatureType}`;
export type TemperatureRequirementType = `${TemperatureRequirement}`;
export type TripStatusType = `${TripStatus}`;
export type LoadingStatusType = `${LoadingStatus}`;
export type DeliveryOutcomeType = `${DeliveryOutcome}`;
export type SyncStatusType = `${SyncStatus}`;

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponseError = z.infer<typeof ApiResponseErrorSchema>;
export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;
export type LoginResponse = ApiResponseSuccess<LoginResponseData>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export interface AuthSession {
  user: AuthenticatedUser;
  token: string;
}
