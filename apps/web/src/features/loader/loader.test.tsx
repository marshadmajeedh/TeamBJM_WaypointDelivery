import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  UserRole,
  LoadingStatus,
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
} from '@waypoint/shared';
import * as api from '../../services/api';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { LoaderDashboard } from './LoaderDashboard';
import { VehicleLoadingDetails } from './VehicleLoadingDetails';
import type { LoadingTasksResponseData, VehicleLoadingDetails as VehicleLoadingDetailsType } from '@waypoint/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockTasksData: LoadingTasksResponseData = {
  summary: {
    vehiclesToLoad: 4,
    inProgress: 1,
    readyForDispatch: 1,
    discrepancies: 1,
    activeBaysCount: 4,
  },
  tasks: [
    {
      id: 'trip-001',
      tripNumber: 'TRIP-01',
      tripSequenceNumber: 1,
      bay: 'BAY 04',
      status: LoadingStatus.NOT_STARTED,
      vehicle: {
        id: 'veh-001',
        registrationNumber: 'WP-CAD-8821',
        type: VehicleType.TRUCK,
        tempType: VehicleTemperatureType.REEFER,
        modelName: 'Isuzu 4T Reefer',
      },
      plannedDepartureTime: '2026-09-29T05:45:00.000Z',
      departureFormatted: 'Departs 05:45 AM',
      departureCountdown: 'in 1h 30m',
      ordersCount: 3,
      stopsCount: 3,
      stopsSummary: 'Nugegoda, Maharagama, Kottawa',
      temperatureRequirement: 'Chilled +4°C / Frozen -18°C',
      targetTemperatureVerified: true,
      progress: {
        loadedItems: 0,
        totalItems: 27,
        percentage: 0,
        label: 'Pallet Staging Progress',
      },
      issue: null,
      driver: {
        name: 'Sunimal Silva',
        phone: '+94 77 482 1902',
      },
      sealNumber: null,
    },
    {
      id: 'trip-002',
      tripNumber: 'TRIP-02',
      tripSequenceNumber: 1,
      bay: 'BAY 02',
      status: LoadingStatus.IN_PROGRESS,
      vehicle: {
        id: 'veh-002',
        registrationNumber: 'WP-LF-6590',
        type: VehicleType.TRUCK,
        tempType: VehicleTemperatureType.AMBIENT,
        modelName: 'Mitsubishi 5T Dry Box',
      },
      plannedDepartureTime: '2026-09-29T06:15:00.000Z',
      departureFormatted: 'Departs 06:15 AM',
      departureCountdown: 'in 2h 00m',
      ordersCount: 4,
      stopsCount: 3,
      stopsSummary: 'Kiribathgoda, Kadawatha, Kelaniya',
      temperatureRequirement: 'Ambient Dry Cargo',
      targetTemperatureVerified: false,
      progress: {
        loadedItems: 18,
        totalItems: 20,
        percentage: 90,
        label: 'Barcode Manifest Progress',
      },
      issue: null,
      driver: null,
      sealNumber: null,
    },
    {
      id: 'trip-003',
      tripNumber: 'TRIP-03',
      tripSequenceNumber: 1,
      bay: 'BAY 06',
      status: LoadingStatus.ISSUE_REPORTED,
      vehicle: {
        id: 'veh-003',
        registrationNumber: 'WP-GA-3491',
        type: VehicleType.VAN,
        tempType: VehicleTemperatureType.AMBIENT,
        modelName: 'Hino 3T Van',
      },
      plannedDepartureTime: '2026-09-29T06:00:00.000Z',
      departureFormatted: 'Departs 06:00 AM',
      departureCountdown: 'in 1h 45m',
      ordersCount: 1,
      stopsCount: 1,
      stopsSummary: 'Kadawatha',
      temperatureRequirement: 'Ambient Dry Cargo',
      targetTemperatureVerified: false,
      progress: {
        loadedItems: 14,
        totalItems: 16,
        percentage: 88,
        label: 'Loaded Before Halt',
      },
      issue: {
        hasIssue: true,
        issueType: '1 DAMAGED BOX',
        description: 'Carton #C-881 crush damage: Waiting for Floor Coordinator replacement authorization.',
      },
      driver: null,
      sealNumber: null,
    },
    {
      id: 'trip-004',
      tripNumber: 'TRIP-04',
      tripSequenceNumber: 1,
      bay: 'BAY 01',
      status: LoadingStatus.READY_FOR_DISPATCH,
      vehicle: {
        id: 'veh-004',
        registrationNumber: 'WP-PX-1290',
        type: VehicleType.VAN,
        tempType: VehicleTemperatureType.AMBIENT,
        modelName: 'Toyota HiAce Van (WP-PX-1290)',
      },
      plannedDepartureTime: '2026-09-29T05:30:00.000Z',
      departureFormatted: 'Departs 05:30 AM',
      departureCountdown: 'in 1h 15m',
      ordersCount: 1,
      stopsCount: 1,
      stopsSummary: 'Kelaniya',
      temperatureRequirement: 'Ambient Dry Cargo',
      targetTemperatureVerified: false,
      progress: {
        loadedItems: 12,
        totalItems: 12,
        percentage: 100,
        label: 'Complete',
      },
      issue: null,
      driver: {
        name: 'N. Perera',
        phone: '+94 77 123 4567',
      },
      sealNumber: 'SL-9942',
    },
  ],
};

