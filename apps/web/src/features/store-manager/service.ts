import { ApiResponseSuccess } from '@waypoint/shared';
import { apiRequest } from '../../services/api';
import type { StoreService, Outlet, Product, StoreOrder, OrderDraft, StoreWorkflow } from './types';
import { mockStoreService } from './mock-service';
export const isStoreDemo = import.meta.env.DEV && import.meta.env.VITE_STORE_DEMO === 'true';
async function get<T>(path: string) {
  return (await apiRequest<ApiResponseSuccess<T>>(path)).data;
}
const liveService: StoreService = {
  draft: () => get<OrderDraft | null>('/orders/store/draft'),
  saveDraft: async (input) =>
    (
      await apiRequest<ApiResponseSuccess<OrderDraft>>('/orders/store/draft', {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    ).data,
  markBay: async (id, checks) =>
    (
      await apiRequest<ApiResponseSuccess<StoreWorkflow['bay']>>(
        `/orders/store/${encodeURIComponent(id)}/bay`,
        { method: 'POST', body: JSON.stringify({ checks }) }
      )
    ).data,
  respondDeferral: async (id, action, slotId) =>
    (
      await apiRequest<ApiResponseSuccess<StoreWorkflow['deferralResponse']>>(
        `/orders/store/${encodeURIComponent(id)}/deferral`,
        { method: 'POST', body: JSON.stringify({ action, slotId }) }
      )
    ).data,
  outlets: () => get<Outlet[]>('/orders/store/outlets'),
  catalog: () => get<Product[]>('/orders/store/catalog'),
  orders: () => get<StoreOrder[]>('/orders/store'),
  order: (id) => get<StoreOrder>(`/orders/store/${encodeURIComponent(id)}`),
  submit: async (input) =>
    (
      await apiRequest<ApiResponseSuccess<StoreOrder>>('/orders/store', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  receipt: (id, input) =>
    apiRequest(`/receipts/store/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
export const storeService: StoreService = isStoreDemo ? mockStoreService : liveService;
