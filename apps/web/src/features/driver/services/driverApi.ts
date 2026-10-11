import {
  ApiResponseSuccess,
  DriverIssue,
  DriverSyncResult,
  DriverTrip,
  QueuedDriverAction,
} from '@waypoint/shared';
import { apiRequest } from '../../../services/api';

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiRequest<ApiResponseSuccess<T>>(
    `/driver/${path}`,
    body ? { method: 'POST', body: JSON.stringify(body) } : {}
  );
  return res.data;
}
export const driverApi = {
  trip: () => request<DriverTrip | null>('trip'),
  issues: () => request<DriverIssue[]>('issues'),
  action: (action: QueuedDriverAction) => request<DriverSyncResult>('actions', action),
  sync: (actions: QueuedDriverAction[]) => request<DriverSyncResult[]>('sync', { actions }),
};