const mockTripDetails: VehicleLoadingDetailsType = {
  tripId: 'trip-001',
  tripNumber: 'TRIP-01',
  tripSequenceNumber: 1,
  plannedDepartureTime: '2026-09-29T05:45:00.000Z',
  departureFormatted: 'Departs 05:45 AM',
  departureCountdown: 'in 1h 30m',
  bay: 'BAY 04',
  preCoolTemp: '3.8°C',
  vehicle: {
    id: 'veh-001',
    registrationNumber: 'WP-CAD-8821',
    type: VehicleType.TRUCK,
    tempType: VehicleTemperatureType.REEFER,
    modelName: 'Isuzu Forward Reefer',
    maxWeightKg: 3000,
    maxVolumeM3: 18.0,
  },
  driver: {
    id: 'drv-001',
    name: 'Sunimal Silva',
    phone: '+94 77 482 1902',
    roleTitle: 'Senior Reefer Driver',
  },
  capacities: {
    usedWeightKg: 2480,
    weightCapacityKg: 3000,
    weightPercentage: 82.6,
    usedVolumeM3: 15.2,
    volumeCapacityM3: 18.0,
    volumePercentage: 84.4,
  },
  temperatureSpecs: {
    vehicleTempType: VehicleTemperatureType.REEFER,
    isReefer: true,
    chamberDescription: 'Dual Chill Chamber (Chilled 4°C / Frozen Bay -18°C)',
    chilledRequirement: 'Chilled (+4°C)',
    frozenRequirement: 'Frozen Bay: -18°C',
  },
  loadingStatus: {
    status: LoadingStatus.NOT_STARTED,
    loadedUnits: 0,
    totalUnits: 27,
    progressPercentage: 0,
    statusLabel: 'Awaiting Pallet Marshalling',
  },
  consignment: {
    outletCount: 3,
    totalLineUnits: 27,
    ordersCount: 3,
  },
  stops: [
    {
      stopSequence: 1,
      lifoStagingOrder: 3,
      lifoPositionLabel: 'Door Position',
      outlet: {
        id: 'out-1',
        code: '#104',
        name: 'Waypoint Fresh – Nugegoda',
        address: 'High Level Road, Nugegoda',
        deliveryWindow: '06:00 – 08:00 AM',
      },
      orderId: 'ord-1',
      orderNumber: 'ORD-1042',
      skuCount: 3,
      totalUnits: 10,
      weightKg: 540,
      volumeM3: 3.5,
      tempRequirements: [TemperatureRequirement.CHILLED],
      items: [
        {
          id: 'it-1',
          productName: 'Highland Fresh Full Cream Milk',
          quantity: 20,
          unitWeightKg: 12,
          unitVolumeM3: 0.1,
          tempRequirement: TemperatureRequirement.CHILLED,
        },
      ],
    },
    {
      stopSequence: 2,
      lifoStagingOrder: 2,
      lifoPositionLabel: 'Mid-Chamber',
      outlet: {
        id: 'out-2',
        code: '#106',
        name: 'Waypoint Fresh – Maharagama',
        address: 'Pamunuwa Junction, Maharagama',
        deliveryWindow: '06:30 – 08:00 AM',
      },
      orderId: 'ord-2',
      orderNumber: 'ORD-1043',
      skuCount: 4,
      totalUnits: 8,
      weightKg: 820,
      volumeM3: 5.1,
      tempRequirements: [TemperatureRequirement.FROZEN],
      items: [],
    },
    {
      stopSequence: 3,
      lifoStagingOrder: 1,
      lifoPositionLabel: 'Front Bulkhead',
      outlet: {
        id: 'out-3',
        code: '#109',
        name: 'Waypoint Fresh – Kottawa',
        address: 'Expressway Access Rd, Kottawa',
        deliveryWindow: '07:00 – 08:30 AM',
      },
      orderId: 'ord-3',
      orderNumber: 'ORD-1044',
      skuCount: 3,
      totalUnits: 9,
      weightKg: 1120,
      volumeM3: 6.6,
      tempRequirements: [TemperatureRequirement.AMBIENT],
      items: [],
    },
  ],
};

