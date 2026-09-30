import React from 'react';
import { LoaderDashboard } from './LoaderDashboard';

export { LoaderDashboard } from './LoaderDashboard';
export { VehicleLoadingDetails } from './VehicleLoadingDetails';

export const LoaderPortal: React.FC = () => {
  return <LoaderDashboard />;
};
