import { AllocationCheckResult, ManualAssignment, PlanningOrder, PlanningVehicle } from './types';

type CapacityBucket = PlanningVehicle & { trip: number; usedWeight: number; usedVolume: number; lastWindowEnd?: Date };

export class AllocationEngineService {
  evaluateOrders(orders: PlanningOrder[], vehicles: PlanningVehicle[]): AllocationCheckResult[] {
    const buckets: CapacityBucket[] = vehicles.flatMap((vehicle) => !vehicle.available ? [] : Array.from(
      { length: Math.max(0, 2 - vehicle.tripsToday) },
      (_, index) => ({ ...vehicle, trip: vehicle.tripsToday + index + 1, usedWeight: 0, usedVolume: 0 })
    ));
    return [...orders].sort((a, b) => b.priority - a.priority || a.windowEnd.getTime() - b.windowEnd.getTime() || a.reference.localeCompare(b.reference)).map((order) => this.allocateOrder(order, vehicles, buckets));
  }

  validateManualAssignments(orders: PlanningOrder[], vehicles: PlanningVehicle[], assignments: ManualAssignment[]): AllocationCheckResult[] {
    const orderMap=new Map(orders.map(order=>[order.id,order]));
    const vehicleMap=new Map(vehicles.map(vehicle=>[vehicle.id,vehicle]));
    const usage=new Map<string,{weight:number;volume:number}>();
    return assignments.map(assignment=>{
      const order=orderMap.get(assignment.orderId),vehicle=vehicleMap.get(assignment.vehicleId);
      const invalid=(reason:string):AllocationCheckResult=>({orderId:assignment.orderId,status:'DEFERRED',assignedVehicleId:assignment.vehicleId,tripSequence:assignment.tripSequence,deferralReason:reason});
      if(!order)return invalid('Order is unavailable for planning');
      if(!vehicle||!vehicle.available)return invalid('Selected vehicle is unavailable');
      if(vehicle.depot!==order.depot)return invalid('Selected vehicle is at a different depot');
      if(!Number.isInteger(assignment.tripSequence)||assignment.tripSequence<=vehicle.tripsToday||assignment.tripSequence>2)return invalid('Maximum two trips per vehicle reached');
      if(order.temperature!=='AMBIENT'&&!vehicle.refrigerated)return invalid('Refrigerated vehicle required');
      if(order.vanOnly&&vehicle.type!=='VAN')return invalid('Outlet has van-only access');
      if(vehicle.fuelUsedThisWeekL+vehicle.estimatedFuelPerTripL>vehicle.weeklyFuelQuotaL)return invalid('Weekly fuel quota exceeded');
      const key=`${vehicle.id}:${assignment.tripSequence}`,used=usage.get(key)||{weight:0,volume:0};
      if(used.weight+order.weightKg>vehicle.maxWeightKg)return invalid('Trip exceeds vehicle weight capacity');
      if(used.volume+order.volumeM3>vehicle.maxVolumeM3)return invalid('Trip exceeds vehicle volume capacity');
      usage.set(key,{weight:used.weight+order.weightKg,volume:used.volume+order.volumeM3});
      return {orderId:order.id,status:'SERVED',assignedVehicleId:vehicle.id,tripSequence:assignment.tripSequence};
    });
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
