import type { OrderStatusType, TemperatureRequirementType } from '@waypoint/shared';
export interface Outlet {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string | null;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
}
export interface Product {
  id: string;
  productName: string;
  pack: string;
  unitWeightKg: number;
  unitVolumeM3: number;
  tempRequirement: TemperatureRequirementType;
}
export interface OrderItem extends Omit<Product, 'pack'> {
  quantity: number;
}
export interface StoreWorkflow {
  bay: { bayNumber: '02'; checks: boolean[]; readyAt: string; userId: string } | null;
  slot: {
    id: string;
    deferralCount: number;
    start: string;
    end: string;
    publishedAt: string;
  } | null;
  deferralResponse: {
    action: 'ACKNOWLEDGE' | 'ACCEPT';
    slotId: string | null;
    deferralCount: number;
    respondedAt: string;
    userId: string;
  } | null;
  receivingInstructions: string;
  category: string;
  telemetry: {
    capturedAt: string;
    eta: string | null;
    latitude: number | null;
    longitude: number | null;
    chilledC: number | null;
    frozenC: number | null;
    stopsAway: number | null;
    stale: boolean;
  } | null;
}
export interface ReceiptProof {
  name: string;
  dataUrl: string;
}
export interface StoreOrder {
  workflow?: StoreWorkflow;
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  outletId: string;
  outlet: Outlet;
  requestedDeliveryDate: string;
  createdAt: string;
  totalWeightKg: number;
  totalVolumeM3: number;
  deferralReason: string | null;
  deferralCount: number;
  items: OrderItem[];
  receiptConfirmation: { status: string; confirmedAt: string; notes: string | null } | null;
  tripOrders: {
    sequenceNumber: number;
    trip: {
      tripNumber: string;
      status: string;
      plannedDepartureTime: string | null;
      actualDepartureTime: string | null;
      vehicle: { registrationNumber: string; type: string; tempType: string };
      driver: { name: string; phone: string | null } | null;
    };
  }[];
  deliveries: {
    arrivedAt: string | null;
    completedAt: string | null;
    proofOfDelivery: {
      photoUrl: string | null;
      recipientName: string;
      notes: string | null;
    } | null;
  }[];
}
export interface OrderDraft {
  clientRequestId?: string;
  receivingInstructions?: string;
  category?: 'DAILY_REPLENISHMENT' | 'COLD_CHAIN' | 'DRY_GOODS';
  outletId: string;
  requestedDeliveryDate: string;
  items: { productId: string; quantity: number }[];
}
export interface ReceiptInput {
  proof?: ReceiptProof;
  dockTemperatureC?: number;
  signature: string;
  issue: 'NONE' | 'SHORTAGE' | 'DAMAGED' | 'INCORRECT';
  affectedItemId?: string;
  notes: string;
  received: { itemId: string; quantity: number }[];
}
export interface StoreService {
  draft(): Promise<OrderDraft | null>;
  saveDraft(input: OrderDraft): Promise<OrderDraft>;
  markBay(id: string, checks: boolean[]): Promise<StoreWorkflow['bay']>;
  respondDeferral(
    id: string,
    action: 'ACKNOWLEDGE' | 'ACCEPT',
    slotId?: string
  ): Promise<StoreWorkflow['deferralResponse']>;
  outlets(): Promise<Outlet[]>;
  catalog(): Promise<Product[]>;
  orders(): Promise<StoreOrder[]>;
  order(id: string): Promise<StoreOrder>;
  submit(input: OrderDraft): Promise<StoreOrder>;
  receipt(id: string, input: ReceiptInput): Promise<unknown>;
}
export function totals(items: { quantity: number; unitWeightKg: number; unitVolumeM3: number }[]) {
  return items.reduce(
    (sum, item) => ({
      units: sum.units + item.quantity,
      weight: sum.weight + item.quantity * item.unitWeightKg,
      volume: sum.volume + item.quantity * item.unitVolumeM3,
    }),
    { units: 0, weight: 0, volume: 0 }
  );
}
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export const deliveryDateKey = (value: string) =>
  value.length === 10
    ? value
    : new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export const dateLabel = (value: string) =>
  new Date(value.length === 10 ? value + 'T12:00:00+05:30' : value).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const timeLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending';
export const emptyWorkflow = (): StoreWorkflow => ({
  bay: null,
  slot: null,
  deferralResponse: null,
  receivingInstructions: '',
  category: 'DAILY_REPLENISHMENT',
  telemetry: null,
});
