import { Prisma, TemperatureRequirement } from '@prisma/client';
import { prisma } from '../../db';
import { allocationEngineService } from '../allocation/service';
import { AllocationCheckResult, ManualAssignment, PlanningOrder, PlanningVehicle } from '../allocation/types';
import { optimizeRoutes } from '../allocation/routeOptimizer';

const tempRank: Record<TemperatureRequirement, number> = { AMBIENT:0, CHILLED:1, FROZEN:2 };
const atTime = (day: Date, value: string | null, fallback: number) => { const result=new Date(day); const [h,m]=(value||`${fallback}:00`).split(':').map(Number); result.setHours(h,m||0,0,0); return result; };
const range = (date: Date) => { const start=new Date(date); start.setHours(0,0,0,0); const end=new Date(start); end.setDate(end.getDate()+1); return {start,end}; };
const orderInclude = { outlet:true, items:true, deferredVehicle:true } satisfies Prisma.OrderInclude;
type FullOrder = Prisma.OrderGetPayload<{include:typeof orderInclude}>;

function mapOrder(order: FullOrder) {
  const temperature=order.items.reduce<TemperatureRequirement>((best,item)=>tempRank[item.tempRequirement]>tempRank[best]?item.tempRequirement:best,'AMBIENT');
  return { id:order.id,reference:order.orderNumber,outletName:order.outlet.name,depot:order.outlet.depotId||'UNASSIGNED',address:order.outlet.address,windowStart:atTime(order.requestedDeliveryDate,order.outlet.deliveryWindowStart,8),windowEnd:atTime(order.requestedDeliveryDate,order.outlet.deliveryWindowEnd,17),weightKg:order.totalWeightKg,volumeM3:order.totalVolumeM3,temperature,vanOnly:order.outlet.vanOnly,priority:order.deferralCount,latitude:order.outlet.latitude,longitude:order.outlet.longitude,status:order.status,deferralReason:order.deferralReason,deferralCount:order.deferralCount,nextDeliveryDate:order.nextDeliveryDate,deferralTimeSlot:order.deferralTimeSlot,deferralPriority:order.deferralPriority,deferredVehicleId:order.deferredVehicleId,deferredVehicleRegistration:order.deferredVehicle?.registrationNumber||null,dispatcherNotes:order.dispatcherNotes };
}

export function addSuggestions(orders:PlanningOrder[],vehicles:PlanningVehicle[],results:AllocationCheckResult[]){
  const orderMap=new Map(orders.map(order=>[order.id,order])),usage=new Map<string,{weight:number;volume:number}>();
  results.filter(result=>result.status==='SERVED'&&result.assignedVehicleId&&result.tripSequence).forEach(result=>{const order=orderMap.get(result.orderId);if(!order)return;const key=`${result.assignedVehicleId}:${result.tripSequence}`,used=usage.get(key)||{weight:0,volume:0};usage.set(key,{weight:used.weight+order.weightKg,volume:used.volume+order.volumeM3})});
  return results.map(result=>{
    if(result.status==='SERVED')return result;
    const order=orderMap.get(result.orderId);if(!order)return {...result,suggestion:'Review order details and reschedule to the next delivery slot'};
    for(const vehicle of vehicles.filter(v=>v.available&&v.depot===order.depot&&(!order.vanOnly||v.type==='VAN')&&(order.temperature==='AMBIENT'||v.refrigerated)&&v.fuelUsedThisWeekL+v.estimatedFuelPerTripL<=v.weeklyFuelQuotaL)){
      for(let trip=vehicle.tripsToday+1;trip<=2;trip++){const used=usage.get(`${vehicle.id}:${trip}`)||{weight:0,volume:0};if(used.weight+order.weightKg<=vehicle.maxWeightKg&&used.volume+order.volumeM3<=vehicle.maxVolumeM3)return {...result,suggestion:`Move ${order.reference} to ${vehicle.registration} · Trip ${trip}`,suggestedVehicleId:vehicle.id,suggestedTripSequence:trip}}
    }
    const suggestion=order.temperature!=='AMBIENT'?'Reserve the next refrigerated vehicle slot and reschedule this order':order.vanOnly?'Reserve the next available van slot for this access-restricted outlet':result.deferralReason?.toLowerCase().includes('fuel')?'Use a vehicle below its weekly fuel threshold or reschedule the run':'Reschedule to the next delivery slot and increase its deferral priority';
    return {...result,suggestion};
  });
}

