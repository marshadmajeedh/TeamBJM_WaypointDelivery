import {AllocationCheckResult,PlanningOrder} from './types';

export interface OptimizedRoute {vehicleId:string;tripSequence:number;estimatedDistanceKm:number;stops:Array<{orderId:string;sequence:number;distanceFromPreviousKm:number}>}

const depotCoordinates:Record<string,[number,number]>={Peliyagoda:[6.9602,79.8780],'depot-peliyagoda':[6.9602,79.8780]};
const radians=(value:number)=>value*Math.PI/180;
const distanceKm=(a:[number,number],b:[number,number])=>{const earth=6371,dLat=radians(b[0]-a[0]),dLon=radians(b[1]-a[1]),value=Math.sin(dLat/2)**2+Math.cos(radians(a[0]))*Math.cos(radians(b[0]))*Math.sin(dLon/2)**2;return earth*2*Math.atan2(Math.sqrt(value),Math.sqrt(1-value))};

export function optimizeRoutes(orders:PlanningOrder[],results:AllocationCheckResult[]):OptimizedRoute[]{
  const orderMap=new Map(orders.map(order=>[order.id,order])),groups=new Map<string,{vehicleId:string;tripSequence:number;orders:PlanningOrder[]}>();
  results.filter(result=>result.status==='SERVED'&&result.assignedVehicleId&&result.tripSequence).forEach(result=>{const order=orderMap.get(result.orderId);if(!order)return;const key=`${result.assignedVehicleId}:${result.tripSequence}`,group=groups.get(key)||{vehicleId:result.assignedVehicleId!,tripSequence:result.tripSequence!,orders:[]};group.orders.push(order);groups.set(key,group)});
  return [...groups.values()].map(group=>{
    const remaining=[...group.orders],fallback=remaining.find(order=>order.latitude!=null&&order.longitude!=null);
    const fallbackPoint:[number,number]=fallback?[fallback.latitude!,fallback.longitude!]:[6.9602,79.8780];
    const start=depotCoordinates[remaining[0]?.depot]||depotCoordinates['depot-peliyagoda']||fallbackPoint;
    let current=start,total=0;const stops:OptimizedRoute['stops']=[];
    while(remaining.length){const earliest=Math.min(...remaining.map(order=>order.windowEnd.getTime()));remaining.sort((a,b)=>{const pointA=a.latitude!=null&&a.longitude!=null?[a.latitude,a.longitude] as [number,number]:null,pointB=b.latitude!=null&&b.longitude!=null?[b.latitude,b.longitude] as [number,number]:null;const scoreA=(pointA?distanceKm(current,pointA):1000)+(a.windowEnd.getTime()-earliest)/3600000*.3,scoreB=(pointB?distanceKm(current,pointB):1000)+(b.windowEnd.getTime()-earliest)/3600000*.3;return scoreA-scoreB||a.reference.localeCompare(b.reference)});const next=remaining.shift()!,point=next.latitude!=null&&next.longitude!=null?[next.latitude,next.longitude] as [number,number]:null,leg=point?distanceKm(current,point):0;total+=leg;stops.push({orderId:next.id,sequence:stops.length+1,distanceFromPreviousKm:Number(leg.toFixed(1))});if(point)current=point}
    return {vehicleId:group.vehicleId,tripSequence:group.tripSequence,estimatedDistanceKm:Number(total.toFixed(1)),stops};
  });
}
