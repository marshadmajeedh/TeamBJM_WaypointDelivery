import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  UserRole,
  LoadingStatus,
  TripStatus,
  VehicleType,
  VehicleTemperatureType,
  TemperatureRequirement,
} from '@waypoint/shared';
import * as api from '../../services/api';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { LoaderDashboard } from './LoaderDashboard';
import { VehicleLoadingDetails } from './VehicleLoadingDetails';
import { LoadingSequence } from './LoadingSequence';
import { LoadingChecklist } from './LoadingChecklist';
import { LoadingIssueReport } from './LoadingIssueReport';
import { LoadingReviewDispatch } from './LoadingReviewDispatch';
import type {
  LoadingTasksResponseData,
  VehicleLoadingDetails as VehicleLoadingDetailsType,
  LoadingSequenceResponse,
  LoadingChecklistResponse,
  LoadingIssueContextResponse,
  LoadingIssueResponse,
  LoadingReviewResponse,
} from '@waypoint/shared';

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
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            <Route
              path="/loader/tasks/:tripId/sequence"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <LoadingSequence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loader/tasks/:tripId/checklist"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <LoadingChecklist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loader/tasks/:tripId/issues/new"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <LoadingIssueReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loader/tasks/:tripId/review"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <LoadingReviewDispatch />
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
      expect(screen.getByText('Vehicles to Load')).toBeDefined();
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

const mockSequenceData: LoadingSequenceResponse = {
  tripId: 'trip-001',
  tripNumber: 'TRIP-01',
  tripSequenceNumber: 1,
  bay: 'BAY 04',
  vehicle: {
    id: 'veh-001',
    registrationNumber: 'WP-CAD-8821',
    type: VehicleType.TRUCK,
    tempType: VehicleTemperatureType.REEFER,
    modelName: 'Isuzu 4T Reefer',
  },
  plannedDepartureTime: '2026-09-29T05:45:00.000Z',
  departureFormatted: 'Departs 05:45 AM',
  loadingStatus: LoadingStatus.NOT_STARTED,
  capacityPercentage: 84,
  mandatoryRule: 'Load items for later stops FIRST so first-stop items remain easily accessible at the rear door / tail-lift.',
  sequenceSummary: 'Sequence: Stop 3 (Deep Cabin) -> Stop 2 (Mid Cabin) -> Stop 1 (Tailgate)',
  stops: [
    {
      stopSequence: 3,
      lifoStagingOrder: 1,
      lifoPositionLabel: 'Front Bulkhead',
      priorityLabel: 'LOAD FIRST - REAR BULKHEAD',
      stepLabel: 'STEP 1 • FIRST TO LOAD',
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
      tempRequirements: [TemperatureRequirement.FROZEN],
      cargoDescription: 'Frozen & Deep Chill',
      designatedHold: {
        zone: 'Zone 2 (Frozen Compartment Forward)',
        temperature: '-18°C',
      },
      etaFormatted: '07:18 AM',
      isImmediateDispatch: false,
      items: [
        {
          id: 'seq-it-1',
          sku: 'KLS-8809',
          productName: 'Keells Frozen Chicken Breasts',
          quantity: 12,
          unitWeightKg: 10,
          unitVolumeM3: 0.1,
          tempRequirement: TemperatureRequirement.FROZEN,
          packageType: '12 crates',
          instructions: '-18°C Keells Security Seal Verified',
        },
      ],
    },
    {
      stopSequence: 2,
      lifoStagingOrder: 2,
      lifoPositionLabel: 'Mid-Chamber',
      priorityLabel: 'LOAD NEXT - MID CABIN',
      stepLabel: 'STEP 2 • NEXT TO LOAD',
      outlet: {
        id: 'out-2',
        code: '#106',
        name: 'Waypoint Fresh – Maharagama',
        address: 'Pamunuwa Junction, Maharagama',
        deliveryWindow: '06:30 – 08:00 AM',
      },
      orderId: 'ord-2',
      orderNumber: 'ORD-1043',
      skuCount: 3,
      totalUnits: 8,
      weightKg: 820,
      volumeM3: 5.1,
      tempRequirements: [TemperatureRequirement.CHILLED],
      cargoDescription: 'Chilled Dairy & Poultry',
      designatedHold: {
        zone: 'Zone 1 (Chilled Barrier 4°C)',
        temperature: '+4°C',
      },
      etaFormatted: '06:48 AM',
      isImmediateDispatch: false,
      items: [],
    },
    {
      stopSequence: 1,
      lifoStagingOrder: 3,
      lifoPositionLabel: 'Door Position',
      priorityLabel: 'LOAD LAST - UNLOAD FIRST',
      stepLabel: 'STEP 3 • LAST TO LOAD',
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
      cargoDescription: 'Fresh Milk, Dairy & Produce',
      designatedHold: {
        zone: 'Tailgate / Roll-Up Shutter',
        temperature: '+4°C',
      },
      etaFormatted: '06:20 AM [First Stop!]',
      isImmediateDispatch: true,
      items: [],
    },
  ],
};

