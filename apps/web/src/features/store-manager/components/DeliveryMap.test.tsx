import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as api from '../../../services/api';
import { DeliveryMap } from './DeliveryMap';
import { mockStoreService } from '../mock-service';
import { emptyWorkflow } from '../types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('saves chosen store coordinates and immediately shows the persisted store pin', async () => {
  const order = await mockStoreService.order('9421');
  order.outlet = { ...order.outlet, latitude: null, longitude: null };
  order.workflow = emptyWorkflow();
  const save = vi.spyOn(api, 'apiRequest').mockResolvedValue({});
  render(<DeliveryMap order={order} />);
  fireEvent.click(screen.getByRole('button', { name: 'Set store location' }));
  fireEvent.change(screen.getByLabelText('Store latitude'), { target: { value: '6.9' } });
  fireEvent.change(screen.getByLabelText('Store longitude'), { target: { value: '79.8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save store location' }));
  await waitFor(() => expect(screen.queryByLabelText('Store latitude')).toBeNull());
  expect(save).toHaveBeenCalledWith(`/orders/store/${order.id}/location`, {
    method: 'PUT',
    body: JSON.stringify({ latitude: 6.9, longitude: 79.8 }),
  });
  expect(screen.getByTitle(order.outlet.name)).toBeDefined();
});

it('renders a regional map without inventing a store pin when coordinates are missing', async () => {
  const order = await mockStoreService.order('9421');
  order.outlet = { ...order.outlet, latitude: null, longitude: null };
  order.workflow = emptyWorkflow();
  render(
    <StrictMode>
      <DeliveryMap order={order} />
    </StrictMode>
  );
  expect(screen.getByText('Sri Lanka overview')).toBeDefined();
  expect(screen.getByText('Store coordinates unavailable. No store pin is shown.')).toBeDefined();
  expect(screen.getByRole('link', { name: 'OpenStreetMap' }).getAttribute('href')).toContain(
    '/copyright'
  );
  expect(
    screen.getByRole('link', { name: 'Open store in OpenStreetMap' }).getAttribute('href')
  ).toContain('/search?query=');
  expect(document.querySelectorAll('.sm-leaflet-pin').length).toBe(0);
});

it('updates the vehicle location and removes its marker when GPS becomes stale', async () => {
  const order = await mockStoreService.order('9421');
  order.outlet = { ...order.outlet, latitude: 6.9, longitude: 79.8 };
  order.workflow = {
    ...emptyWorkflow(),
    telemetry: {
      capturedAt: new Date().toISOString(),
      latitude: 6.91,
      longitude: 79.81,
      eta: null,
      chilledC: null,
      frozenC: null,
      stopsAway: null,
      stale: false,
    },
  };
  const { rerender } = render(<DeliveryMap order={order} />);
  expect(document.querySelectorAll('.sm-leaflet-pin').length).toBe(2);
  expect(screen.getByTitle('Latest delivery vehicle location')).toBeDefined();
  const previous = screen.getByTitle('Latest delivery vehicle location');
  order.workflow.telemetry!.latitude = 6.92;
  rerender(<DeliveryMap order={{ ...order }} />);
  expect(previous.isConnected).toBe(false);
  expect(screen.getByTitle('Latest delivery vehicle location')).toBeDefined();
  order.workflow.telemetry!.stale = true;
  rerender(<DeliveryMap order={{ ...order }} />);
  expect(document.querySelectorAll('.sm-leaflet-pin').length).toBe(1);
  expect(screen.queryByTitle('Latest delivery vehicle location')).toBeNull();
  expect(screen.getByText(/Vehicle GPS update is stale/)).toBeDefined();
});
