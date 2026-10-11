import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DeliveryResult,
  DriverAction,
  DriverIssue,
  DriverTrip,
  SyncStatus,
  TripStatus,
} from '@waypoint/shared';
import { useAuth } from '../auth/AuthContext';
import { offlineDb, OfflineSyncQueueItem } from '../../offline/db';
import { driverApi } from './services/driverApi';
import { submitDriverAction, syncDriverActions, unpack } from './services/offlineActions';

interface State {
  trip: DriverTrip | null;
  issues: DriverIssue[];
  queue: OfflineSyncQueueItem[];
  online: boolean;
  loading: boolean;
  error: string;
  feedback: string;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  submit: (p: DriverAction) => Promise<void>;
  saveDraft: (id: string, value: DeliveryResult) => Promise<void>;
  draft: (id: string) => Promise<DeliveryResult | undefined>;
}
const Context = createContext<State | null>(null);
export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const driverId = user!.id;
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const cache =
    useLiveQuery(
      () => offlineDb.driverCache.where('driverId').equals(driverId).toArray(),
      [driverId]
    ) ?? [];
  const queue =
    useLiveQuery(
      () =>
        offlineDb.syncQueue
          .where('driverId')
          .equals(driverId)
          .filter((v) => v.entityType === 'DRIVER_ACTION')
          .sortBy('id'),
      [driverId]
    ) ?? [];
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (navigator.onLine) {
        const [trip, issues] = await Promise.all([driverApi.trip(), driverApi.issues()]);
        await offlineDb.driverCache.bulkPut([
          { id: `${driverId}:trip`, driverId, value: trip, updatedAt: new Date().toISOString() },
          {
            id: `${driverId}:issues`,
            driverId,
            value: issues,
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the trip.');
    } finally {
      setLoading(false);
    }
  }, [driverId]);
  const sync = useCallback(async () => {
    try {
      await syncDriverActions(driverId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sync.');
    }
  }, [driverId, refresh]);
  useEffect(() => {
    void sync();
    const connect = () => {
      setOnline(true);
      void sync();
    };
    const disconnect = () => setOnline(false);
    window.addEventListener('online', connect);
    window.addEventListener('offline', disconnect);
    return () => {
      window.removeEventListener('online', connect);
      window.removeEventListener('offline', disconnect);
    };
  }, [sync]);
  const cached = cache.find((v) => v.id === `${driverId}:trip`)?.value as
    DriverTrip | null | undefined;
  const trip = cached ? structuredClone(cached) : null;
  const issues = [
    ...((cache.find((v) => v.id === `${driverId}:issues`)?.value as DriverIssue[] | undefined) ??
      []),
  ];
  for (const row of queue) {
    if (row.status === SyncStatus.FAILED) continue;
    const { payload: p } = unpack(row);
    if (p.type === 'ISSUE' && !issues.some((i) => i.id === row.clientSyncId))
      issues.unshift({ ...p, id: row.clientSyncId, reportedAt: row.createdAt, resolved: false });
    if (!trip || p.tripId !== trip.id) continue;
    if (p.type === 'START_TRIP' && trip.status !== TripStatus.COMPLETED) {
      trip.status = TripStatus.IN_TRANSIT;
      trip.actualDepartureTime ??= row.createdAt;
    }
    if (p.type === 'FINISH_TRIP') {
      trip.status = TripStatus.COMPLETED;
      trip.completedTime ??= row.createdAt;
    }
    if ('stopId' in p) {
      const stop = trip.stops.find((s) => s.id === p.stopId);
      if (stop && p.type === 'ARRIVAL') stop.arrivedAt ??= row.createdAt;
      if (stop && p.type === 'COMPLETE_DELIVERY') {
        stop.outcome = p.result.outcome;
        stop.completedAt = row.createdAt;
      }
    }
  }
  const submit = async (p: DriverAction) => {
    const result = await submitDriverAction(driverId, p);
    setFeedback(
      result === 'queued' ? 'Saved on this device. Waiting to sync.' : 'Submitted successfully.'
    );
    if (result === 'saved') void refresh();
  };
  return (
    <Context.Provider
      value={{
        trip,
        issues,
        queue,
        online,
        loading,
        error,
        feedback,
        refresh,
        sync,
        submit,
        saveDraft: async (id, value) => {
          await offlineDb.driverCache.put({
            id: `${driverId}:draft:${id}`,
            driverId,
            value,
            updatedAt: new Date().toISOString(),
          });
        },
        draft: async (id) =>
          (await offlineDb.driverCache.get(`${driverId}:draft:${id}`))?.value as
            DeliveryResult | undefined,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDriver() {
  const value = useContext(Context);
  if (!value) throw new Error('Driver provider required');
  return value;
}