const mockChecklistData: LoadingChecklistResponse = {
  tripId: 'trip-001',
  tripNumber: 'TRIP-01',
  bay: 'Bay D-04',
  vehicle: {
    id: 'veh-001',
    registrationNumber: 'WP-CAD-8821',
    type: VehicleType.TRUCK,
    tempType: VehicleTemperatureType.REEFER,
    modelName: 'Isuzu 4T Reefer',
  },
  plannedDepartureTime: '2026-09-29T05:45:00.000Z',
  departureFormatted: 'Departs 05:45 AM',
  overallProgress: {
    totalRequired: 27,
    totalLoaded: 18,
    percentage: 67,
    verifiedStopsDone: 2,
    totalStops: 3,
    inProgressStops: 1,
    shortageAlertCount: 1,
  },
  stops: [
    {
      stopSequence: 1,
      lifoStagingOrder: 3,
      lifoPositionLabel: 'FIRST UNLOAD',
      outlet: {
        id: 'out-1',
        code: '#104',
        name: 'Waypoint Fresh – Nugegoda',
        address: 'High Level Road, Nugegoda',
      },
      orderId: 'ord-1',
      orderNumber: 'ORD-1042',
      totalItems: 9,
      loadedItems: 2,
      hasShortage: true,
      isCompleted: false,
      items: [
        {
          id: 'item-chk-1',
          orderId: 'ord-1',
          orderNumber: 'ORD-1042',
          sku: 'HLD-0142',
          productName: 'Highland Fresh Full Cream Milk',
          specification: '1L × 12 Pack • 240 kg total',
          tempRequirement: TemperatureRequirement.CHILLED,
          tempLabel: 'Chilled 4°C',
          requiredQuantity: 20,
          stagedQuantity: 18,
          loadedQuantity: 0,
          hasShortage: true,
          shortageQuantity: 2,
          shortageDetails: 'Shortage detected: 2 cartons missing from pallet #P-104',
          unit: 'cartons',
          isLoaded: false,
          status: 'SHORTAGE',
          stopSequence: 1,
          outletCode: '#104',
          outletName: 'Waypoint Fresh – Nugegoda',
        },
      ],
    },
    {
      stopSequence: 2,
      lifoStagingOrder: 2,
      lifoPositionLabel: 'LOAD NEXT',
      outlet: {
        id: 'out-2',
        code: '#106',
        name: 'Waypoint Fresh – Maharagama',
        address: 'Pamunuwa Junction, Maharagama',
      },
      orderId: 'ord-2',
      orderNumber: 'ORD-1043',
      totalItems: 8,
      loadedItems: 8,
      hasShortage: false,
      isCompleted: true,
      items: [
        {
          id: 'item-chk-2',
          orderId: 'ord-2',
          orderNumber: 'ORD-1043',
          sku: 'KLS-9941',
          productName: 'Keells Frozen Ready-to-Cook',
          specification: '6 cartons • Frozen standard',
          tempRequirement: TemperatureRequirement.FROZEN,
          tempLabel: 'Frozen (-18°C)',
          requiredQuantity: 8,
          stagedQuantity: 8,
          loadedQuantity: 8,
          hasShortage: false,
          shortageQuantity: 0,
          shortageDetails: null,
          unit: 'cartons',
          isLoaded: true,
          status: 'LOADED',
          stopSequence: 2,
          outletCode: '#106',
          outletName: 'Waypoint Fresh – Maharagama',
        },
      ],
    },
    {
      stopSequence: 3,
      lifoStagingOrder: 1,
      lifoPositionLabel: 'NOSE LOAD',
      outlet: {
        id: 'out-3',
        code: '#109',
        name: 'Waypoint Fresh – Kottawa',
        address: 'Expressway Access Rd, Kottawa',
      },
      orderId: 'ord-3',
      orderNumber: 'ORD-1044',
      totalItems: 10,
      loadedItems: 10,
      hasShortage: false,
      isCompleted: true,
      items: [
        {
          id: 'item-chk-3',
          orderId: 'ord-3',
          orderNumber: 'ORD-1044',
          sku: 'NWE-3310',
          productName: 'Nuwara Eliya Fresh Carrots',
          specification: '10 boxes • Ambient standard',
          tempRequirement: TemperatureRequirement.AMBIENT,
          tempLabel: 'Ambient',
          requiredQuantity: 10,
          stagedQuantity: 10,
          loadedQuantity: 10,
          hasShortage: false,
          shortageQuantity: 0,
          shortageDetails: null,
          unit: 'boxes',
          isLoaded: true,
          status: 'LOADED',
          stopSequence: 3,
          outletCode: '#109',
          outletName: 'Waypoint Fresh – Kottawa',
        },
      ],
    },
  ],
};

