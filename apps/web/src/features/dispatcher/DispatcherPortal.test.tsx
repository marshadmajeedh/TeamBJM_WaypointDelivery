import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {DispatcherPortal} from './DispatcherPortal';
import {dispatcherApi} from './api';

vi.mock('./api',()=>({dispatcherApi:vi.fn()}));
const mocked=vi.mocked(dispatcherApi);

describe('DispatcherPortal',()=>{
  beforeEach(()=>{mocked.mockImplementation(async(path:string)=>{
    if(path==='/dashboard')return {confirmed:8,planned:2,deferred:1,activeTrips:3,availableVehicles:6} as never;
    if(path.startsWith('/orders'))return [] as never;
    if(path==='/vehicles')return [] as never;
    if(path==='/trips')return [] as never;
    return {} as never;
  })});
  it('renders live dashboard metrics from the Dispatcher API',async()=>{render(<DispatcherPortal/>);await waitFor(()=>expect(screen.getByText('8')).toBeDefined());expect(screen.getAllByText('Confirmed Orders').length).toBeGreaterThan(0);});
  it('navigates to the confirmed-order queue',async()=>{render(<DispatcherPortal/>);fireEvent.click(screen.getByRole('button',{name:'Confirmed Orders'}));await waitFor(()=>expect(screen.getByText('Confirmed Orders Queue')).toBeDefined());expect(mocked).toHaveBeenCalledWith('/orders');});
  it('filters confirmed orders and resets the planning filters',async()=>{
    mocked.mockImplementation(async(path:string)=>{
      if(path==='/dashboard')return {confirmed:2,planned:0,deferred:0,activeTrips:0,availableVehicles:2} as never;
      if(path==='/orders')return [
        {id:'1',reference:'ORD-CHILL',outletName:'Cold Shop',depot:'Peliyagoda',address:'A',windowStart:'2026-10-02T08:00:00Z',windowEnd:'2026-10-02T10:00:00Z',weightKg:100,volumeM3:1,temperature:'CHILLED',vanOnly:true,priority:2,status:'CONFIRMED',deferralCount:1},
        {id:'2',reference:'ORD-AMBIENT',outletName:'City Shop',depot:'Colombo',address:'B',windowStart:'2026-10-03T08:00:00Z',windowEnd:'2026-10-03T10:00:00Z',weightKg:200,volumeM3:2,temperature:'AMBIENT',vanOnly:false,priority:0,status:'CONFIRMED',deferralCount:0}
      ] as never;
      return [] as never;
    });
    render(<DispatcherPortal/>);
    fireEvent.click(screen.getByRole('button',{name:'Confirmed Orders'}));
    await waitFor(()=>expect(screen.getByText('ORD-CHILL')).toBeDefined());
    fireEvent.change(screen.getByLabelText('Filter by temperature'),{target:{value:'CHILLED'}});
    fireEvent.change(screen.getByLabelText('Filter by access'),{target:{value:'VAN_ONLY'}});
    fireEvent.change(screen.getByLabelText('Filter by previous deferral'),{target:{value:'YES'}});
    expect(screen.getByText('Showing 1 of 2')).toBeDefined();
    expect(screen.queryByText('ORD-AMBIENT')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
    expect(screen.getByText('Showing 2 of 2')).toBeDefined();
    expect(screen.getByText('ORD-AMBIENT')).toBeDefined();
  });
  it('revalidates a manual vehicle assignment before publishing',async()=>{
    const planningOrder={id:'o1',reference:'ORD-1042',outletName:'Cold Shop',depot:'Peliyagoda',address:'A',windowStart:'2026-10-02T08:00:00Z',windowEnd:'2026-10-02T10:00:00Z',weightKg:100,volumeM3:1,temperature:'CHILLED',vanOnly:false,priority:1,status:'CONFIRMED',deferralCount:0};
    const vehicles=[
      {id:'v1',registration:'VEH014',depot:'Peliyagoda',type:'VAN',maxWeightKg:1000,maxVolumeM3:10,refrigerated:true,weeklyFuelQuotaL:200,fuelUsedThisWeekL:20,available:true,tripsToday:0},
      {id:'v2',registration:'VEH015',depot:'Peliyagoda',type:'TRUCK',maxWeightKg:2000,maxVolumeM3:20,refrigerated:true,weeklyFuelQuotaL:300,fuelUsedThisWeekL:20,available:true,tripsToday:0}
    ];
    mocked.mockImplementation(async(path:string)=>{
      if(path==='/dashboard')return {confirmed:1,planned:0,deferred:0,activeTrips:0,availableVehicles:2} as never;
      if(path==='/orders')return [planningOrder] as never;
      if(path==='/plans/preview')return {results:[{orderId:'o1',status:'SERVED',assignedVehicleId:'v1',tripSequence:1}],vehicles} as never;
      if(path==='/plans/validate-manual')return {results:[{orderId:'o1',status:'SERVED',assignedVehicleId:'v2',tripSequence:1}],vehicles} as never;
      return [] as never;
    });
    render(<DispatcherPortal/>);
    fireEvent.click(screen.getByRole('button',{name:'Daily Planning'}));
    await waitFor(()=>expect(screen.getByText('ORD-1042')).toBeDefined());
    fireEvent.click(screen.getByRole('button',{name:'Validate & Review 1'}));
    await waitFor(()=>expect(screen.getByText('Allocation Review')).toBeDefined());
    fireEvent.change(screen.getByLabelText('Vehicle for ORD-1042'),{target:{value:'v2'}});
    await waitFor(()=>expect(mocked).toHaveBeenCalledWith('/plans/validate-manual',expect.objectContaining({method:'POST'})));
    expect(await screen.findByText(/VEH015 · Trip 1/)).toBeDefined();
  });
  it('provides every required dispatcher navigation area',async()=>{render(<DispatcherPortal/>);await waitFor(()=>expect(screen.getByText('8')).toBeDefined());['Dashboard','Confirmed Orders','Daily Planning','Fleet & Vehicles','Active Deliveries','Deferred Orders'].forEach(label=>expect(screen.getByRole('button',{name:label})).toBeDefined());});
});
