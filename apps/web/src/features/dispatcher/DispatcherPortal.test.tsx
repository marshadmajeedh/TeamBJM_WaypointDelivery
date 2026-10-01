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
  it('provides every required dispatcher navigation area',async()=>{render(<DispatcherPortal/>);await waitFor(()=>expect(screen.getByText('8')).toBeDefined());['Dashboard','Confirmed Orders','Daily Planning','Fleet & Vehicles','Active Deliveries','Deferred Orders'].forEach(label=>expect(screen.getByRole('button',{name:label})).toBeDefined());});
});
