import Dexie, { Table } from 'dexie';
import { SyncStatus } from '@waypoint/shared';

export interface OfflineDeliveryItem {
  id: string;
  orderId: string;
  tripId: string;
  driverId: string;
  outcome?: string;
  recipientName?: string;
  recipientSignature?: string;
  photoUrl?: string;
  notes?: string;
  arrivedAt?: string;
  completedAt?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface OfflineSyncQueueItem {
  id?: number;
  clientSyncId: string;
  entityType: 'DELIVERY' | 'PROOF_OF_DELIVERY' | 'RECEIPT' | 'DRIVER_ACTION';
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: SyncStatus | 'SYNCING';
  retryCount: number;
  driverId?: string;
  error?: string;
  updatedAt?: string;
}

export interface OfflineDriverCache {
  id: string;
  driverId: string;
  value: unknown;
  updatedAt: string;
}

export class WaypointOfflineDatabase extends Dexie {
  deliveries!: Table<OfflineDeliveryItem, string>;
  syncQueue!: Table<OfflineSyncQueueItem, number>;
  driverCache!: Table<OfflineDriverCache, string>;

  constructor() {
    super('WaypointOfflineDB');
    this.version(1).stores({
      deliveries: 'id, tripId, orderId, driverId, syncStatus',
      syncQueue: '++id, clientSyncId, entityType, entityId, status, createdAt',
    });
    this.version(2).stores({
      deliveries: 'id, tripId, orderId, driverId, syncStatus',
      syncQueue: '++id, clientSyncId, entityType, entityId, status, createdAt, driverId',
      driverCache: 'id, driverId',
    });
  }
}

export const offlineDb = new WaypointOfflineDatabase();
