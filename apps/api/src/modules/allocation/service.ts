import { AllocationCheckResult, PlanningOrder, PlanningVehicle } from './types';

type CapacityBucket = PlanningVehicle & { trip: number; usedWeight: number; usedVolume: number; lastWindowEnd?: Date };

export class AllocationEngineService {
  evaluateOrders(orders: PlanningOrder[], vehicles: PlanningVehicle[]): AllocationCheckResult[] {
    const buckets: CapacityBucket[] = vehicles.flatMap((vehicle) => !vehicle.available ? [] : Array.from(
      { length: Math.max(0, 2 - vehicle.tripsToday) },
      (_, index) => ({ ...vehicle, trip: vehicle.tripsToday + index + 1, usedWeight: 0, usedVolume: 0 })
    ));
    return [...orders].sort((a, b) => b.priority - a.priority || a.windowEnd.getTime() - b.windowEnd.getTime() || a.reference.localeCompare(b.reference)).map((order) => this.allocateOrder(order, vehicles, buckets));
  }

  private allocateOrder(order: PlanningOrder, vehicles: PlanningVehicle[], buckets: CapacityBucket[]): AllocationCheckResult {
    const depotFleet = vehicles.filter((v) => v.available && v.depot === order.depot);
    if (!depotFleet.length) return this.deferred(order.id, 'No available vehicle at the required depot');
    if (order.temperature !== 'AMBIENT' && !depotFleet.some((v) => v.refrigerated)) return this.deferred(order.id, 'Refrigerated vehicle required');
    if (order.vanOnly && !depotFleet.some((v) => v.type === 'VAN')) return this.deferred(order.id, 'Outlet has van-only access');
    const eligible = buckets.filter((v) => v.depot === order.depot && (!order.vanOnly || v.type === 'VAN') && (order.temperature === 'AMBIENT' || v.refrigerated) && v.fuelUsedThisWeekL + v.estimatedFuelPerTripL <= v.weeklyFuelQuotaL && v.usedWeight + order.weightKg <= v.maxWeightKg && v.usedVolume + order.volumeM3 <= v.maxVolumeM3 && (!v.lastWindowEnd || v.lastWindowEnd <= order.windowEnd));
    if (!eligible.length) {
      if (!depotFleet.some((v) => v.fuelUsedThisWeekL + v.estimatedFuelPerTripL <= v.weeklyFuelQuotaL)) return this.deferred(order.id, 'Weekly fuel quota exceeded');
      if (!depotFleet.some((v) => v.maxWeightKg >= order.weightKg)) return this.deferred(order.id, 'Order exceeds vehicle weight capacity');
      if (!depotFleet.some((v) => v.maxVolumeM3 >= order.volumeM3)) return this.deferred(order.id, 'Order exceeds vehicle volume capacity');
      if (!buckets.some((v) => v.depot === order.depot)) return this.deferred(order.id, 'Maximum two trips per vehicle reached');
      return this.deferred(order.id, 'No valid capacity or delivery-window allocation available');
    }
    eligible.sort((a, b) => (a.maxWeightKg - a.usedWeight) - (b.maxWeightKg - b.usedWeight) || a.registration.localeCompare(b.registration));
    const chosen = eligible[0]; chosen.usedWeight += order.weightKg; chosen.usedVolume += order.volumeM3; chosen.lastWindowEnd = order.windowEnd;
    return { orderId: order.id, status: 'SERVED', assignedVehicleId: chosen.id, tripSequence: chosen.trip };
  }

  private deferred(orderId: string, deferralReason: string): AllocationCheckResult { return { orderId, status: 'DEFERRED', deferralReason }; }
}

export const allocationEngineService = new AllocationEngineService();
