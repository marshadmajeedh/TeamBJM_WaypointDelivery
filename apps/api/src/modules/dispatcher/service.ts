import { Prisma, TemperatureRequirement } from '@prisma/client';
import { prisma } from '../../db';
import { allocationEngineService } from '../allocation/service';
import { ManualAssignment, PlanningOrder, PlanningVehicle } from '../allocation/types';

const tempRank: Record<TemperatureRequirement, number> = { AMBIENT:0, CHILLED:1, FROZEN:2 };
const atTime = (day: Date, value: string | null, fallback: number) => { const result=new Date(day); const [h,m]=(value||`${fallback}:00`).split(':').map(Number); result.setHours(h,m||0,0,0); return result; };
const range = (date: Date) => { const start=new Date(date); start.setHours(0,0,0,0); const end=new Date(start); end.setDate(end.getDate()+1); return {start,end}; };
const orderInclude = { outlet:true, items:true } satisfies Prisma.OrderInclude;
type FullOrder = Prisma.OrderGetPayload<{include:typeof orderInclude}>;

function mapOrder(order: FullOrder): PlanningOrder & {status:string;address:string;deferralReason:string|null;deferralCount:number} {
  const temperature=order.items.reduce<TemperatureRequirement>((best,item)=>tempRank[item.tempRequirement]>tempRank[best]?item.tempRequirement:best,'AMBIENT');
  return { id:order.id,reference:order.orderNumber,outletName:order.outlet.name,depot:order.outlet.depotId||'UNASSIGNED',address:order.outlet.address,windowStart:atTime(order.requestedDeliveryDate,order.outlet.deliveryWindowStart,8),windowEnd:atTime(order.requestedDeliveryDate,order.outlet.deliveryWindowEnd,17),weightKg:order.totalWeightKg,volumeM3:order.totalVolumeM3,temperature,vanOnly:order.outlet.vanOnly,priority:order.deferralCount,status:order.status,deferralReason:order.deferralReason,deferralCount:order.deferralCount };
}

export const dispatcherService = {
  async dashboard() { const [confirmed,planned,deferred,activeTrips,availableVehicles]=await Promise.all([prisma.order.count({where:{status:'CONFIRMED'}}),prisma.order.count({where:{status:'PLANNED'}}),prisma.order.count({where:{status:'DEFERRED'}}),prisma.trip.count({where:{status:{in:['LOADING','READY_FOR_DISPATCH','IN_TRANSIT']}}}),prisma.vehicle.count({where:{isActive:true}})]); return {confirmed,planned,deferred,activeTrips,availableVehicles}; },
  async orders(status:'CONFIRMED'|'DEFERRED'='CONFIRMED') { return (await prisma.order.findMany({where:{status},include:orderInclude,orderBy:[{requestedDeliveryDate:'asc'},{createdAt:'asc'}]})).map(mapOrder); },
  async order(id:string) { const row=await prisma.order.findUnique({where:{id},include:orderInclude}); return row?mapOrder(row):null; },
  async vehicles(date=new Date()):Promise<PlanningVehicle[]> { const {start,end}=range(date); const [vehicles,counts]=await Promise.all([prisma.vehicle.findMany(),prisma.trip.groupBy({by:['vehicleId'],where:{tripDate:{gte:start,lt:end}},_count:true})]); const count=new Map(counts.map(x=>[x.vehicleId,x._count])); return vehicles.map(v=>({id:v.id,registration:v.registrationNumber,depot:v.depotId||'UNASSIGNED',type:v.type,maxWeightKg:v.maxWeightKg,maxVolumeM3:v.maxVolumeM3,refrigerated:v.tempType==='REEFER',weeklyFuelQuotaL:v.weeklyFuelQuotaLiters,fuelUsedThisWeekL:v.currentFuelUsedLiters,estimatedFuelPerTripL:v.type==='VAN'?25:55,available:v.isActive,tripsToday:count.get(v.id)||0})); },
  async vehicle(id:string) {
    const v=await prisma.vehicle.findUnique({where:{id},include:{trips:{include:{driver:true,tripOrders:{include:{order:{include:{outlet:true}}},orderBy:{sequenceNumber:'asc'}}},orderBy:{tripDate:'desc'},take:5}}});
    if(!v)return null;
    const trip=v.trips.find(t=>!['COMPLETED','CANCELLED'].includes(t.status));
    const usedWeightKg=trip?.tripOrders.reduce((sum,x)=>sum+x.order.totalWeightKg,0)||0,usedVolumeM3=trip?.tripOrders.reduce((sum,x)=>sum+x.order.totalVolumeM3,0)||0;
    return {...v,registration:v.registrationNumber,refrigerated:v.tempType==='REEFER',status:v.isActive?'AVAILABLE':'MAINTENANCE',usedWeightKg,usedVolumeM3,assignedStops:trip?.tripOrders.map(x=>({sequence:x.sequenceNumber,order:x.order.orderNumber,outlet:x.order.outlet.name}))||[],route:trip?{reference:trip.tripNumber,status:trip.status,driver:trip.driver?.name||'Not assigned',date:trip.tripDate}:null};
  },
  async preview(orderIds:string[],date:Date) { const rows=await prisma.order.findMany({where:{id:{in:orderIds},status:'CONFIRMED'},include:orderInclude}); const orders=rows.map(mapOrder); const vehicles=await this.vehicles(date); return {serviceDate:date,orders,vehicles,results:allocationEngineService.evaluateOrders(orders,vehicles)}; },
  async validateManual(assignments:ManualAssignment[],date:Date) { const rows=await prisma.order.findMany({where:{id:{in:assignments.map(x=>x.orderId)},status:'CONFIRMED'},include:orderInclude}); const orders=rows.map(mapOrder); const vehicles=await this.vehicles(date); return {serviceDate:date,orders,vehicles,results:allocationEngineService.validateManualAssignments(orders,vehicles,assignments)}; },
  async trips() { const trips=await prisma.trip.findMany({include:{vehicle:true,driver:true,deliveries:true,tripOrders:{include:{order:{include:{outlet:true}}},orderBy:{sequenceNumber:'asc'}}},orderBy:{createdAt:'desc'}}); return trips.map(t=>({id:t.id,reference:t.tripNumber,tripNumber:t.tripSequenceNumber,status:t.status,driver:t.driver?.name||'Not assigned',coldChain:t.vehicle.tempType==='REEFER'?'No sensor reading recorded':'Not required',issues:[],vehicle:{registration:t.vehicle.registrationNumber,refrigerated:t.vehicle.tempType==='REEFER'},stops:t.tripOrders.map(x=>{const delivery=t.deliveries.find(d=>d.orderId===x.orderId);return {id:x.id,sequence:x.sequenceNumber,eta:atTime(t.tripDate,x.order.outlet.deliveryWindowStart,8),status:delivery?.completedAt?(delivery.outcome||'DELIVERED'):x.order.status,order:{reference:x.order.orderNumber,outletName:x.order.outlet.name}}})})); }
};
