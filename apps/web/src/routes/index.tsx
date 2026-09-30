import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPortal } from '../features/overview/OverviewPortal';
import { StoreManagerPortal } from '../features/store-manager/StoreManagerPortal';
import { DispatcherPortal } from '../features/dispatcher/DispatcherPortal';
import {
  LoaderPortal,
  VehicleLoadingDetails,
  LoadingSequence,
  LoadingChecklist,
} from '../features/loader/LoaderPortal';
import { DriverPortal } from '../features/driver/DriverPortal';
import { LoginPortal } from '../features/auth/LoginPortal';
import { ProtectedRoute } from './ProtectedRoute';

const LoadingIssuePlaceholder: React.FC = () => {
  return (
    <div style={{ maxWidth: '560px', margin: '40px auto', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <span style={{ fontSize: '36px' }}>📋</span>
      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '12px 0 6px 0', color: '#0f172a' }}>Report Loading Issue (LS-06)</h3>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        This workflow will be available in Loader Feature 3. Returning to loading checklist...
      </p>
      <button
        style={{ backgroundColor: '#0c1b29', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
        onClick={() => window.history.back()}
      >
        Back to Loading Checklist
      </button>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Public Routes */}
        <Route index element={<OverviewPortal />} />
        <Route path="login" element={<LoginPortal />} />

        {/* Protected Role-Based Routes */}
        <Route
          path="store"
          element={
            <ProtectedRoute allowedRoles={[UserRole.STORE_MANAGER]}>
              <StoreManagerPortal />
            </ProtectedRoute>
          }
        />
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
              <LoadingIssuePlaceholder />
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