describe('Loader Feature 2: Loading Sequence & Loading Checklist (LS-04 & LS-05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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

  // 1. Loading Sequence renders with cutaway projection and reverse-stop protocol
  it('1. renders LS-04 Loading Sequence with trailer cutaway and reverse-stop protocol', async () => {
    vi.spyOn(api, 'fetchLoadingSequence').mockResolvedValue(mockSequenceData);

    renderLoaderApp('/loader/tasks/trip-001/sequence');

    await waitFor(() => {
      expect(screen.getByText('4. Loading Sequence')).toBeDefined();
    });

    expect(screen.getByText('Reverse-Order Truck Loading Guide')).toBeDefined();
    expect(screen.getByText('TRAILER CUTAWAY PROJECTION')).toBeDefined();
    expect(screen.getByText('Capacity 84% Filled')).toBeDefined();
    expect(screen.getByText('REVERSE-STOP LOADING PROTOCOL')).toBeDefined();
    expect(screen.getByText(/Team BJM Loading Strategy/i)).toBeDefined();
    expect(screen.getByText(/Load items for later stops FIRST/i)).toBeDefined();
  });

  // 2. Stop priority labels render in reverse delivery order
  it('2. renders stop priority labels with reverse LIFO loading queue', async () => {
    vi.spyOn(api, 'fetchLoadingSequence').mockResolvedValue(mockSequenceData);

    renderLoaderApp('/loader/tasks/trip-001/sequence');

    await waitFor(() => {
      expect(screen.getByText(/• LOAD FIRST - REAR BULKHEAD/i)).toBeDefined();
    });

    expect(screen.getByText('STEP 1 • FIRST TO LOAD')).toBeDefined();
    expect(screen.getByText(/STOP 3: Waypoint Fresh – Kottawa/i)).toBeDefined();

    expect(screen.getByText(/• LOAD NEXT - MID CABIN/i)).toBeDefined();
    expect(screen.getByText('STEP 2 • NEXT TO LOAD')).toBeDefined();

    expect(screen.getByText(/• LOAD LAST - UNLOAD FIRST/i)).toBeDefined();
    expect(screen.getByText('STEP 3 • LAST TO LOAD')).toBeDefined();
    expect(screen.getByText(/STOP 1: Waypoint Fresh – Nugegoda/i)).toBeDefined();
  });

  // 3. Start Item Checklist navigates correctly
  it('3. navigates from Loading Sequence to Loading Checklist on primary button click', async () => {
    vi.spyOn(api, 'fetchLoadingSequence').mockResolvedValue(mockSequenceData);
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/sequence');

    await waitFor(() => {
      expect(screen.getByText(/Start Item Checklist/i)).toBeDefined();
    });

    const startBtn = screen.getByText(/Start Item Checklist/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('5. Item Loading Checklist')).toBeDefined();
    });
  });

  // 4. Checklist renders grouped stops and items, with scanner in disabled standby
  it('4. renders LS-05 Loading Checklist with grouped delivery stops and disabled scanner', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText('5. Item Loading Checklist')).toBeDefined();
    });

    expect(screen.getByText(/STOP 1 • FIRST UNLOAD • Nugegoda/i)).toBeDefined();
    expect(screen.getByText(/STOP 2 • LOAD NEXT • Maharagama/i)).toBeDefined();
    expect(screen.getByText(/STOP 3 • NOSE LOAD • Kottawa/i)).toBeDefined();
    expect(screen.getByText('Highland Fresh Full Cream Milk')).toBeDefined();

    // Verify scanner is non-functional / disabled standby
    const scannerBtn = screen.getByRole('button', { name: /scanner offline/i });
    expect((scannerBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('STANDBY')).toBeDefined();
  });

  // 5. Overall progress displays correctly
  it('5. displays overall progress with items count and verified chips', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText('18')).toBeDefined();
    });

    expect(screen.getByText('/ 27 Items Loaded')).toBeDefined();
    expect(screen.getByText('⚡ 67%')).toBeDefined();
    expect(screen.getByText('2 Stops')).toBeDefined();
    expect(screen.getByText('Verified Done')).toBeDefined();
    expect(screen.getByText('1 Issue')).toBeDefined();
  });

  // 6. Item confirmation updates UI
  it('6. confirms item loading when clicking confirm button', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);
    const updateSpy = vi.spyOn(api, 'updateLoadingChecklistItem').mockResolvedValue({
      item: {
        ...mockChecklistData.stops[0].items[0],
        loadedQuantity: 18,
        isLoaded: true,
        status: 'LOADED',
      },
      overallProgress: {
        totalRequired: 27,
        totalLoaded: 27,
        percentage: 100,
        verifiedStopsDone: 3,
        totalStops: 3,
        inProgressStops: 0,
        shortageAlertCount: 1,
      },
      loadingStatus: LoadingStatus.IN_PROGRESS,
    });

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText('✓ Confirm 18 cartons')).toBeDefined();
    });

    const confirmBtn = screen.getByText('✓ Confirm 18 cartons');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('trip-001', 'item-chk-1', 18);
      expect(screen.getByText('Fully Staged & Loaded (18 cartons)')).toBeDefined();
    });
  });

  // 7. Shortage warning displays
  it('7. displays shortage warning box when required quantity exceeds staged quantity', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText(/Shortage detected: 2 cartons missing/i)).toBeDefined();
    });

    expect(screen.getByText('REQUIREMENT')).toBeDefined();
    expect(screen.getByText('20 cartons')).toBeDefined();
    expect(screen.getByText('STAGED COUNT')).toBeDefined();
    expect(screen.getByText('18 cartons')).toBeDefined();
    expect(screen.getByText('⚠️ Report Shortage / Issue')).toBeDefined();
  });

  // 8. Error state displays
  it('8. displays error state when loading checklist fails', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockRejectedValue(new Error('Network connectivity lost'));

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Checklist')).toBeDefined();
      expect(screen.getByText('Network connectivity lost')).toBeDefined();
    });
  });

  // 9. Non-loader cannot access sequence or checklist routes
  it('9. blocks non-loader role from accessing sequence and checklist routes', async () => {
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'dispatcher-1',
        email: 'dispatcher@waypoint.local',
        role: UserRole.DISPATCHER,
      })
    );

    renderLoaderApp('/loader/tasks/trip-001/sequence');

    await waitFor(() => {
      expect(screen.getByText('Dispatcher Portal')).toBeDefined();
      expect(screen.queryByText('4. Loading Sequence')).toBeNull();
    });
  });
});

