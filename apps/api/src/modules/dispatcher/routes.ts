import { Router } from 'express';
import { UserRole } from '@waypoint/shared';
import { authenticate, authorizeRoles } from '../../middleware';
import { sendError, sendSuccess } from '../../shared/response';
import { dispatcherService } from './service';

export const dispatcherRouter = Router();
dispatcherRouter.use(authenticate, authorizeRoles(UserRole.DISPATCHER));

dispatcherRouter.get('/dashboard', async (_req,res) => sendSuccess(res,await dispatcherService.dashboard()));
dispatcherRouter.get('/orders', async (req,res) => sendSuccess(res,await dispatcherService.orders(req.query.status==='DEFERRED'?'DEFERRED':'CONFIRMED')));
dispatcherRouter.get('/orders/:id', async (req,res) => { const order=await dispatcherService.order(req.params.id); return order?sendSuccess(res,order):sendError(res,'NOT_FOUND','Order not found',404); });
dispatcherRouter.get('/vehicles', async (_req,res) => sendSuccess(res,await dispatcherService.vehicles()));
dispatcherRouter.get('/vehicles/:id', async (req,res) => { const vehicle=await dispatcherService.vehicle(req.params.id); return vehicle?sendSuccess(res,vehicle):sendError(res,'NOT_FOUND','Vehicle not found',404); });
dispatcherRouter.get('/trips', async (_req,res) => sendSuccess(res,await dispatcherService.trips()));
dispatcherRouter.post('/plans/preview', async (req,res) => { const {orderIds,serviceDate}=req.body; if(!Array.isArray(orderIds)||!orderIds.length)return sendError(res,'VALIDATION_ERROR','Select at least one confirmed order',400); return sendSuccess(res,await dispatcherService.preview(orderIds,new Date(serviceDate))); });
dispatcherRouter.patch('/deferred/:id', async (req,res) => { const reason=String(req.body.reason||'').trim(); if(!reason)return sendError(res,'VALIDATION_ERROR','Deferral reason is required',400); const order=await (await import('../../db')).prisma.order.update({where:{id:req.params.id},data:{status:'DEFERRED',deferralReason:reason}}); return sendSuccess(res,order); });
