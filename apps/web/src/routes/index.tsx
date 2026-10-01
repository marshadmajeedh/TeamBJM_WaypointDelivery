import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPortal } from '../features/overview/OverviewPortal';
import { StoreLogin } from '../features/store-manager/pages/StoreLogin';
import { StoreManagerPortal } from '../features/store-manager/StoreManagerPortal';
import { DispatcherPortal } from '../features/dispatcher/DispatcherPortal';
import { LoaderPortal } from '../features/loader/LoaderPortal';
import { DriverPortal } from '../features/driver/DriverPortal';
import { LoginPortal } from '../features/auth/LoginPortal';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
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
        />

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<OverviewPortal />} />
      </Route>
    </Routes>
  );
};
