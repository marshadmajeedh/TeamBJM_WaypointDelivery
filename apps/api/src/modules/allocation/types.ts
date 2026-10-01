import { TemperatureRequirement, VehicleType } from '@prisma/client';

export interface PlanningOrder {
  id: string;
  reference: string;
  outletName: string;
  depot: string;
  windowStart: Date;
  windowEnd: Date;
  weightKg: number;
  volumeM3: number;
  temperature: TemperatureRequirement;
  vanOnly: boolean;
  priority: number;
}

export interface PlanningVehicle {
  id: string;
  registration: string;
  depot: string;
  type: VehicleType;
  maxWeightKg: number;
  maxVolumeM3: number;
  refrigerated: boolean;
  weeklyFuelQuotaL: number;
  fuelUsedThisWeekL: number;
  estimatedFuelPerTripL: number;
  available: boolean;
  tripsToday: number;
}

export interface AllocationCheckResult {
  orderId: string;
  status: 'SERVED' | 'DEFERRED';
  assignedVehicleId?: string;
  tripSequence?: number;
  deferralReason?: string;
}

export interface ManualAssignment {
  orderId: string;
  vehicleId: string;
  tripSequence: number;
}
