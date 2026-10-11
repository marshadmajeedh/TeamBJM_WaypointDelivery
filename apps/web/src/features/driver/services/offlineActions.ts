import {
  DriverAction,
  QueuedDriverAction,
  SyncStatus,
  queuedDriverActionSchema,
} from '@waypoint/shared';
import { offlineDb, OfflineSyncQueueItem } from '../../../offline/db';
import { driverApi } from './driverApi';

export function unpack(item: OfflineSyncQueueItem): QueuedDriverAction {
  return queuedDriverActionSchema.parse({
    clientSyncId: item.clientSyncId,
    createdAt: item.createdAt,
    payload: item.payload,
  });
}
export async function submitDriverAction(
  driverId: string,
  payload: DriverAction
): Promise<'saved' | 'queued'> {
  const action = queuedDriverActionSchema.parse({
    clientSyncId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
  });
  const id = await offlineDb.syncQueue.add({
    driverId,
    clientSyncId: action.clientSyncId,
    entityType: 'DRIVER_ACTION',
    entityId: 'stopId' in payload ? payload.stopId : payload.tripId,
    payload: action.payload,
    createdAt: action.createdAt,
    updatedAt: action.createdAt,
    status: SyncStatus.PENDING,
    retryCount: 0,
  });
  if (!navigator.onLine) return 'queued';
  await syncDriverActions(driverId);
  // An already-running worker may have taken its snapshot before this action was added.
  if ((await offlineDb.syncQueue.get(id))?.status === SyncStatus.PENDING)
    await syncDriverActions(driverId);
  const row = await offlineDb.syncQueue.get(id);
  if (row?.status === SyncStatus.FAILED)
    throw new Error(row.error ?? 'Action could not be submitted. It is retained for retry.');
  return row?.status === SyncStatus.SYNCED ? 'saved' : 'queued';
}

const syncing = new Map<string, Promise<void>>();
export function syncDriverActions(driverId: string): Promise<void> {
  const running = syncing.get(driverId);
  if (running) return running;
  const work = (async () => {
    if (!navigator.onLine) return;
    const actions = await offlineDb.syncQueue
      .where('driverId')
      .equals(driverId)
      .filter((v) => v.entityType === 'DRIVER_ACTION' && v.status !== SyncStatus.SYNCED)
      .sortBy('id');
    for (const item of actions) {
      if (!navigator.onLine) break;
      await offlineDb.syncQueue.update(item.id!, { status: 'SYNCING', error: undefined });
      try {
        const results = await driverApi.sync([unpack(item)]);
        const result = results.find((r) => r.clientSyncId === item.clientSyncId);
        if (!result?.success)
          throw new Error(result?.error ?? 'Server did not confirm this action.');
        await offlineDb.syncQueue.update(item.id!, {
          status: SyncStatus.SYNCED,
          error: undefined,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        await offlineDb.syncQueue.update(item.id!, {
          status:
            e instanceof TypeError || !navigator.onLine ? SyncStatus.PENDING : SyncStatus.FAILED,
          retryCount: item.retryCount + 1,
          error: e instanceof Error ? e.message : 'Sync failed',
        });
        break; // dependent delivery/finish actions cannot overtake an unsuccessful predecessor
      }
    }
  })().finally(() => syncing.delete(driverId));
  syncing.set(driverId, work);
  return work;
}
