import {describe,expect,it} from 'vitest';
import {addSuggestions} from '../src/modules/dispatcher/service';
import {PlanningOrder,PlanningVehicle} from '../src/modules/allocation/types';

const order=(patch:Partial<PlanningOrder>={}):PlanningOrder=>({id:'o1',reference:'ORD-1',outletName:'Outlet',depot:'Peliyagoda',windowStart:new Date('2026-10-01T08:00:00Z'),windowEnd:new Date('2026-10-01T12:00:00Z'),weightKg:900,volumeM3:2,temperature:'AMBIENT',vanOnly:false,priority:1,...patch});
const vehicle=(patch:Partial<PlanningVehicle>={}):PlanningVehicle=>({id:'v1',registration:'VEH014',depot:'Peliyagoda',type:'VAN',maxWeightKg:1000,maxVolumeM3:10,refrigerated:false,weeklyFuelQuotaL:200,fuelUsedThisWeekL:20,estimatedFuelPerTripL:20,available:true,tripsToday:0,...patch});

describe('Dispatcher conflict suggestions',()=>{
  it('recommends another trip with remaining compatible capacity',()=>{const results=addSuggestions([order(),order({id:'o2',reference:'ORD-2',weightKg:200})],[vehicle()],[{orderId:'o1',status:'SERVED',assignedVehicleId:'v1',tripSequence:1},{orderId:'o2',status:'DEFERRED',deferralReason:'No valid capacity'}]);expect(results[1]).toMatchObject({suggestedVehicleId:'v1',suggestedTripSequence:2,suggestion:'Move ORD-2 to VEH014 · Trip 2'})});
  it('provides rescheduling guidance when no compatible vehicle exists',()=>{const results=addSuggestions([order({temperature:'CHILLED'})],[vehicle()],[{orderId:'o1',status:'DEFERRED',deferralReason:'Refrigerated vehicle required'}]);expect(results[0].suggestion).toMatch(/refrigerated vehicle slot/)});
});
