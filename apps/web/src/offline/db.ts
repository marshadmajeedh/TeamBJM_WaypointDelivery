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
  entityType: 'DELIVERY' | 'PROOF_OF_DELIVERY' | 'RECEIPT';
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
}

export class WaypointOfflineDatabase extends Dexie {
  deliveries!: Table<OfflineDeliveryItem, string>;
  syncQueue!: Table<OfflineSyncQueueItem, number>;

  constructor() {
    super('WaypointOfflineDB');
    this.version(1).stores({
      deliveries: 'id, tripId, orderId, driverId, syncStatus',
      syncQueue: '++id, clientSyncId, entityType, entityId, status, createdAt',
    });
  }
}

export const offlineDb = new WaypointOfflineDatabase();