const mockIssueContextData: LoadingIssueContextResponse = {
  tripId: 'trip-001',
  tripNumber: 'TRIP-2026-001',
  tripSequenceNumber: 1,
  vehicle: {
    id: 'veh-001',
    registrationNumber: 'WP-CAD-8821',
    modelName: 'Isuzu 4T Reefer',
    tempType: VehicleTemperatureType.REEFER,
  },
  bay: 'Bay 04',
  departureTime: '2026-10-01T05:45:00.000Z',
  departureFormatted: 'Departs 05:45 AM',
  totalItemsCount: 6,
  itemIndex: 4,
  selectedItem: {
    id: 'item-001',
    orderId: 'ord-1042',
    orderNumber: 'ORD-1042',
    outletName: 'Waypoint Fresh – Nugegoda',
    outletCode: 'OUT-01',
    sku: 'SKU-MLK-01',
    productName: 'Highland Fresh Full Cream Milk (1L × 12 bottles)',
    unit: 'Cartons',
    tempRequirement: TemperatureRequirement.CHILLED,
    tempLabel: 'Cold Chain 4°C',
    expectedQuantity: 20,
    stagedQuantity: 18,
    shortageQuantity: 2,
    unitWeightKg: 12,
    totalWeightKg: 240,
  },
  availableItems: [
    {
      id: 'item-001',
      productName: 'Highland Fresh Full Cream Milk (1L × 12 bottles)',
      sku: 'SKU-MLK-01',
      orderNumber: 'ORD-1042',
      outletName: 'Waypoint Fresh – Nugegoda',
    },
  ],
};

