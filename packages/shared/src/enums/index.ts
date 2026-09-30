export enum UserRole {
  STORE_MANAGER = 'STORE_MANAGER',
  DISPATCHER = 'DISPATCHER',
  LOADER = 'LOADER',
  DRIVER = 'DRIVER',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PLANNED = 'PLANNED',
  DEFERRED = 'DEFERRED',
  LOADING = 'LOADING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum VehicleType {
  TRUCK = 'TRUCK',
  VAN = 'VAN',
}

export enum VehicleTemperatureType {
  REEFER = 'REEFER',
  AMBIENT = 'AMBIENT',
}

export enum TemperatureRequirement {
  CHILLED = 'CHILLED',
  FROZEN = 'FROZEN',
  AMBIENT = 'AMBIENT',
}

export enum TripStatus {
  PLANNED = 'PLANNED',
  LOADING = 'LOADING',
  READY_FOR_DISPATCH = 'READY_FOR_DISPATCH',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LoadingStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ISSUE_REPORTED = 'ISSUE_REPORTED',
  READY_FOR_DISPATCH = 'READY_FOR_DISPATCH',
}

export enum DeliveryOutcome {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}
