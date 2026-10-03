import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPortal } from '../features/overview/OverviewPortal';
import { StoreLogin } from '../features/store-manager/pages/StoreLogin';
import { StoreManagerPortal } from '../features/store-manager/StoreManagerPortal';
import { DispatcherPortal } from '../features/dispatcher/DispatcherPortal';
import { LoaderPortal } from '../features/loader/LoaderPortal';
import { DriverLoginPage } from '../features/driver/pages/DriverLoginPage';
import { DriverPrototypePage } from '../features/driver/pages/DriverPrototypePage';
import { DriverPortal } from '../features/driver/DriverPortal';
import { LoginPortal } from '../features/auth/LoginPortal';
import { ProtectedRoute } from './ProtectedRoute';
import { DriverTodayRoutePage } from '../features/driver/pages/DriverTodayRoutePage';
import { DriverRouteOverviewPage } from '../features/driver/pages/DriverRouteOverviewPage';
import { DriverStopListPage } from '../features/driver/pages/DriverStopListPage';
import { DriverStopDetailsPage } from '../features/driver/pages/DriverStopDetailsPage';
import { DriverDeliveryOutcomePage } from '../features/driver/pages/DriverDeliveryOutcomePage';
import { DriverProofOfDeliveryPage } from '../features/driver/pages/DriverProofOfDeliveryPage';
import { DriverOfflinePage } from '../features/driver/pages/DriverOfflinePage';
import { DriverSyncStatusPage } from '../features/driver/pages/DriverSyncStatusPage';
import { DriverTripCompletedPage } from '../features/driver/pages/DriverTripCompletedPage';
import { DriverIssuesPage } from '../features/driver/pages/DriverIssuesPage';
import { DriverProfilePage } from '../features/driver/pages/DriverProfilePage';

export const AppRoutes: React.FC = () => {
  return (
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
  );
};