describe('Loader Feature 3: LS-06 Report Loading Issue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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

  // 1. Renders LS-06 Report Loading Issue with trip and item context
  it('1. renders LS-06 Report Loading Issue with trip and item context', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('6. Report Loading Issue')).toBeDefined();
    });

    expect(screen.getByText('DOCK DISCREPANCY')).toBeDefined();
    expect(screen.getByText('Step 4 of 6 items')).toBeDefined();
    expect(screen.getByText('WP-CAD-8821 (Isuzu 4T Reefer)')).toBeDefined();
    expect(screen.getByText('Staging Bay 04')).toBeDefined();
    expect(screen.getByText('ORD-1042')).toBeDefined();
    expect(screen.getByText('Cold Chain 4°C')).toBeDefined();
    expect(screen.getByText('Waypoint Fresh – Nugegoda')).toBeDefined();
    expect(screen.getByText(/Highland Fresh Full Cream Milk/i)).toBeDefined();
    expect(screen.getByText('20 cartons (240 kg)')).toBeDefined();
  });

  // 2. Selects different primary issue types
  it('2. allows selecting different primary issue types', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Primary Issue Type')).toBeDefined();
    });

    expect(screen.getByText('Missing / Shortage')).toBeDefined();
    expect(screen.getByText('Damaged Packaging')).toBeDefined();
    expect(screen.getByText('Temperature Violation')).toBeDefined();
    expect(screen.getByText('Incorrect SKU')).toBeDefined();

    // Select Damaged Packaging
    const damagedCard = screen.getByText('Damaged Packaging');
    fireEvent.click(damagedCard);
    expect(damagedCard).toBeDefined();
  });

  // 3. Updates physically available quantity via stepper and recalculates net discrepancy
  it('3. updates physically available quantity via stepper and recalculates net discrepancy', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Discrepancy Breakdown')).toBeDefined();
    });

    expect(screen.getByText('-2 cartons (24 kg)')).toBeDefined();

    // Click '-' button to reduce available quantity to 17
    const decBtn = screen.getByLabelText('Decrease physically available quantity');
    fireEvent.click(decBtn);

    expect(screen.getByText('-3 cartons (36 kg)')).toBeDefined();

    // Click '+' button to increase available quantity back to 18
    const incBtn = screen.getByLabelText('Increase physically available quantity');
    fireEvent.click(incBtn);

    expect(screen.getByText('-2 cartons (24 kg)')).toBeDefined();
  });

  // 4. Displays photo evidence and dispatch review required card
  it('4. displays photo evidence card and dispatch review required card', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Photo Evidence')).toBeDefined();
    });

    expect(screen.getByText('1 attached (Simulated)')).toBeDefined();
    expect(screen.getByText('pallet_bay04_shortage.jpg')).toBeDefined();
    expect(screen.getByText('DISPATCH REVIEW REQUIRED')).toBeDefined();
    expect(
      screen.getByText(
        /The reported issue has been recorded and must be reviewed before the vehicle is cleared for dispatch/i
      )
    ).toBeDefined();
  });

  // 5. Validates notes field requiring minimum length
  it('5. validates notes field requiring minimum 5 characters', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Submit Issue to Dispatcher →')).toBeDefined();
    });

    const textarea = screen.getByLabelText('Dock loader notes');
    fireEvent.change(textarea, { target: { value: 'abc' } });

    const submitBtn = screen.getByText('Submit Issue to Dispatcher →');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Physical explanation is mandatory and must contain at least 5 characters/i)).toBeDefined();
    });
  });

  // 6. Successfully submits issue and renders confirmation modal
  it('6. successfully submits issue and renders confirmation modal', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);
    const createSpy = vi.spyOn(api, 'createLoadingIssue').mockResolvedValue({
      id: 'issue-123',
      tripId: 'trip-001',
      orderItemId: 'item-001',
      issueType: 'MISSING',
      description: 'Only 18 cartons staged from cold vault #2.',
      reportedAt: new Date().toISOString(),
      resolved: false,
      loadingStatus: LoadingStatus.ISSUE_REPORTED,
    });

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Submit Issue to Dispatcher →')).toBeDefined();
    });

    const submitBtn = screen.getByText('Submit Issue to Dispatcher →');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'trip-001',
        expect.objectContaining({
          itemId: 'item-001',
          type: 'MISSING',
          quantity: 2,
        })
      );
      expect(screen.getByText('Issue Recorded for Dispatch Review')).toBeDefined();
      expect(screen.getByText('ISSUE_REPORTED')).toBeDefined();
    });
  });

  // 7. Disables submit button during submission to prevent duplicates
  it('7. disables submit button during pending submission to prevent duplicates', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);
    let resolveSubmit: (val: LoadingIssueResponse) => void = () => {};
    vi.spyOn(api, 'createLoadingIssue').mockReturnValue(
      new Promise((res) => {
        resolveSubmit = res;
      })
    );

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Submit Issue to Dispatcher →')).toBeDefined();
    });

    const submitBtn = screen.getByText('Submit Issue to Dispatcher →');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Submitting Issue for Dispatch Review...')).toBeDefined();
      expect((screen.getByRole('button', { name: /submitting issue/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    // Cleanup pending promise and await resolution
    resolveSubmit({
      id: 'issue-123',
      tripId: 'trip-001',
      orderItemId: 'item-001',
      issueType: 'MISSING',
      description: 'Done',
      reportedAt: new Date().toISOString(),
      resolved: false,
      loadingStatus: LoadingStatus.ISSUE_REPORTED,
    });

    await waitFor(() => {
      expect(screen.getByText('Issue Recorded for Dispatch Review')).toBeDefined();
    });
  });

  // 8. Displays error banner when submission fails
  it('8. displays error banner when submission fails', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);
    vi.spyOn(api, 'createLoadingIssue').mockRejectedValue(new Error('Dock terminal network timeout'));

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Submit Issue to Dispatcher →')).toBeDefined();
    });

    const submitBtn = screen.getByText('Submit Issue to Dispatcher →');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Dock terminal network timeout')).toBeDefined();
    });
  });

  // 9. Blocks non-loader role from accessing LS-06 route
  it('9. blocks non-loader role from accessing LS-06 route', async () => {
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'dispatcher-1',
        email: 'dispatcher@waypoint.local',
        role: UserRole.DISPATCHER,
      })
    );

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('Dispatcher Portal')).toBeDefined();
      expect(screen.queryByText('6. Report Loading Issue')).toBeNull();
    });
  });
});

const mockReviewData: LoadingReviewResponse = {
  tripId: 'trip-001',
  tripNumber: 'TRIP-01',
  tripSequenceNumber: 1,
  vehicle: {
    id: 'veh-001',
    registrationNumber: 'WP-CAD-8821',
    modelName: 'Isuzu 4T Reefer',
    type: VehicleType.TRUCK,
    tempType: VehicleTemperatureType.REEFER,
    maxWeightKg: 4000,
    maxVolumeM3: 16.5,
  },
  driver: {
    id: 'driver-001',
    name: 'K. Bandara',
    phone: '+94 77 123 4567',
  },
  bay: 'BAY 04',
  plannedDepartureTime: '2026-09-29T05:45:00.000Z',
  departureFormatted: 'Departs 05:45 AM',
  departureCountdown: 'In 42 mins',
  progress: {
    totalItems: 27,
    loadedItems: 27,
    percentage: 100,
    isComplete: true,
  },
  capacities: {
    usedWeightKg: 3840,
    maxWeightKg: 4000,
    weightMarginKg: 160,
    weightPercentage: 96,
    isWeightCompliant: true,
    usedVolumeM3: 14.8,
    maxVolumeM3: 16.5,
    freeVolumeM3: 1.7,
    volumePercentage: 89.7,
    isVolumeCompliant: true,
  },
  temperatureProfile: {
    isReefer: true,
    chamber1Temp: '-19.2°C',
    chamber2Temp: '4.1°C',
    statusLabel: 'Chamber 1 Frozen Active (-18°C Target)',
  },
  stops: [
    {
      stopSequence: 1,
      outletName: 'Keells Super - Maharagama',
      outletCode: 'OUT-001',
      chamberZone: 'Zone A (Rear) • Unload Sequence 1',
      orderNumber: 'ORD-001',
      requiredItems: 15,
      loadedItems: 15,
      hasDiscrepancy: false,
      isLoaded: true,
      statusBadge: 'Verified',
    },
    {
      stopSequence: 2,
      outletName: 'Cargills Food City - Kottawa',
      outletCode: 'OUT-002',
      chamberZone: 'Zone B (Forward) • Unload Sequence 2',
      orderNumber: 'ORD-002',
      requiredItems: 12,
      loadedItems: 12,
      hasDiscrepancy: false,
      isLoaded: true,
      statusBadge: 'Verified',
    },
  ],
  unresolvedIssueCount: 0,
  unresolvedIssues: [],
  finalChecklist: [
    {
      id: 'step-1',
      title: 'Reverse-stop loading sequence verified',
      description: 'Cargo arranged in inverse delivery stop order.',
      verified: true,
    },
    {
      id: 'step-2',
      title: 'Driver and vehicle match trip manifest',
      description: 'Assigned vehicle and driver credentials verified.',
      verified: true,
    },
    {
      id: 'step-3',
      title: 'Temperature requirements validated',
      description: 'Vehicle temperature specs match cargo profiles.',
      verified: true,
    },
    {
      id: 'step-4',
      title: 'Cargo restraint bars secured',
      description: 'All load partitions and tie-downs firmly locked in position.',
      verified: true,
    },
    {
      id: 'step-5',
      title: 'Manifest total units match physical count',
      description: 'Total item counts match delivery orders.',
      verified: true,
    },
  ],
  checklistComplete: true,
  canDispatch: true,
  loadingStatus: LoadingStatus.IN_PROGRESS,
  tripStatus: TripStatus.PLANNED,
};

