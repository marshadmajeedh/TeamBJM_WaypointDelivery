import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPortal } from '../features/overview/OverviewPortal';
import { LoginPortal } from '../features/auth/LoginPortal';
import { ProtectedRoute } from './ProtectedRoute';

const StoreLogin = React.lazy(() =>
  import('../features/store-manager/pages/StoreLogin').then((m) => ({ default: m.StoreLogin }))
);
const StoreManagerPortal = React.lazy(() =>
  import('../features/store-manager/StoreManagerPortal').then((m) => ({
    default: m.StoreManagerPortal,
  }))
);
const DispatcherPortal = React.lazy(() =>
  import('../features/dispatcher/DispatcherPortal').then((m) => ({ default: m.DispatcherPortal }))
);
const LoaderPortal = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.LoaderPortal }))
);
const VehicleLoadingDetails = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.VehicleLoadingDetails }))
);
const LoadingSequence = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.LoadingSequence }))
);
const LoadingChecklist = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.LoadingChecklist }))
);
const LoadingIssueReport = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.LoadingIssueReport }))
);
const LoadingReviewDispatch = React.lazy(() =>
  import('../features/loader/LoaderPortal').then((m) => ({ default: m.LoadingReviewDispatch }))
);
const DriverLoginPage = React.lazy(() =>
  import('../features/driver/pages/DriverLoginPage').then((m) => ({ default: m.DriverLoginPage }))
);
const DriverPrototypePage = React.lazy(() =>
  import('../features/driver/pages/DriverPrototypePage').then((m) => ({
    default: m.DriverPrototypePage,
  }))
);
const DriverPortal = React.lazy(() =>
  import('../features/driver/DriverPortal').then((m) => ({ default: m.DriverPortal }))
);
const DriverTodayRoutePage = React.lazy(() =>
  import('../features/driver/pages/DriverTodayRoutePage').then((m) => ({
    default: m.DriverTodayRoutePage,
  }))
);
const DriverRouteOverviewPage = React.lazy(() =>
  import('../features/driver/pages/DriverRouteOverviewPage').then((m) => ({
    default: m.DriverRouteOverviewPage,
  }))
);
const DriverStopListPage = React.lazy(() =>
  import('../features/driver/pages/DriverStopListPage').then((m) => ({
    default: m.DriverStopListPage,
  }))
);
const DriverStopDetailsPage = React.lazy(() =>
  import('../features/driver/pages/DriverStopDetailsPage').then((m) => ({
    default: m.DriverStopDetailsPage,
  }))
);
const DriverDeliveryOutcomePage = React.lazy(() =>
  import('../features/driver/pages/DriverDeliveryOutcomePage').then((m) => ({
    default: m.DriverDeliveryOutcomePage,
  }))
);
const DriverProofOfDeliveryPage = React.lazy(() =>
  import('../features/driver/pages/DriverProofOfDeliveryPage').then((m) => ({
    default: m.DriverProofOfDeliveryPage,
  }))
);
const DriverOfflinePage = React.lazy(() =>
  import('../features/driver/pages/DriverOfflinePage').then((m) => ({
    default: m.DriverOfflinePage,
  }))
);
const DriverSyncStatusPage = React.lazy(() =>
  import('../features/driver/pages/DriverSyncStatusPage').then((m) => ({
    default: m.DriverSyncStatusPage,
  }))
);
const DriverTripCompletedPage = React.lazy(() =>
  import('../features/driver/pages/DriverTripCompletedPage').then((m) => ({
    default: m.DriverTripCompletedPage,
  }))
);
const DriverIssuesPage = React.lazy(() =>
  import('../features/driver/pages/DriverIssuesPage').then((m) => ({
    default: m.DriverIssuesPage,
  }))
);
const DriverProfilePage = React.lazy(() =>
  import('../features/driver/pages/DriverProfilePage').then((m) => ({
    default: m.DriverProfilePage,
  }))
);

const RouteFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center p-8 text-slate-500 font-medium">
    Loading...
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/driver/login" element={<DriverLoginPage />} />
        <Route path="/store/login" element={<StoreLogin />} />
        <Route path="/store/*" element={<StoreManagerPortal />} />
        <Route path="/" element={<AppLayout />}>
          {/* Public Routes */}
          <Route index element={<OverviewPortal />} />
          <Route path="login" element={<LoginPortal />} />

          {/* Protected Role-Based Routes */}
          <Route
            path="dispatcher"
            element={
              <ProtectedRoute allowedRoles={[UserRole.DISPATCHER]}>
                <DispatcherPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <LoaderPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader/tasks/:tripId"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <VehicleLoadingDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader/tasks/:tripId/sequence"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <LoadingSequence />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader/tasks/:tripId/checklist"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <LoadingChecklist />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader/tasks/:tripId/issues/new"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <LoadingIssueReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="loader/tasks/:tripId/review"
            element={
              <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                <LoadingReviewDispatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="driver"
            element={
              <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
                <DriverPortal />
              </ProtectedRoute>
            }
          >
            <Route index element={<DriverTodayRoutePage />} />
            <Route path="route" element={<DriverRouteOverviewPage />} />
            <Route path="stops" element={<DriverStopListPage />} />
            <Route path="stops/:stopId" element={<DriverStopDetailsPage />} />
            <Route path="stops/:stopId/outcome" element={<DriverDeliveryOutcomePage />} />
            <Route path="stops/:stopId/proof" element={<DriverProofOfDeliveryPage />} />
            <Route path="offline" element={<DriverOfflinePage />} />
            <Route path="sync" element={<DriverSyncStatusPage />} />
            <Route path="trip-completed" element={<DriverTripCompletedPage />} />
            <Route path="issues" element={<DriverIssuesPage />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="prototype" element={<DriverPrototypePage />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<OverviewPortal />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