export const dispatcherService = {
  async dashboard() { const [confirmed,planned,deferred,activeTrips,availableVehicles]=await Promise.all([prisma.order.count({where:{status:'CONFIRMED'}}),prisma.order.count({where:{status:'PLANNED'}}),prisma.order.count({where:{status:'DEFERRED'}}),prisma.trip.count({where:{status:{in:['LOADING','READY_FOR_DISPATCH','IN_TRANSIT']}}}),prisma.vehicle.count({where:{isActive:true}})]); return {confirmed,planned,deferred,activeTrips,availableVehicles}; },
  async alerts(now=new Date()) {
    const horizon=new Date(now.getTime()+2*60*60*1000);
    const [openOrders,delayedTrips,issues,vehicles,repeatedDeferrals]=await Promise.all([
      prisma.order.findMany({where:{status:{in:['PLANNED','LOADING','IN_TRANSIT']}},include:{outlet:true}}),
      prisma.trip.findMany({where:{status:{in:['PLANNED','LOADING','READY_FOR_DISPATCH']},plannedDepartureTime:{lt:now},actualDepartureTime:null},include:{vehicle:true}}),
      prisma.loadingIssue.findMany({where:{resolved:false},include:{loadingRecord:{include:{trip:{include:{vehicle:true}}}}}}),
      prisma.vehicle.findMany({where:{isActive:true}}),
      prisma.order.findMany({where:{status:'DEFERRED',deferralCount:{gte:2}},select:{id:true,orderNumber:true,deferralCount:true}})
    ]);
    const alerts:Array<{id:string;type:string;severity:'HIGH'|'MEDIUM';title:string;message:string;entity:string}>=[];
    openOrders.forEach(order=>{const deadline=atTime(order.requestedDeliveryDate,order.outlet.deliveryWindowEnd,17);if(deadline>=now&&deadline<=horizon)alerts.push({id:`window-${order.id}`,type:'WINDOW_RISK',severity:'HIGH',title:'Delivery window at risk',message:`${order.orderNumber} · ${order.outlet.name} closes within two hours`,entity:order.orderNumber})});
    delayedTrips.forEach(trip=>alerts.push({id:`delay-${trip.id}`,type:'VEHICLE_DELAY',severity:'HIGH',title:'Vehicle departure delayed',message:`${trip.tripNumber} · ${trip.vehicle.registrationNumber} has not departed`,entity:trip.tripNumber}));
    issues.forEach(issue=>{const cold=/cold|temp|reefer|refriger/i.test(`${issue.issueType} ${issue.description}`);alerts.push({id:`issue-${issue.id}`,type:cold?'REFRIGERATION':'LOADING_ISSUE',severity:cold?'HIGH':'MEDIUM',title:cold?'Refrigeration issue':'Loading issue',message:`${issue.loadingRecord.trip.tripNumber} · ${issue.description}`,entity:issue.loadingRecord.trip.tripNumber})});
    vehicles.filter(vehicle=>vehicle.weeklyFuelQuotaLiters>0&&vehicle.currentFuelUsedLiters/vehicle.weeklyFuelQuotaLiters>=.8).forEach(vehicle=>alerts.push({id:`fuel-${vehicle.id}`,type:'FUEL_WARNING',severity:'MEDIUM',title:'Fuel quota warning',message:`${vehicle.registrationNumber} has used ${Math.round(vehicle.currentFuelUsedLiters/vehicle.weeklyFuelQuotaLiters*100)}% of its weekly quota`,entity:vehicle.registrationNumber}));
    repeatedDeferrals.forEach(order=>alerts.push({id:`deferral-${order.id}`,type:'REPEAT_DEFERRAL',severity:'HIGH',title:'Repeated deferral warning',message:`${order.orderNumber} has been deferred ${order.deferralCount} times`,entity:order.orderNumber}));
    return alerts.sort((a,b)=>a.severity===b.severity?0:a.severity==='HIGH'?-1:1);
  },
  async audit(userId:string,action:string,entityType:string,entityId:string|null,details:Prisma.InputJsonValue){return prisma.auditEvent.create({data:{userId,action,entityType,entityId,details}})},
  async audits(){return prisma.auditEvent.findMany({take:30,orderBy:{createdAt:'desc'},include:{user:{select:{name:true,email:true,role:true}}}})},
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
  async preview(orderIds:string[],date:Date) { const rows=await prisma.order.findMany({where:{id:{in:orderIds},status:'CONFIRMED'},include:orderInclude}); const orders=rows.map(mapOrder); const vehicles=await this.vehicles(date); const results=addSuggestions(orders,vehicles,allocationEngineService.evaluateOrders(orders,vehicles)); return {serviceDate:date,orders,vehicles,results,routes:optimizeRoutes(orders,results)}; },
  async validateManual(assignments:ManualAssignment[],date:Date) { const rows=await prisma.order.findMany({where:{id:{in:assignments.map(x=>x.orderId)},status:'CONFIRMED'},include:orderInclude}); const orders=rows.map(mapOrder); const vehicles=await this.vehicles(date); const results=addSuggestions(orders,vehicles,allocationEngineService.validateManualAssignments(orders,vehicles,assignments)); return {serviceDate:date,orders,vehicles,results,routes:optimizeRoutes(orders,results)}; },
  async trips() { const trips=await prisma.trip.findMany({include:{vehicle:true,driver:true,deliveries:true,tripOrders:{include:{order:{include:{outlet:true}}},orderBy:{sequenceNumber:'asc'}}},orderBy:{createdAt:'desc'}}); return trips.map(t=>({id:t.id,reference:t.tripNumber,tripNumber:t.tripSequenceNumber,status:t.status,driver:t.driver?.name||'Not assigned',coldChain:t.vehicle.tempType==='REEFER'?'No sensor reading recorded':'Not required',issues:[],totalWeightKg:t.totalWeightKg,totalVolumeM3:t.totalVolumeM3,maxWeightKg:t.vehicle.maxWeightKg,maxVolumeM3:t.vehicle.maxVolumeM3,vehicle:{registration:t.vehicle.registrationNumber,refrigerated:t.vehicle.tempType==='REEFER'},stops:t.tripOrders.map(x=>{const delivery=t.deliveries.find(d=>d.orderId===x.orderId);return {id:x.id,sequence:x.sequenceNumber,eta:atTime(t.tripDate,x.order.outlet.deliveryWindowStart,8),status:delivery?.completedAt?(delivery.outcome||'DELIVERED'):x.order.status,latitude:x.order.outlet.latitude,longitude:x.order.outlet.longitude,order:{reference:x.order.orderNumber,outletName:x.order.outlet.name}}})})); }
};