describe('Loader Feature 4: LS-07 Loading Review & Ready for Dispatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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

  // 1. LS-07 renders review
  it('1. LS-07 renders review with vehicle, driver, bay, and temperature specs', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByText('7. Loading Review & Dispatch Ready')).toBeDefined();
    });

    expect(screen.getByText('Loading Review & Dispatch Readiness')).toBeDefined();
    expect(screen.getByText(/WP-CAD-8821 • Isuzu 4T Reefer/i)).toBeDefined();
    expect(screen.getByText(/Driver: K. Bandara/i)).toBeDefined();
    expect(screen.getAllByText(/BAY 04/i)[0]).toBeDefined();
    expect(screen.getByText('-19.2°C')).toBeDefined();
    expect(screen.getByText('Cubing Vol.')).toBeDefined();
    expect(screen.getByText('Reverse-stop loading sequence verified')).toBeDefined();
  });

  // 2. Progress displays
  it('2. progress displays cargo manifest fill and payload utilization', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByText(/27 \/ 27 Items Loaded/i)).toBeDefined();
    });

    expect(screen.getByText(/(100%)/i)).toBeDefined();
    expect(screen.getByText(/3,840/i)).toBeDefined();
    expect(screen.getByText(/Limit: 4,000 kg/i)).toBeDefined();
  });

  // 3. Unresolved issue blocked state displays
  it('3. unresolved issue blocked state displays when discrepancy exists', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue({
      ...mockReviewData,
      unresolvedIssueCount: 1,
      canDispatch: false,
      unresolvedIssues: [
        {
          id: 'issue-001',
          orderItemId: 'item-001',
          productName: 'Highland Fresh Full Cream Milk',
          orderNumber: 'ORD-1042',
          issueType: 'DAMAGED',
          description: 'Crushed cartons on pallet loading',
          reportedAt: '2026-09-30T10:00:00.000Z',
        },
      ],
    });

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getAllByText('DISPATCH BLOCKED')[0]).toBeDefined();
    });

    expect(
      screen.getByText(/1 unresolved loading discrepancy requires review before dispatch/i)
    ).toBeDefined();
    expect(screen.getByText(/Crushed cartons on pallet loading/i)).toBeDefined();
    expect(
      screen.getByText(/Dispatch Blocked: Unresolved loading discrepancy requires review before dispatch/i)
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: /Confirm Ready for Dispatch/i })).toBeNull();
  });

  // 4. Incomplete loading blocked state displays
  it('4. incomplete loading blocked state displays when items remain to load', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue({
      ...mockReviewData,
      checklistComplete: false,
      canDispatch: false,
      progress: {
        totalItems: 27,
        loadedItems: 18,
        percentage: 67,
        isComplete: false,
      },
    });

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getAllByText('LOADING INCOMPLETE')[0]).toBeDefined();
    });

    expect(
      screen.getByText(/Dispatch Blocked: Complete loading all 27 items before vehicle can be marked ready for dispatch/i)
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: /Confirm Ready for Dispatch/i })).toBeNull();
  });

  // 5. Ready state renders
  it('5. ready state renders with enabled Confirm Ready button when checklist complete and no issues', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByText('ALL CARGO VERIFIED')).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Ready for Dispatch/i });
    expect(confirmBtn).toBeDefined();
  });

  // 6. Confirmation modal works
  it('6. confirmation modal works with explicit confirmation prompt', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Ready for Dispatch/i })).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Ready for Dispatch/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Confirm that loading has been completed and vehicle/i)).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirm Ready' })).toBeDefined();

    // Cancel closes modal
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/Confirm that loading has been completed and vehicle/i)).toBeNull();
  });

  // 7. Successful confirmation updates UI
  it('7. successful confirmation updates UI to completed state', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);
    vi.spyOn(api, 'confirmReadyForDispatch').mockResolvedValue({
      tripId: 'trip-001',
      loadingStatus: LoadingStatus.READY_FOR_DISPATCH,
      tripStatus: TripStatus.READY_FOR_DISPATCH,
      completedAt: '2026-09-30T10:30:00.000Z',
    });

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Ready for Dispatch/i })).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Ready for Dispatch/i });
    fireEvent.click(confirmBtn);

    const modalConfirmBtn = screen.getByRole('button', { name: 'Confirm Ready' });
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Vehicle Ready for Dispatch')[0]).toBeDefined();
    });

    expect(
      screen.getByText(/Loading has been confirmed and verified./i)
    ).toBeDefined();
  });

  // 8. Return to Checklist navigation works
  it('8. Return to Checklist navigation works', async () => {
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByText('7. Loading Review & Dispatch Ready')).toBeDefined();
    });

    const backBtn = screen.getByRole('button', { name: /Back to Loading Checklist/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Loading Checklist')).toBeDefined();
    });
  });

  // 9. Blocks non-loader role from accessing LS-07 route
  it('9. blocks non-loader role from accessing LS-07 route', async () => {
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'dispatcher-1',
        email: 'dispatcher@waypoint.local',
        role: UserRole.DISPATCHER,
      })
    );

    renderLoaderApp('/loader/tasks/trip-001/review');

    await waitFor(() => {
      expect(screen.getByText('Dispatcher Portal')).toBeDefined();
      expect(screen.queryByText('7. Loading Review & Dispatch Ready')).toBeNull();
    });
  });
});

