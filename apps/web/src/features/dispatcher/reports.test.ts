import {beforeEach,describe,expect,it,vi} from 'vitest';
import {exportDailyPlanCsv,exportDailyPlanPdf} from './reports';
import {DispatchOrder,DispatchTrip} from './types';

const trip:DispatchTrip={id:'t1',reference:'TRIP-014',tripNumber:1,status:'IN_TRANSIT',driver:'Driver One',coldChain:'Normal',issues:[],totalWeightKg:500,totalVolumeM3:4,maxWeightKg:1000,maxVolumeM3:10,vehicle:{registration:'VEH014',refrigerated:true},stops:[{id:'s1',sequence:1,eta:'2026-10-02T08:00:00Z',status:'DELIVERED',order:{reference:'ORD-1',outletName:'Outlet One'}}]};
const deferred={id:'o2',reference:'ORD-2',outletName:'Outlet Two',depot:'Peliyagoda',address:'A',windowStart:'2026-10-02T08:00:00Z',windowEnd:'2026-10-02T10:00:00Z',weightKg:100,volumeM3:1,temperature:'AMBIENT',vanOnly:false,priority:1,status:'DEFERRED',deferralReason:'Capacity unavailable',deferralCount:1} as DispatchOrder;

describe('dispatcher daily-plan reports',()=>{
  const createObjectURL=vi.fn((_blob:Blob)=> 'blob:report'),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  beforeEach(()=>{createObjectURL.mockClear();click.mockClear();Object.defineProperty(URL,'createObjectURL',{configurable:true,value:createObjectURL});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()})});
  it('downloads a CSV manifest with served and deferred records',()=>{exportDailyPlanCsv([trip],[deferred]);expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);expect((createObjectURL.mock.calls[0][0] as Blob).type).toContain('text/csv');expect(click).toHaveBeenCalledOnce()});
  it('downloads a genuine PDF report',()=>{exportDailyPlanPdf([trip],[deferred]);expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/pdf');expect(click).toHaveBeenCalledOnce()});
});
