import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coordinates } from '../../../services/map-coordinates';
import { StoreOrder, timeLabel } from '../types';
import { apiRequest } from '../../../services/api';

export function DeliveryMap({ order }: { order: StoreOrder }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const [tileError, setTileError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState<{ outletId: string; position: [number, number] } | null>(null);
  const pickLocation = useRef<((position: L.LatLng) => void) | null>(null);
  pickLocation.current = editing
    ? (position) => {
        setLatitude(position.lat.toFixed(6));
        setLongitude(position.lng.toFixed(6));
      }
    : null;
  const outlet =
    saved?.outletId === order.outletId
      ? saved.position
      : coordinates(order.outlet.latitude, order.outlet.longitude);
  const telemetry = order.workflow?.telemetry;
  const vehicle =
    telemetry && !telemetry.stale ? coordinates(telemetry.latitude, telemetry.longitude) : null;

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false });
    map.current = instance;
    instance.on('click', (event: L.LeafletMouseEvent) => pickLocation.current?.(event.latlng));
    // Regional overview only; no invented outlet or vehicle position.
    instance.setView([7.8731, 80.7718], 7);
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    layer.on('tileerror', () => setTileError(true));
    layer.on('tileload', () => setTileError(false));
    layer.addTo(instance);
    tiles.current = layer;
    const resize =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => instance.invalidateSize())
        : null;
    resize?.observe(container.current);
    return () => {
      resize?.disconnect();
      layer.off();
      instance.remove();
      map.current = null;
      tiles.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers: L.Marker[] = [];
    const addMarker = (position: [number, number], text: string, title: string, kind: string) => {
      const label = document.createElement('span');
      label.className = `sm-map-marker sm-map-marker-${kind}`;
      label.textContent = text;
      const marker = L.marker(position, {
        title,
        icon: L.divIcon({
          html: label,
          className: 'sm-leaflet-pin',
          iconSize: [76, 32],
          iconAnchor: [38, 32],
        }),
      }).addTo(instance);
      const popup = document.createElement('span');
      popup.textContent = title;
      marker.bindPopup(popup);
      markers.push(marker);
    };
    if (outlet) addMarker(outlet, 'Store', order.outlet.name, 'store');
    if (vehicle) addMarker(vehicle, 'Vehicle', 'Latest delivery vehicle location', 'vehicle');
    const positions = [outlet, vehicle].filter((position) => position !== null);
    if (positions.length > 1)
      instance.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 15 });
    else if (positions.length) instance.setView(positions[0], 14);
    else instance.setView([7.8731, 80.7718], 7);
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [outlet?.[0], outlet?.[1], vehicle?.[0], vehicle?.[1], order.outlet.name]);

  const storeLink = outlet
    ? `https://www.openstreetmap.org/?mlat=${outlet[0]}&mlon=${outlet[1]}#map=16/${outlet[0]}/${outlet[1]}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${order.outlet.name}, ${order.outlet.address}`)}`;
  return (
    <div className="sm-route sm-delivery-map">
      <div className="sm-row">
        <strong>Delivery location</strong>
        <small>
          {vehicle ? 'Latest GPS update' : outlet ? 'Store destination' : 'Sri Lanka overview'}
        </small>
      </div>
      <div className="sm-map-frame">
        <div ref={container} className="sm-location-map" aria-label="Delivery location map" />
      </div>
      {tileError && (
        <div className="sm-inset sm-warning" role="status">
          Map tiles could not load. Check your connection.
          <button
            className="sm-small-btn"
            onClick={() => {
              setTileError(false);
              tiles.current?.redraw();
            }}
          >
            Retry map
          </button>
        </div>
      )}
      <p className="sm-muted">
        {vehicle && telemetry
          ? `Vehicle updated at ${timeLabel(telemetry.capturedAt)}. Refreshes every 30 seconds.`
          : telemetry?.stale
            ? 'Vehicle GPS update is stale. Awaiting a fresh location.'
            : 'Live vehicle location pending.'}
      </p>
      {!outlet && <p className="sm-muted">Store coordinates unavailable. No store pin is shown.</p>}
      <p>
        <button
          className="sm-small-btn"
          onClick={() => {
            setLatitude(outlet ? String(outlet[0]) : '');
            setLongitude(outlet ? String(outlet[1]) : '');
            setSaveError('');
            setEditing(true);
          }}
        >
          Set store location
        </button>
      </p>
      {editing && (
        <form
          className="sm-inset"
          onSubmit={async (event) => {
            event.preventDefault();
            const position =
              latitude.trim() && longitude.trim()
                ? coordinates(Number(latitude), Number(longitude))
                : null;
            if (!position) {
              setSaveError('Enter valid latitude and longitude.');
              return;
            }
            setSaving(true);
            setSaveError('');
            try {
              await apiRequest(`/orders/store/${encodeURIComponent(order.id)}/location`, {
                method: 'PUT',
                body: JSON.stringify({ latitude: position[0], longitude: position[1] }),
              });
              setSaved({ outletId: order.outletId, position });
              setEditing(false);
            } catch (error) {
              setSaveError(
                error instanceof Error ? error.message : 'Could not save store location.'
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <strong>{order.outlet.name}</strong>
          <p>{order.outlet.address}</p>
          <p>
            Zoom in and click your store on the map, or enter its coordinates. This updates the
            outlet for all its orders.
          </p>
          <div className="sm-two-col">
            <label>
              Latitude
              <input
                aria-label="Store latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                required
                value={latitude}
                disabled={saving}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                aria-label="Store longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                required
                value={longitude}
                disabled={saving}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </label>
          </div>
          {saveError && <p role="alert">{saveError}</p>}
          <div className="sm-actions">
            <button className="sm-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save store location'}
            </button>
            <button
              className="sm-small-btn"
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <a className="sm-small-btn" href={storeLink} target="_blank" rel="noreferrer">
        Open store in OpenStreetMap
      </a>
    </div>
  );
}