describe('Loader Portal: Responsive UX & Interaction Stabilization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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

  // 1. LS-02 Issues tab filters to issues
  it('1. filters tasks specifically by Issues filter tab', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText("Today's Loading Tasks")).toBeDefined();
    });

    const issuesTabBtn = document.getElementById('filter-issues');
    expect(issuesTabBtn).toBeDefined();
    if (issuesTabBtn) {
      fireEvent.click(issuesTabBtn);
    }

    // Only Hino 3T Van (ISSUE_REPORTED) should be displayed
    expect(screen.getByText('Hino 3T Van')).toBeDefined();
    expect(screen.queryByText('Isuzu 4T Reefer')).toBeNull();
    expect(screen.queryByText('Toyota HiAce Van (WP-PX-1290)')).toBeNull();
  });

  // 2. LS-02 Mobile bottom navigation buttons switch active views
  it('2. mobile navigation buttons switch view to All and Issues', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);

    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText("Today's Loading Tasks")).toBeDefined();
    });

    const mobileIssuesBtn = document.getElementById('mobile-nav-issues');
    expect(mobileIssuesBtn).toBeDefined();
    if (mobileIssuesBtn) {
      fireEvent.click(mobileIssuesBtn);
    }
    expect(screen.getByText('Hino 3T Van')).toBeDefined();
    expect(screen.queryByText('Isuzu 4T Reefer')).toBeNull();

    const mobileTasksBtn = document.getElementById('mobile-nav-tasks');
    expect(mobileTasksBtn).toBeDefined();
    if (mobileTasksBtn) {
      fireEvent.click(mobileTasksBtn);
    }
    expect(screen.getByText('Isuzu 4T Reefer')).toBeDefined();
  });

  // 3. LS-03 verify fake sensor button is removed
  it('3. verifies fake telematics sensor button is removed from LS-03', async () => {
    vi.spyOn(api, 'fetchVehicleLoadingDetails').mockResolvedValue(mockTripDetails);

    renderLoaderApp('/loader/tasks/trip-001');

    await waitFor(() => {
      expect(screen.getByText('3. Vehicle Loading Details')).toBeDefined();
    });

    expect(screen.queryByText(/Inspect Reefer Telematics & Bay Sensors/i)).toBeNull();
    expect(document.getElementById('inspect-sensors-btn')).toBeNull();
  });

  // 4. LS-04 stop expandable toggle opens and closes SKU items
  it('4. toggles stop cards details expansion in LS-04', async () => {
    vi.spyOn(api, 'fetchLoadingSequence').mockResolvedValue(mockSequenceData);

    renderLoaderApp('/loader/tasks/trip-001/sequence');

    await waitFor(() => {
      expect(screen.getByText('4. Loading Sequence')).toBeDefined();
    });

    // Initially stops are expanded by default
    expect(screen.getByText('Keells Frozen Chicken Breasts')).toBeDefined();

    const hideButtons = screen.getAllByRole('button', { name: /Hide Details/i });
    expect(hideButtons.length).toBeGreaterThan(0);

    // Collapse first stop
    fireEvent.click(hideButtons[0]);
    expect(screen.queryByText('Keells Frozen Chicken Breasts')).toBeNull();

    // Re-expand first stop
    const showButton = screen.getByRole('button', { name: /^Details/i });
    fireEvent.click(showButton);
    expect(screen.getByText('Keells Frozen Chicken Breasts')).toBeDefined();
  });

  // 5. LS-05 disabled scanner button does not trigger action
  it('5. confirms LS-05 scanner offline control is disabled', async () => {
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);

    renderLoaderApp('/loader/tasks/trip-001/checklist');

    await waitFor(() => {
      expect(screen.getByText('5. Item Loading Checklist')).toBeDefined();
    });

    const scannerBtn = screen.getByRole('button', { name: /scanner offline/i });
    expect((scannerBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('STANDBY')).toBeDefined();
  });

  // 6. LS-06 photo section has no fake interactive buttons
  it('6. verifies LS-06 photo section has no fake interactive camera buttons', async () => {
    vi.spyOn(api, 'fetchLoadingIssueContext').mockResolvedValue(mockIssueContextData);

    renderLoaderApp('/loader/tasks/trip-001/issues/new?itemId=item-001');

    await waitFor(() => {
      expect(screen.getByText('6. Report Loading Issue')).toBeDefined();
    });

    expect(screen.queryByText(/Retake \(Simulated\)/i)).toBeNull();
    expect(screen.queryByText(/Add Second Angle/i)).toBeNull();
    expect(screen.getByText(/Hardware camera integration offline/i)).toBeDefined();
  });

  // 7. Full workflow click-through without URL typing
  it('7. verifies full sequential Loader workflow navigation through UI buttons', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);
    vi.spyOn(api, 'fetchVehicleLoadingDetails').mockResolvedValue(mockTripDetails);
    vi.spyOn(api, 'fetchLoadingSequence').mockResolvedValue(mockSequenceData);
    vi.spyOn(api, 'fetchLoadingChecklist').mockResolvedValue(mockChecklistData);
    vi.spyOn(api, 'fetchLoadingReview').mockResolvedValue(mockReviewData);

    // 1. Dashboard (LS-02)
    renderLoaderApp('/loader');
    await waitFor(() => {
      expect(screen.getByText('▶ Start Loading')).toBeDefined();
    });

    // 2. Click Start Loading -> LS-03
    fireEvent.click(screen.getByText('▶ Start Loading'));
    await waitFor(() => {
      expect(screen.getByText('3. Vehicle Loading Details')).toBeDefined();
      expect(screen.getByText('View Loading Sequence & Marshalling Plan')).toBeDefined();
    });

    // 3. Click View Loading Sequence -> LS-04
    fireEvent.click(screen.getByText('View Loading Sequence & Marshalling Plan'));
    await waitFor(() => {
      expect(screen.getByText('4. Loading Sequence')).toBeDefined();
      expect(screen.getByText(/Start Item Checklist/i)).toBeDefined();
    });

    // 4. Click Start Item Checklist -> LS-05
    fireEvent.click(screen.getByText(/Start Item Checklist/i));
    await waitFor(() => {
      expect(screen.getByText('5. Item Loading Checklist')).toBeDefined();
      expect(screen.getByText(/Review Loading/i)).toBeDefined();
    });

    // 5. Click Review Loading -> LS-07
    fireEvent.click(screen.getByText(/Review Loading/i));
    await waitFor(() => {
      expect(screen.getByText('7. Loading Review & Dispatch Ready')).toBeDefined();
      expect(screen.getByRole('button', { name: /Confirm Ready for Dispatch/i })).toBeDefined();
    });
  });
});

