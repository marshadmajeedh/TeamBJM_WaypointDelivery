import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { UserRole } from '@waypoint/shared';
import { StoreManagerPortal } from './StoreManagerPortal';
import { ReceivingBayModal } from './components/ReceivingBayModal';
import { deliveryDateKey } from './types';
import { mockStoreService } from './mock-service';
import { storeService } from './service';
vi.mock('./service', async () => {
  const { mockStoreService } = await import('./mock-service');
  return { isStoreDemo: true, storeService: mockStoreService };
});
afterEach(cleanup);
beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('waypoint_token', 'test-session');
  sessionStorage.setItem(
    'waypoint_user',
    JSON.stringify({
      id: 'manager',
      email: 'manager@example.test',
      role: UserRole.STORE_MANAGER,
      name: 'Mahesh',
    })
  );
});
function renderPage(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/store/*" element={<StoreManagerPortal />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
describe('Store workflow', () => {
  it('requires all bay checks and supports Escape', async () => {
    const order = await mockStoreService.order('9421');
    const close = vi.fn();
    const ready = vi.fn();
    render(<ReceivingBayModal order={order} onClose={close} onReady={ready} />);
    const button = screen.getByRole('button', { name: /Mark Bay Ready/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    screen.getAllByRole('checkbox').forEach((checkbox) => fireEvent.click(checkbox));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(ready).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
  it('prevents an empty order and carries quantities into review', async () => {
    renderPage('/store/orders/new');
    await screen.findByText('Create New Order');
    fireEvent.click(screen.getByRole('button', { name: /Review Order/ }));
    expect(await screen.findByText('Choose an outlet and add at least one item.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Add one Highland Fresh Full Cream Milk' }));
    const draft = JSON.parse(sessionStorage.getItem('waypoint.store.draft.manager')!);
    expect(draft.items).toEqual([{ productId: 'milk', quantity: 1 }]);
  });
  it('filters orders by status and search', async () => {
    renderPage('/store/orders');
    await screen.findByText('My Orders', { selector: 'h1' });
    fireEvent.click(await screen.findByRole('button', { name: /Deferred/ }));
    expect(screen.getByText('#ORD-9380')).toBeDefined();
    expect(screen.queryByText('#ORD-9421')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search orders' }), {
      target: { value: 'not-an-order' },
    });
    expect(screen.getByText('No matching orders')).toBeDefined();
  });
  it('submits a reviewed draft and displays confirmation', async () => {
    sessionStorage.setItem(
      'waypoint.store.draft.manager',
      JSON.stringify({
        outletId: 'demo-outlet',
        requestedDeliveryDate: '2099-12-01',
        items: [{ productId: 'milk', quantity: 2 }],
      })
    );
    const spy = vi.spyOn(storeService, 'submit');
    renderPage('/store/orders/review');
    await screen.findByText('Review Order', { selector: 'h1' });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Order/ }));
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect(JSON.parse(sessionStorage.getItem('waypoint.store.draft.manager')!).items).toEqual([]);
    spy.mockRestore();
  });
  it('opens a modal over tracking without replacing the page', async () => {
    renderPage('/store/orders/9421/track');
    fireEvent.click(await screen.findByRole('button', { name: /Prepare Receiving Bay/ }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Track Order' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

it('keeps Sri Lanka midnight deliveries on the requested date', () => {
  expect(deliveryDateKey('2026-10-01T18:30:00.000Z')).toBe('2026-10-02');
});
it('saves a draft to the service and restores it on a new device session', async () => {
  await mockStoreService.saveDraft({
    outletId: 'demo-outlet',
    requestedDeliveryDate: '2099-12-01',
    items: [{ productId: 'milk', quantity: 7 }],
  });
  renderPage('/store/orders/new');
  const quantity = await screen.findByRole('spinbutton', {
    name: 'Highland Fresh Full Cream Milk quantity',
  });
  await waitFor(() => expect((quantity as HTMLInputElement).value).toBe('7'));
});
it('accepts a revised slot and keeps that response after refetch', async () => {
  renderPage('/store/orders/9380/deferred');
  fireEvent.click(await screen.findByRole('button', { name: 'Acknowledge & Accept Slot' }));
  await screen.findByRole('button', { name: 'Slot Accepted' });
  expect((await storeService.order('9380')).workflow?.deferralResponse?.action).toBe('ACCEPT');
});
