import React from 'react';
import { LoaderDashboard } from './LoaderDashboard';

export { LoaderDashboard } from './LoaderDashboard';
export { VehicleLoadingDetails } from './VehicleLoadingDetails';
export { LoadingSequence } from './LoadingSequence';
export { LoadingChecklist } from './LoadingChecklist';
export { LoadingIssueReport } from './LoadingIssueReport';
export { LoadingReviewDispatch } from './LoadingReviewDispatch';

export const LoaderPortal: React.FC = () => {
  return <LoaderDashboard />;
};
