import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeliveryOutcome, DriverStop, DriverTrip, TripStatus, UserRole } from '@waypoint/shared';
import { offlineDb } from '../../offline/db';
import { driverApi } from './services/driverApi';
import { submitDriverAction, syncDriverActions } from './services/offlineActions';
import { validateOutcome } from './services/validation';
import { DriverProvider, useDriver } from './DriverContext';
import { DriverTodayRoutePage } from './pages/DriverTodayRoutePage';
import { DriverStopListPage } from './pages/DriverStopListPage';
import { DriverIssueModal } from './components/DriverIssueModal';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { AppRoutes } from '../../routes';

const stop: DriverStop = {
  id: 'stop-1',
  orderId: 'order-1',
  orderNumber: 'ORD-1',
  sequenceNumber: 1,
  outlet: {
    name: 'Test Outlet',
    address: 'Test Street',
    deliveryWindowStart: '06:00',
    deliveryWindowEnd: '08:00',
  },
  items: [
    { id: 'milk', productName: 'Milk', quantity: 20, unitWeightKg: 1, tempRequirement: 'CHILLED' },
  ],
  weightKg: 20,
  outcome: null,
  arrivedAt: null,
  completedAt: null,
};
const trip: DriverTrip = {
  id: 'trip-1',
  tripNumber: 'TRIP-1',
  status: TripStatus.READY_FOR_DISPATCH,
  tripDate: new Date().toISOString(),
  vehicle: { registrationNumber: 'VEH-1', tempType: 'REEFER' },
  totalWeightKg: 20,
  plannedDepartureTime: null,
  actualDepartureTime: null,
  completedTime: null,
  stops: [stop],
};
const issue = {
  type: 'ISSUE' as const,
  tripId: trip.id,
  stopId: stop.id,
  orderId: stop.orderId,
  issueType: 'Access Blocked' as const,
  preventsDelivery: false,
};
function connection(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
}
function Ready() {
  return <span>{useDriver().trip ? 'Route ready' : 'Loading route'}</span>;
}
function mount(child: React.ReactNode) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DriverProvider>
          <Ready />
          {child}
        </DriverProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}