function renderLoaderApp(initialRoute: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/loader"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <LoaderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loader/tasks/:tripId"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <VehicleLoadingDetails />
                </ProtectedRoute>
              }
            />
            <Route path="/dispatcher" element={<div>Dispatcher Portal</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Loader Feature 1: Loading Tasks Dashboard & Vehicle Loading Details (LS-02 & LS-03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    // Set authenticated loader user in session
    sessionStorage.setItem('waypoint_token', 'valid-loader-token');
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'loader-1',
        email: 'loader@waypoint.local',
        role: UserRole.LOADER,
        name: 'D. Jayasuriya',
      })
    );
  });

  // 1. Dashboard renders tasks & summary metrics
  it('1. renders LS-02 dashboard with summary cards and task cards', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText("Today's Loading Tasks")).toBeDefined();
    });

    // Check summary counters
    expect(document.getElementById('summary-vehicles-to-load')?.textContent).toBe('4');
    expect(screen.getByText('Shift 1')).toBeDefined();
    expect(screen.getByText('Manifests validated')).toBeDefined();

    // Check task cards rendered
    expect(screen.getByText('Isuzu 4T Reefer')).toBeDefined();
    expect(screen.getByText('Mitsubishi 5T Dry Box')).toBeDefined();
    expect(screen.getByText('Hino 3T Van')).toBeDefined();
    expect(screen.getByText('Toyota HiAce Van (WP-PX-1290)')).toBeDefined();

    // Check bays displayed
    expect(screen.getByText('BAY 04')).toBeDefined();
    expect(screen.getByText('BAY 02')).toBeDefined();
  });

  // 2. Loading state
  it('2. displays loading spinner while fetching loading tasks', () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockReturnValue(new Promise(() => {}));

    renderLoaderApp('/loader');

    expect(screen.getByText('Loading tasks...')).toBeDefined();
  });

  // 3. Error state with retry
  it('3. displays error state when tasks cannot be fetched', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockRejectedValue(new Error('Network error'));

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText('Unable to load tasks.')).toBeDefined();
      expect(screen.getByText('Network error')).toBeDefined();
    });

    expect(screen.getByText('Retry')).toBeDefined();
  });

  // 4. Client-side filter tabs
  it('4. filters tasks by status tab (All, Not Started, Loading, Ready)', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText("Today's Loading Tasks")).toBeDefined();
    });

    // Click "Not Started" filter
    const notStartedBtn = screen.getByRole('button', { name: /Not Started/i });
    fireEvent.click(notStartedBtn);

    // Only Isuzu 4T Reefer (NOT_STARTED) should be visible
    expect(screen.getByText('Isuzu 4T Reefer')).toBeDefined();
    expect(screen.queryByText('Mitsubishi 5T Dry Box')).toBeNull();
    expect(screen.queryByText('Toyota HiAce Van (WP-PX-1290)')).toBeNull();

    // Click "Ready" filter
    const readyBtn = screen.getByRole('button', { name: /Ready/i });
    fireEvent.click(readyBtn);

    // Only Toyota HiAce (READY_FOR_DISPATCH) should be visible
    expect(screen.getByText('Toyota HiAce Van (WP-PX-1290)')).toBeDefined();
    expect(screen.queryByText('Isuzu 4T Reefer')).toBeNull();

    // Click "All" filter to restore
    const allBtn = screen.getByRole('button', { name: /All/i });
    fireEvent.click(allBtn);
    expect(screen.getByText('Isuzu 4T Reefer')).toBeDefined();
  });

  // 5. Clicking task navigates to vehicle loading details
  it('5. clicking Start Loading opens Vehicle Loading Details (LS-03)', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);
    vi.spyOn(api, 'fetchVehicleLoadingDetails').mockResolvedValue(mockTripDetails);

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText('▶ Start Loading')).toBeDefined();
    });

    const startBtn = screen.getByText('▶ Start Loading');
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('3. Vehicle Loading Details')).toBeDefined();
      expect(screen.getByText('Isuzu Forward Reefer')).toBeDefined();
    });
  });

  // 6. LS-03 Vehicle Loading Details renders capacities, temperature and LIFO stop sequence
  it('6. renders LS-03 capacity ratios, driver info, and LIFO stop sequence', async () => {
    vi.spyOn(api, 'fetchVehicleLoadingDetails').mockResolvedValue(mockTripDetails);

    renderLoaderApp('/loader/tasks/trip-001');

    await waitFor(() => {
      expect(screen.getByText('3. Vehicle Loading Details')).toBeDefined();
    });

    // Check Driver
    expect(screen.getByText('Sunimal Silva')).toBeDefined();
    expect(screen.getByText('Senior Reefer Driver')).toBeDefined();

    // Check Weight & Volume capacity
    expect(screen.getByText('2,480')).toBeDefined();
    expect(screen.getByText(/3,000 kg/)).toBeDefined();
    expect(screen.getByText('82.6%')).toBeDefined();

    expect(screen.getByText('15.2')).toBeDefined();
    expect(screen.getByText(/18.0 m³/)).toBeDefined();
    expect(screen.getByText('84.4%')).toBeDefined();

    // Check Temperature Specs
    expect(screen.getByText('Dual Chill Chamber')).toBeDefined();
    expect(screen.getByText('Chilled (+4°C)')).toBeDefined();
    expect(screen.getByText('Frozen Bay: -18°C')).toBeDefined();

    // Check Reverse-stop protocol banner
    expect(screen.getByText(/Reverse-Stop Loading Protocol Active/i)).toBeDefined();

    // Check Stops
    expect(screen.getByText('Waypoint Fresh – Nugegoda')).toBeDefined();
    expect(screen.getByText('Door Position')).toBeDefined();
    expect(screen.getByText('Waypoint Fresh – Kottawa')).toBeDefined();
    expect(screen.getByText('Front Bulkhead')).toBeDefined();
  });

  // 7. Route protection prevents non-loader user from accessing /loader
  it('7. redirects non-loader user away from /loader', async () => {
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'dispatcher-1',
        email: 'dispatcher@waypoint.local',
        role: UserRole.DISPATCHER,
      })
    );

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText('Dispatcher Portal')).toBeDefined();
      expect(screen.queryByText("Today's Loading Tasks")).toBeNull();
    });
  });
});
