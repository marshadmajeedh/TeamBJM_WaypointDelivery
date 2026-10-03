// Explicit development adapter only; never enabled by an API failure or in production.
import {
  StoreService,
  StoreOrder,
  Product,
  OrderDraft,
  emptyWorkflow,
  totals,
  today,
} from './types';
const outlet = {
  id: 'demo-outlet',
  code: '104',
  name: 'Waypoint Fresh - Nugegoda',
  address: 'High-Level Rd, Nugegoda, Western Province',
  deliveryWindowStart: '06:30',
  deliveryWindowEnd: '08:30',
};
const catalog: Product[] = [
  {
    id: 'milk',
    productName: 'Highland Fresh Full Cream Milk',
    pack: 'Crate containing 12 x 1L',
    unitWeightKg: 185 / 15,
    unitVolumeM3: 0.28 / 15,
    tempRequirement: 'CHILLED',
  },
  {
    id: 'chicken',
    productName: 'Keells Prime Chicken Breast',
    pack: 'Vacuum packed - 15kg carton',
    unitWeightKg: 15,
    unitVolumeM3: 0.18 / 8,
    tempRequirement: 'FROZEN',
  },
  {
    id: 'carrots',
    productName: 'Nuwara Eliya Fresh Carrots',
    pack: 'Commercial grade A - 10kg bag',
    unitWeightKg: 10,
    unitVolumeM3: 0.35 / 20,
    tempRequirement: 'AMBIENT',
  },
];
const base: StoreOrder = {
  id: '9421',
  orderNumber: 'ORD-9421',
  status: 'IN_TRANSIT',
  outletId: outlet.id,
  outlet,
  requestedDeliveryDate: today(),
  createdAt: new Date().toISOString(),
  totalWeightKg: 505,
  totalVolumeM3: 0.81,
  deferralReason: null,
  deferralCount: 0,
  items: catalog.map((product, index) => ({ ...product, quantity: [15, 8, 20][index] })),
  receiptConfirmation: null,
  tripOrders: [
    {
      sequenceNumber: 3,
      trip: {
        tripNumber: 'DSP-401',
        status: 'IN_TRANSIT',
        plannedDepartureTime: today() + 'T06:10:00',
        actualDepartureTime: today() + 'T06:15:00',
        vehicle: { registrationNumber: 'WP-CAD-8821', type: 'TRUCK', tempType: 'REEFER' },
        driver: { name: 'Sunimal Silva', phone: null },
      },
    },
  ],
  deliveries: [],
};
const initialOrders: StoreOrder[] = [
  base,
  {
    ...base,
    id: '9380',
    orderNumber: 'ORD-9380',
    status: 'DEFERRED',
    tripOrders: [],
    deferralCount: 1,
    deferralReason:
      'Refrigerated fleet thermal maintenance hold. Awaiting a revised dispatch slot.',
  },
  { ...base, id: '9462', orderNumber: 'ORD-9462', status: 'CONFIRMED', tripOrders: [] },
  {
    ...base,
    id: '9310',
    orderNumber: 'ORD-9310',
    status: 'DELIVERED',
    deliveries: [
      {
        arrivedAt: today() + 'T07:15:00',
        completedAt: today() + 'T07:22:00',
        proofOfDelivery: null,
      },
    ],
  },
];
function storageKey(kind: string) {
  const user = JSON.parse(sessionStorage.getItem('waypoint_user') || '{}');
  return `waypoint.store.demo.${user.id || 'guest'}.${kind}`;
}
function loadOrders(): StoreOrder[] {
  const saved = sessionStorage.getItem(storageKey('orders'));
  return saved
    ? JSON.parse(saved)
    : structuredClone(initialOrders).map((order) => ({
        ...order,
        workflow: {
          ...emptyWorkflow(),
          slot:
            order.status === 'DEFERRED'
              ? {
                  id: 'sample-slot-1',
                  deferralCount: order.deferralCount,
                  start: new Date(Date.now() + 86400000).toISOString(),
                  end: new Date(Date.now() + 90000000).toISOString(),
                  publishedAt: new Date().toISOString(),
                }
              : null,
        },
      }));
}
function saveOrders(orders: StoreOrder[]) {
  sessionStorage.setItem(storageKey('orders'), JSON.stringify(orders));
}
export const mockStoreService: StoreService = {
  draft: async () =>
    JSON.parse(sessionStorage.getItem(storageKey('draft')) || 'null') as OrderDraft | null,
  saveDraft: async (input) => {
    sessionStorage.setItem(storageKey('draft'), JSON.stringify(input));
    return input;
  },
  outlets: async () => [outlet],
  catalog: async () => catalog,
  orders: async () => loadOrders(),
  order: async (id) => {
    const order = loadOrders().find((order) => order.id === id);
    if (!order) throw new Error('Order not found');
    return order;
  },
  submit: async (input) => {
    const orders = loadOrders();
    const id = input.clientRequestId || crypto.randomUUID();
    const previous = orders.find((order) => order.id === id);
    if (previous) return previous;
    const items = input.items.map((item) => ({
      ...catalog.find((product) => product.id === item.productId)!,
      quantity: item.quantity,
    }));
    const sum = totals(items);
    const order: StoreOrder = {
      ...base,
      id,
      orderNumber: 'ORD-' + id.slice(0, 8).toUpperCase(),
      status: 'CONFIRMED',
      requestedDeliveryDate: input.requestedDeliveryDate,
      createdAt: new Date().toISOString(),
      items,
      totalWeightKg: sum.weight,
      totalVolumeM3: sum.volume,
      tripOrders: [],
      deliveries: [],
      workflow: {
        ...emptyWorkflow(),
        category: input.category || 'DAILY_REPLENISHMENT',
        receivingInstructions: input.receivingInstructions || '',
      },
    };
    saveOrders([order, ...orders]);
    sessionStorage.removeItem(storageKey('draft'));
    return order;
  },
  receipt: async (id, input) => {
    const orders = loadOrders();
    const order = orders.find((order) => order.id === id);
    if (!order || order.receiptConfirmation)
      throw new Error('Receipt unavailable or already confirmed');
    saveOrders(
      orders.map((order) =>
        order.id !== id
          ? order
          : {
              ...order,
              status: input.issue === 'NONE' ? 'DELIVERED' : 'PARTIAL',
              receiptConfirmation: {
                status: input.issue === 'NONE' ? 'COMPLETE' : 'EXCEPTION',
                confirmedAt: new Date().toISOString(),
                notes: JSON.stringify(input),
              },
            }
      )
    );
  },
  markBay: async (id, checks) => {
    if (checks.length !== 5 || !checks.every(Boolean)) throw new Error('Complete every bay check');
    const order = await mockStoreService.order(id);
    const bay = {
      bayNumber: '02' as const,
      checks,
      readyAt: new Date().toISOString(),
      userId: 'demo-manager',
    };
    saveOrders(
      loadOrders().map((value) =>
        value.id === id
          ? { ...order, workflow: { ...emptyWorkflow(), ...order.workflow, bay } }
          : value
      )
    );
    return bay;
  },
  respondDeferral: async (id, action, slotId) => {
    const order = await mockStoreService.order(id);
    if (action === 'ACCEPT' && order.workflow?.slot?.id !== slotId)
      throw new Error('Delivery slot changed');
    const deferralResponse = {
      action,
      slotId: slotId || null,
      deferralCount: order.deferralCount,
      respondedAt: new Date().toISOString(),
      userId: 'demo-manager',
    };
    saveOrders(
      loadOrders().map((value) =>
        value.id === id
          ? { ...order, workflow: { ...emptyWorkflow(), ...order.workflow, deferralResponse } }
          : value
      )
    );
    return deferralResponse;
  },
};
