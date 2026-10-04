import { describe, expect, it } from 'vitest';
import { AllocationEngineService } from '../src/modules/allocation/service';
import { PlanningOrder, PlanningVehicle } from '../src/modules/allocation/types';

const order = (patch: Partial<PlanningOrder> = {}): PlanningOrder => ({ id:'o1', reference:'ORD-1', outletName:'Outlet', depot:'Peliyagoda', windowStart:new Date('2026-10-01T08:00:00Z'), windowEnd:new Date('2026-10-01T12:00:00Z'), weightKg:100, volumeM3:1, temperature:'AMBIENT', vanOnly:false, priority:1, ...patch });
const vehicle = (patch: Partial<PlanningVehicle> = {}): PlanningVehicle => ({ id:'v1', registration:'VEH014', depot:'Peliyagoda', type:'VAN', maxWeightKg:1000, maxVolumeM3:10, refrigerated:false, weeklyFuelQuotaL:200, fuelUsedThisWeekL:20, estimatedFuelPerTripL:20, available:true, tripsToday:0, ...patch });

describe('AllocationEngineService', () => {
  const service = new AllocationEngineService();
  it('serves a valid order deterministically', () => expect(service.evaluateOrders([order()], [vehicle()])[0]).toMatchObject({ status:'SERVED', assignedVehicleId:'v1', tripSequence:1 }));
  it('requires refrigeration for chilled goods', () => expect(service.evaluateOrders([order({temperature:'CHILLED'})], [vehicle()])[0].deferralReason).toMatch(/Refrigerated/));
  it('enforces van-only outlet access', () => expect(service.evaluateOrders([order({vanOnly:true})], [vehicle({type:'TRUCK'})])[0].deferralReason).toMatch(/van-only/));
  it('enforces weight capacity', () => expect(service.evaluateOrders([order({weightKg:2000})], [vehicle()])[0].deferralReason).toMatch(/weight/));
  it('enforces volume capacity', () => expect(service.evaluateOrders([order({volumeM3:20})], [vehicle()])[0].deferralReason).toMatch(/volume/));
  it('enforces weekly fuel quota', () => expect(service.evaluateOrders([order()], [vehicle({fuelUsedThisWeekL:190})])[0].deferralReason).toMatch(/fuel/));
  it('enforces the two-trip maximum', () => expect(service.evaluateOrders([order()], [vehicle({tripsToday:2})])[0].deferralReason).toMatch(/two trips/));
  it('validates a manual vehicle and trip assignment', () => expect(service.validateManualAssignments([order()], [vehicle()], [{orderId:'o1',vehicleId:'v1',tripSequence:2}])[0]).toMatchObject({status:'SERVED',assignedVehicleId:'v1',tripSequence:2}));
  it('rejects manual assignments that exceed combined trip capacity', () => {
    const results=service.validateManualAssignments([order(),order({id:'o2',weightKg:950})],[vehicle()],[{orderId:'o1',vehicleId:'v1',tripSequence:1},{orderId:'o2',vehicleId:'v1',tripSequence:1}]);
    expect(results[1].deferralReason).toMatch(/weight capacity/);
  });
  it('rejects a manual assignment to an incompatible vehicle', () => expect(service.validateManualAssignments([order({temperature:'CHILLED'})],[vehicle()],[{orderId:'o1',vehicleId:'v1',tripSequence:1}])[0].deferralReason).toMatch(/Refrigerated/));
});
