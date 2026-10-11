import { Router } from 'express';
import { UserRole } from '@waypoint/shared';
import { authenticate, authorizeRoles } from '../../middleware';
import { sendError, sendSuccess } from '../../shared/response';
import { dispatcherService } from './service';
import { prisma } from '../../db';

export const dispatcherRouter = Router();
dispatcherRouter.use(authenticate, authorizeRoles(UserRole.DISPATCHER));

dispatcherRouter.get('/dashboard', async (_req,res) => sendSuccess(res,await dispatcherService.dashboard()));
dispatcherRouter.get('/alerts', async (_req,res) => sendSuccess(res,await dispatcherService.alerts()));
dispatcherRouter.get('/audits', async (_req,res) => sendSuccess(res,await dispatcherService.audits()));
dispatcherRouter.get('/orders', async (req,res) => sendSuccess(res,await dispatcherService.orders(req.query.status==='DEFERRED'?'DEFERRED':'CONFIRMED')));
dispatcherRouter.get('/orders/:id', async (req,res) => { const order=await dispatcherService.order(req.params.id); return order?sendSuccess(res,order):sendError(res,'NOT_FOUND','Order not found',404); });
dispatcherRouter.get('/vehicles', async (_req,res) => sendSuccess(res,await dispatcherService.vehicles()));
dispatcherRouter.get('/vehicles/:id', async (req,res) => { const vehicle=await dispatcherService.vehicle(req.params.id); return vehicle?sendSuccess(res,vehicle):sendError(res,'NOT_FOUND','Vehicle not found',404); });
dispatcherRouter.get('/trips', async (_req,res) => sendSuccess(res,await dispatcherService.trips()));
dispatcherRouter.post('/plans/preview', async (req,res) => { const {orderIds,serviceDate}=req.body; if(!Array.isArray(orderIds)||!orderIds.length)return sendError(res,'VALIDATION_ERROR','Select at least one confirmed order',400); const preview=await dispatcherService.preview(orderIds,new Date(serviceDate));await dispatcherService.audit(req.user!.id,'PLAN_PREVIEWED','DeliveryPlan',null,{orderCount:orderIds.length,served:preview.results.filter(x=>x.status==='SERVED').length,deferred:preview.results.filter(x=>x.status==='DEFERRED').length});return sendSuccess(res,preview); });
dispatcherRouter.post('/plans/validate-manual', async (req,res) => { const {assignments,serviceDate}=req.body; if(!Array.isArray(assignments)||!assignments.length)return sendError(res,'VALIDATION_ERROR','Manual assignments are required',400); const valid=assignments.every(x=>typeof x?.orderId==='string'&&typeof x?.vehicleId==='string'&&Number.isInteger(x?.tripSequence)); if(!valid)return sendError(res,'VALIDATION_ERROR','Each assignment requires an order, vehicle and trip sequence',400);const result=await dispatcherService.validateManual(assignments,new Date(serviceDate));await dispatcherService.audit(req.user!.id,'MANUAL_ALLOCATION_VALIDATED','DeliveryPlan',null,{assignmentCount:assignments.length,conflicts:result.results.filter(x=>x.status==='DEFERRED').length});return sendSuccess(res,result); });
dispatcherRouter.post('/plans/publish', async (req,res) => {
  const {serviceDate,results}=req.body as {serviceDate:string;results:Array<{orderId:string;status:string;assignedVehicleId?:string;tripSequence?:number;deferralReason?:string}>};
  if(!Array.isArray(results))return sendError(res,'VALIDATION_ERROR','Allocation results are required',400);
  const date=new Date(serviceDate);
  const created=await prisma.$transaction(async(tx)=>{
    const groups=new Map<string,typeof results>();
    results.filter(x=>x.status==='SERVED'&&x.assignedVehicleId).forEach(x=>{const key=`${x.assignedVehicleId}:${x.tripSequence}`;groups.set(key,[...(groups.get(key)||[]),x]);});
    let trips=0;
    for(const [key,items] of groups){const [vehicleId,sequence]=key.split(':');const vehicle=await tx.vehicle.findUniqueOrThrow({where:{id:vehicleId}});const loads=await tx.order.findMany({where:{id:{in:items.map(x=>x.orderId)}},select:{totalWeightKg:true,totalVolumeM3:true}});const totalWeightKg=loads.reduce((sum,x)=>sum+x.totalWeightKg,0),totalVolumeM3=loads.reduce((sum,x)=>sum+x.totalVolumeM3,0);const trip=await tx.trip.create({data:{tripNumber:`TRIP-${date.toISOString().slice(0,10).replaceAll('-','')}-${vehicle.registrationNumber}-${sequence}`,tripDate:date,tripSequenceNumber:Number(sequence),vehicleId,totalWeightKg,totalVolumeM3}});await tx.tripOrder.createMany({data:items.map((item,index)=>({tripId:trip.id,orderId:item.orderId,sequenceNumber:index+1}))});await tx.order.updateMany({where:{id:{in:items.map(x=>x.orderId)}},data:{status:'PLANNED'}});trips++;}
    for(const item of results.filter(x=>x.status==='DEFERRED'))await tx.order.update({where:{id:item.orderId},data:{status:'DEFERRED',deferralReason:item.deferralReason||'Capacity unavailable',deferralCount:{increment:1}}});
    await tx.auditEvent.create({data:{userId:req.user!.id,action:'PLAN_PUBLISHED',entityType:'DeliveryPlan',details:{tripCount:trips,servedOrders:results.filter(x=>x.status==='SERVED').length,deferredOrders:results.filter(x=>x.status==='DEFERRED').length}}});
    return trips;
  });
  return sendSuccess(res,{trips:created},201);
});
dispatcherRouter.patch('/deferred/:id', async (req,res) => {
  const reason=String(req.body.reason||'').trim(),timeSlot=String(req.body.timeSlot||'').trim(),notes=String(req.body.notes||'').trim();
  const nextDeliveryDate=new Date(req.body.nextDeliveryDate),priority=Number(req.body.priority),assignedVehicleId=String(req.body.assignedVehicleId||'').trim()||null;
  if(!reason)return sendError(res,'VALIDATION_ERROR','Deferral reason is required',400);
  if(Number.isNaN(nextDeliveryDate.getTime()))return sendError(res,'VALIDATION_ERROR','A valid next delivery date is required',400);
  if(!['MORNING','AFTERNOON','EVENING'].includes(timeSlot))return sendError(res,'VALIDATION_ERROR','Select a valid delivery time slot',400);
  if(!Number.isInteger(priority)||priority<1||priority>5)return sendError(res,'VALIDATION_ERROR','Priority must be between 1 and 5',400);
  if(assignedVehicleId&&!await prisma.vehicle.findUnique({where:{id:assignedVehicleId},select:{id:true}}))return sendError(res,'VALIDATION_ERROR','Selected vehicle does not exist',400);
  const updated=await prisma.order.update({where:{id:req.params.id},data:{status:'DEFERRED',deferralReason:reason,nextDeliveryDate,deferralTimeSlot:timeSlot,deferralPriority:priority,deferredVehicleId:assignedVehicleId,dispatcherNotes:notes||null},include:{deferredVehicle:true}});
  await dispatcherService.audit(req.user!.id,'DEFERRAL_RESCHEDULED','Order',req.params.id,{orderNumber:updated.orderNumber,nextDeliveryDate:nextDeliveryDate.toISOString(),timeSlot,priority,assignedVehicleId});
  return sendSuccess(res,updated);
});