beforeEach(async () => {
  connection(false);
  sessionStorage.setItem('waypoint_token', 'test-token');
  sessionStorage.setItem(
    'waypoint_user',
    JSON.stringify({
      id: 'driver-1',
      name: 'Test Driver',
      email: 'driver@example.com',
      role: UserRole.DRIVER,
    })
  );
  await offlineDb.syncQueue.clear();
  await offlineDb.driverCache.clear();
  await offlineDb.driverCache.put({
    id: 'driver-1:trip',
    driverId: 'driver-1',
    value: trip,
    updatedAt: new Date().toISOString(),
  });
  vi.spyOn(driverApi, 'trip').mockResolvedValue(trip);
  vi.spyOn(driverApi, 'issues').mockResolvedValue([]);
  vi.spyOn(driverApi, 'sync').mockImplementation(async (actions) =>
    actions.map((a) => ({ clientSyncId: a.clientSyncId, success: true }))
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});
describe('driver outcomes', () => {
  it('requires one outcome and a reason for partial deliveries', () => {
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.PARTIAL,
        quantities: [{ itemId: 'milk', delivered: 18 }],
      })
    ).toContain('reason');
  });
  it('accepts full delivery with expected quantities', () => {
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.FULL,
        quantities: [{ itemId: 'milk', delivered: 20 }],
      })
    ).toBeNull();
  });
  it('accepts a partial delivery with a shortage', () => {
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.PARTIAL,
        quantities: [{ itemId: 'milk', delivered: 18 }],
        reason: 'Two damaged cartons',
      })
    ).toBeNull();
  });
  it('rejects partial delivery with no shortage and excessive quantities', () => {
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.PARTIAL,
        quantities: [{ itemId: 'milk', delivered: 20 }],
        reason: 'Shortage',
      })
    ).toContain('shortage');
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.FULL,
        quantities: [{ itemId: 'milk', delivered: 21 }],
      })
    ).toContain('exceed');
  });
  it('requires a valid unable-to-deliver reason', () => {
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.FAILED,
        quantities: [{ itemId: 'milk', delivered: 0 }],
      })
    ).toContain('reason');
    expect(
      validateOutcome(stop, {
        outcome: DeliveryOutcome.FAILED,
        quantities: [{ itemId: 'milk', delivered: 0 }],
        reason: 'Store Closed',
      })
    ).toBeNull();
  });
});
describe('driver offline queue', () => {
  it('queues offline issues in the existing Dexie queue with context and idempotency key', async () => {
    expect(await submitDriverAction('driver-1', issue)).toBe('queued');
    const rows = await offlineDb.syncQueue.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entityType: 'DRIVER_ACTION',
      status: 'PENDING',
      payload: issue,
    });
    expect(rows[0].clientSyncId).toMatch(/^[\da-f-]{36}$/);
    expect(driverApi.sync).not.toHaveBeenCalled();
  });
  it('marks server-confirmed actions synced and retains local records', async () => {
    await submitDriverAction('driver-1', issue);
    connection(true);
    await syncDriverActions('driver-1');
    expect((await offlineDb.syncQueue.toArray())[0].status).toBe('SYNCED');
    expect(driverApi.sync).toHaveBeenCalledTimes(1);
  });
  it('retains failed actions and retries with the same key', async () => {
    await submitDriverAction('driver-1', issue);
    connection(true);
    vi.mocked(driverApi.sync).mockImplementationOnce(async (actions) => [
      { clientSyncId: actions[0].clientSyncId, success: false, error: 'Try again' },
    ]);
    await syncDriverActions('driver-1');
    const row = (await offlineDb.syncQueue.toArray())[0];
    expect(row.status).toBe('FAILED');
    await syncDriverActions('driver-1');
    expect((await offlineDb.syncQueue.toArray())[0]).toMatchObject({
      clientSyncId: row.clientSyncId,
      status: 'SYNCED',
    });
  });
  it('does not send other drivers actions or process the same queue concurrently', async () => {
    await submitDriverAction('driver-1', issue);
    await submitDriverAction('other-driver', issue);
    connection(true);
    await Promise.all([syncDriverActions('driver-1'), syncDriverActions('driver-1')]);
    expect(driverApi.sync).toHaveBeenCalledTimes(1);
    expect(
      (await offlineDb.syncQueue.where('driverId').equals('other-driver').first())?.status
    ).toBe('PENDING');
  });
  it('reconnect triggers real synchronization', async () => {
    await submitDriverAction('driver-1', issue);
    mount(<DriverStopListPage />);
    await screen.findByText('Test Outlet');
    connection(true);
    fireEvent(window, new Event('online'));
    await waitFor(async () =>
      expect((await offlineDb.syncQueue.toArray())[0].status).toBe('SYNCED')
    );
  });
});
describe('driver pages and access', () => {
  it('connects departure, outcome and signed proof and retains the delivery offline', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      font: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,c2lnbmF0dXJl'
    );
    render(
      <MemoryRouter initialEntries={['/driver']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );
    const startButton = await screen.findByRole('button', { name: 'Start Route Wave' });
    await act(async () => {
      fireEvent.click(startButton);
    });
    fireEvent.click(await screen.findByRole('link', { name: 'View Stop Details' }));
    fireEvent.click(await screen.findByRole('link', { name: /Start Delivery \/ Record Outcome/ }));
    fireEvent.click(await screen.findByLabelText('Delivered in Full'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Continue to Proof of Delivery/ }));
    });
    fireEvent.change(await screen.findByLabelText('Receiver name'), {
      target: { value: 'Test Receiver' },
    });
    fireEvent.change(screen.getByLabelText('Typed signature (accessible alternative)'), {
      target: { value: 'Test Receiver' },
    });
    fireEvent.click(screen.getByLabelText('Recipient acknowledged the handover and quantities.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Complete Delivery/ }));
    });
    expect(await screen.findByRole('heading', { name: 'Trip Delivery Summary' })).toBeDefined();
    const actions = await offlineDb.syncQueue.toArray();
    expect(actions).toHaveLength(2);
    expect(actions[1].payload).toMatchObject({
      type: 'COMPLETE_DELIVERY',
      result: { outcome: 'FULL' },
      proof: { recipientName: 'Test Receiver', confirmed: true },
    });
    expect(actions[1].status).toBe('PENDING');
  });

  it('starts directly from the primary button and opens the route overview offline', async () => {
    render(
      <MemoryRouter initialEntries={['/driver']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );
    const start = await screen.findByRole('button', { name: 'Start Route Wave' });
    expect((start as HTMLButtonElement).disabled).toBe(false);

    expect((start as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(start);
    });
    await waitFor(async () => {
      const actions = await offlineDb.syncQueue.toArray();
      expect(actions).toHaveLength(1);
      expect(actions[0].payload).toEqual({ type: 'START_TRIP', tripId: trip.id });
      expect(actions[0].status).toBe('PENDING');
    });
  });

  it('renders today route with cached assigned trip', async () => {
    mount(<DriverTodayRoutePage />);
    expect(await screen.findByText('TRIP-1')).toBeDefined();
    expect(screen.getByText("Today's Route")).toBeDefined();
  });
  it('renders stops and working stop links', async () => {
    mount(<DriverStopListPage />);
    expect(await screen.findByText('Test Outlet')).toBeDefined();
    expect(screen.getByText('Open Stop Details →').getAttribute('href')).toBe(
      '/driver/stops/stop-1'
    );
  });
  it('submits a report with optional fields empty and closes the sheet', async () => {
    const close = vi.fn();
    const blocked = vi.fn();
    mount(<DriverIssueModal stop={stop} close={close} blocked={blocked} />);
    await screen.findByText('Route ready');
    await act(async () => {
      fireEvent.click(screen.getByText('Submit issue'));
    });
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(blocked).not.toHaveBeenCalled();
    await waitFor(async () => {
      const items = await offlineDb.syncQueue.toArray();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].payload).toMatchObject(issue);
    });
  });
  it('driver cannot render a different role portal', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ProtectedRoute allowedRoles={[UserRole.DISPATCHER]}>
            <p>Dispatcher secret</p>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText('Dispatcher secret')).toBeNull();
  });
  it('protects nested driver routes and lets drivers open Stop Details', async () => {
    render(
      <MemoryRouter initialEntries={['/driver/stops/stop-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('Stop Details')).toBeDefined();
    expect(
      await screen.findByText('Report Problem / Access Delay', { exact: false })
    ).toBeDefined();
    fireEvent.click(screen.getByText('Report Problem / Access Delay', { exact: false }));
    await act(async () => {
      fireEvent.click(screen.getByText('Submit issue'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Stop Details' })).toBeDefined();
    expect(screen.getByText('Saved on this device. Waiting to sync.')).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Issues' }));
    expect(await screen.findByText('Access Blocked')).toBeDefined();
  });
});
