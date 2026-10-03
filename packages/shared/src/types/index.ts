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
  LoadingTaskSummarySchema,
  LoadingTaskItemSchema,
  LoadingTasksResponseDataSchema,
  StopSequenceItemSchema,
  VehicleLoadingDetailsSchema,
  LoadingSequenceItemSchema,
  LoadingSequenceStopSchema,
  LoadingSequenceResponseSchema,
  LoadingChecklistItemSchema,
  LoadingChecklistStopSchema,
  LoadingChecklistOverallProgressSchema,
  LoadingChecklistResponseSchema,
  UpdateLoadingItemRequestSchema,
  UpdateLoadingItemResponseSchema,
  LoadingIssueTypeSchema,
  CreateLoadingIssueRequestSchema,
  LoadingIssueResponseSchema,
  LoadingIssueContextItemSchema,
  LoadingIssueContextResponseSchema,
  LoadingReviewStopSchema,
  LoadingReviewUnresolvedIssueSchema,
  FinalLoadingChecklistItemSchema,
  LoadingReviewResponseSchema,
  ConfirmReadyForDispatchResponseSchema,
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

// Loader feature types (LS-02 & LS-03)
export type LoadingTaskSummary = z.infer<typeof LoadingTaskSummarySchema>;
export type LoadingTaskItem = z.infer<typeof LoadingTaskItemSchema>;
export type LoadingTasksResponseData = z.infer<typeof LoadingTasksResponseDataSchema>;
export type StopSequenceItem = z.infer<typeof StopSequenceItemSchema>;
export type VehicleLoadingDetails = z.infer<typeof VehicleLoadingDetailsSchema>;

// Loader Feature 2 types (LS-04 & LS-05)
export type LoadingSequenceItem = z.infer<typeof LoadingSequenceItemSchema>;
export type LoadingSequenceStop = z.infer<typeof LoadingSequenceStopSchema>;
export type LoadingSequenceResponse = z.infer<typeof LoadingSequenceResponseSchema>;

export type LoadingChecklistItem = z.infer<typeof LoadingChecklistItemSchema>;
export type LoadingChecklistStop = z.infer<typeof LoadingChecklistStopSchema>;
export type LoadingChecklistOverallProgress = z.infer<typeof LoadingChecklistOverallProgressSchema>;
export type LoadingChecklistResponse = z.infer<typeof LoadingChecklistResponseSchema>;

export type UpdateLoadingItemRequest = z.infer<typeof UpdateLoadingItemRequestSchema>;
export type UpdateLoadingItemResponse = z.infer<typeof UpdateLoadingItemResponseSchema>;

// Loader Feature 3 types (LS-06)
export type LoadingIssueType = z.infer<typeof LoadingIssueTypeSchema>;
export type CreateLoadingIssueRequest = z.infer<typeof CreateLoadingIssueRequestSchema>;
export type LoadingIssueResponse = z.infer<typeof LoadingIssueResponseSchema>;
export type LoadingIssueContextItem = z.infer<typeof LoadingIssueContextItemSchema>;
export type LoadingIssueContextResponse = z.infer<typeof LoadingIssueContextResponseSchema>;

// Loader Feature 4 types (LS-07)
export type LoadingReviewStop = z.infer<typeof LoadingReviewStopSchema>;
export type LoadingReviewUnresolvedIssue = z.infer<typeof LoadingReviewUnresolvedIssueSchema>;
export type FinalLoadingChecklistItem = z.infer<typeof FinalLoadingChecklistItemSchema>;
export type GateChecklistItem = FinalLoadingChecklistItem;
export type LoadingReviewResponse = z.infer<typeof LoadingReviewResponseSchema>;
export type ConfirmReadyForDispatchResponse = z.infer<typeof ConfirmReadyForDispatchResponseSchema>;
