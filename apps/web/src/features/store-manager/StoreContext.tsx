import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { OrderDraft, today } from './types';
import { storeService } from './service';
function blankDraft(): OrderDraft {
  return {
    clientRequestId: crypto.randomUUID(),
    outletId: '',
    requestedDeliveryDate: today(),
    category: 'DAILY_REPLENISHMENT',
    receivingInstructions: '',
    items: [],
  };
}
function readDraft(key: string): OrderDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (
      value &&
      typeof value.outletId === 'string' &&
      typeof value.requestedDeliveryDate === 'string' &&
      Array.isArray(value.items) &&
      value.items.every(
        (item: { productId?: unknown; quantity?: unknown }) =>
          typeof item.productId === 'string' && Number.isInteger(item.quantity)
      )
    )
      return { ...blankDraft(), ...value };
  } catch {
    /* Recover with a clean draft. */
  }
  return blankDraft();
}
const Context = createContext<{
  draft: OrderDraft;
  setDraft: (draft: OrderDraft) => void;
  clearDraft: () => void;
  saveDraft: (draft: OrderDraft) => Promise<void>;
  savingDraft: boolean;
  draftLoading: boolean;
  draftError: Error | null;
  activeOutletId: string;
  selectOutlet: (id: string) => void;
} | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = 'waypoint.store.draft.' + user?.id;
  const [draft, updateDraft] = useState(() => readDraft(key));
  const [activeOutletId, selectOutlet] = useState('');
  const restored = useRef(false);
  const edited = useRef(draft.items.length > 0);
  const remote = useQuery({
    queryKey: ['store', user?.id, 'draft'],
    queryFn: () => storeService.draft(),
    staleTime: 0,
    retry: false,
  });
  const persist = (value: OrderDraft) => {
    updateDraft(value);
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* In-memory editing remains available. */
    }
  };
  useEffect(() => {
    if (!restored.current && remote.isSuccess) {
      restored.current = true;
      if (!edited.current && remote.data) {
        updateDraft(remote.data);
        try {
          sessionStorage.setItem(key, JSON.stringify(remote.data));
        } catch {
          /* Keep loaded server draft in memory. */
        }
      }
    }
  }, [remote.data, remote.isSuccess, key]);
  const save = useMutation({
    mutationFn: (value: OrderDraft) => storeService.saveDraft(value),
    onSuccess: (value) => client.setQueryData(['store', user?.id, 'draft'], value),
  });
  const setDraft = (value: OrderDraft) => {
    edited.current = true;
    persist(value);
  };
  return (
    <Context.Provider
      value={{
        draft,
        setDraft,
        clearDraft: () => {
          edited.current = true;
          persist(blankDraft());
          client.setQueryData(['store', user?.id, 'draft'], null);
        },
        saveDraft: async (value) => {
          setDraft(value);
          await save.mutateAsync(value);
        },
        savingDraft: save.isPending,
        draftLoading: remote.isPending && !draft.items.length,
        draftError: remote.error,
        activeOutletId,
        selectOutlet,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDraft() {
  const context = useContext(Context);
  if (!context) throw new Error('StoreProvider missing');
  return context;
}
export function useStoreData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['store', user?.id, 'data'],
    queryFn: async () => {
      const [orders, outlets, catalog] = await Promise.all([
        storeService.orders(),
        storeService.outlets(),
        storeService.catalog(),
      ]);
      return { orders, outlets, catalog };
    },
    refetchInterval: 30000,
  });
}
export function useStoreOrder(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['store', user?.id, 'order', id],
    queryFn: () => storeService.order(id),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });
}
