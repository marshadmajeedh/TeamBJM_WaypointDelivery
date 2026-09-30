import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPortal } from '../features/overview/OverviewPortal';
import { StoreManagerPortal } from '../features/store-manager/StoreManagerPortal';
import { DispatcherPortal } from '../features/dispatcher/DispatcherPortal';
import { LoaderPortal } from '../features/loader/LoaderPortal';
import { DriverPortal } from '../features/driver/DriverPortal';
import { LoginPortal } from '../features/auth/LoginPortal';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<OverviewPortal />} />
        <Route path="store" element={<StoreManagerPortal />} />
        <Route path="dispatcher" element={<DispatcherPortal />} />
        <Route path="loader" element={<LoaderPortal />} />
        <Route path="driver" element={<DriverPortal />} />
        <Route path="login" element={<LoginPortal />} />
        <Route path="*" element={<OverviewPortal />} />
      </Route>
    </Routes>
  );
};
