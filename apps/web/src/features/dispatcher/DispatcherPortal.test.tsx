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
  it('provides every required dispatcher navigation area',async()=>{render(<DispatcherPortal/>);await waitFor(()=>expect(screen.getByText('8')).toBeDefined());['Dashboard','Confirmed Orders','Daily Planning','Fleet & Vehicles','Active Deliveries','Deferred Orders'].forEach(label=>expect(screen.getByRole('button',{name:label})).toBeDefined());});
});
