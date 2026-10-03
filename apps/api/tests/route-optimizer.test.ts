import {describe,expect,it} from 'vitest';
import {optimizeRoutes} from '../src/modules/allocation/routeOptimizer';
import {PlanningOrder} from '../src/modules/allocation/types';

const order=(id:string,patch:Partial<PlanningOrder>={}):PlanningOrder=>({id,reference:`ORD-${id}`,outletName:`Outlet ${id}`,depot:'Peliyagoda',windowStart:new Date('2026-10-01T08:00:00Z'),windowEnd:new Date('2026-10-01T12:00:00Z'),weightKg:100,volumeM3:1,temperature:'AMBIENT',vanOnly:false,priority:0,...patch});
const served=(orderId:string)=>({orderId,status:'SERVED' as const,assignedVehicleId:'v1',tripSequence:1});

describe('nearest-neighbour route optimizer',()=>{
  it('recommends the nearest geographic stop first and calculates distance',()=>{const routes=optimizeRoutes([order('near',{latitude:6.961,longitude:79.879}),order('far',{latitude:7.20,longitude:80.10})],[served('near'),served('far')]);expect(routes[0].stops.map(stop=>stop.orderId)).toEqual(['near','far']);expect(routes[0].estimatedDistanceKm).toBeGreaterThan(0)});
  it('falls back to earliest delivery window when coordinates are unavailable',()=>{const routes=optimizeRoutes([order('late',{windowEnd:new Date('2026-10-01T16:00:00Z')}),order('early',{windowEnd:new Date('2026-10-01T10:00:00Z')})],[served('late'),served('early')]);expect(routes[0].stops.map(stop=>stop.orderId)).toEqual(['early','late'])});
});