describe('Loader Portal: Visual Consistency & Card Alignment Audit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. verifies LS-02 task cards maintain standard structural regions, flex-1 details, and aligned CTAs', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);
    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText("Today's Loading Tasks")).toBeDefined();
    });

    const taskCardsList = document.getElementById('loading-tasks-list');
    expect(taskCardsList).toBeDefined();
    expect(taskCardsList?.className).toContain('items-stretch');

    // Check task card container has flex flex-col h-full
    const firstTaskCard = document.getElementById('task-card-trip-001');
    expect(firstTaskCard).toBeDefined();
    expect(firstTaskCard?.className).toContain('flex');
    expect(firstTaskCard?.className).toContain('flex-col');
    expect(firstTaskCard?.className).toContain('h-full');

    // Check CTA button has standardized height h-11 and cursor-pointer
    const startBtn = document.getElementById('start-loading-btn-trip-001');
    expect(startBtn).toBeDefined();
    expect(startBtn?.className).toContain('h-11');
    expect(startBtn?.className).toContain('cursor-pointer');
  });

  it('2. verifies LS-02 top summary cards use items-stretch and equal height flex layout', async () => {
    vi.spyOn(api, 'fetchLoadingTasks').mockResolvedValue(mockTasksData);
    renderLoaderApp('/loader');

    await waitFor(() => {
      expect(screen.getByText('Vehicles to Load')).toBeDefined();
    });

    const summarySection = document.getElementById('loading-summary-section');
    expect(summarySection?.className).toContain('items-stretch');

    const vehiclesToLoadStat = document.getElementById('summary-vehicles-to-load');
    expect(vehiclesToLoadStat).toBeDefined();
  });

  it('3. verifies LS-03 capacity specifications grid uses items-stretch and equal height cards', async () => {
    vi.spyOn(api, 'fetchVehicleLoadingDetails').mockResolvedValue(mockTripDetails);
    renderLoaderApp('/loader/tasks/trip-001');

    await waitFor(() => {
      expect(screen.getByText('WEIGHT LOAD')).toBeDefined();
    });

    const capacitiesGrid = document.getElementById('vehicle-capacities-grid');
    expect(capacitiesGrid?.className).toContain('items-stretch');
  });
});
