import React from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Clock, CheckCircle2, Snowflake } from 'lucide-react';
import { DriverStop } from '@waypoint/shared';
import { useDriver } from '../DriverContext';
export function Card({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={`driver-card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`driver-button ${props.className ?? ''}`}>
      {children}
    </button>
  );
}
export function ActionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link className="driver-button" to={to}>
      {children}
    </Link>
  );
}
export function time(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleTimeString('en-LK', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not provided';
}
export function StopCard({ stop }: { stop: DriverStop }) {
  const { trip, issues } = useDriver();
  const current = trip?.stops.find((s) => !s.completedAt)?.id === stop.id;
  const hasIssue = issues.some((i) => i.stopId === stop.id && !i.resolved);
  return (
    <Card
      className={`driver-stop-card ${stop.completedAt ? 'driver-stop-complete' : current ? 'driver-stop-current' : ''}`}
    >
      <div className="driver-row">
        <span className="driver-tag">
          STOP {stop.sequenceNumber} ·{' '}
          {stop.completedAt ? 'DELIVERED' : current ? 'NEXT STOP' : 'UPCOMING'}
        </span>
        {stop.completedAt ? (
          <CheckCircle2 size={17} className="driver-teal" />
        ) : (
          <Clock size={15} className="driver-blue" />
        )}
      </div>
      <h2>{stop.outlet.name}</h2>
      <p className="driver-stop-address">
        <MapPin size={12} />
        {stop.outlet.address}
      </p>
      <p className="driver-stop-window">
        <Clock size={12} /> Window: {stop.outlet.deliveryWindowStart ?? '—'} –{' '}
        {stop.outlet.deliveryWindowEnd ?? '—'}
      </p>
      {hasIssue && <p className="driver-warning">Open issue reported</p>}
      <div className="driver-stop-cargo">
        <strong>
          <Package size={13} />
          {stop.orderNumber}
        </strong>
        <span>
          {stop.items.length} SKUs · {stop.weightKg} kg
        </span>
      </div>
      <div className="driver-stop-footer">
        <span>
          {stop.completedAt
            ? `Completed · ${stop.outcome}`
            : current
              ? 'Ready for next delivery'
              : 'Planned corridor stop'}
        </span>
        <Link
          className={`driver-button ${current ? '' : 'secondary'}`}
          to={`/driver/stops/${stop.id}`}
        >
          Open Stop Details →
        </Link>
      </div>
    </Card>
  );
}
export function DataState({ children }: { children: React.ReactNode }) {
  const { trip, loading, online, error, refresh } = useDriver();
  if (!trip)
    return (
      <Card
        title={
          loading
            ? 'Loading your assigned trip…'
            : online
              ? 'No published trip available'
              : 'No route cached on this device'
        }
      >
        <p>
          {error ||
            (online
              ? 'Your dispatcher must assign a ready trip for today.'
              : 'Open your assigned route while online before working offline.')}
        </p>
        <Button onClick={() => void refresh()}>Try again</Button>
      </Card>
    );
  return <>{children}</>;
}
export function Manifest({ stop }: { stop: DriverStop }) {
  return (
    <Card className="driver-cargo-manifest">
      <div className="route-section-heading">
        <h2>
          <Package size={16} />
          Consignment {stop.orderNumber}
        </h2>
        <span>{stop.items.length} SKUs</span>
      </div>
      <p className="driver-muted">
        Verify the quantities and handling requirements before handover.
      </p>
      {stop.items.map((item) => (
        <div key={item.id} className="driver-manifest-item">
          <span className="driver-product-icon">
            {item.tempRequirement === 'AMBIENT' ? <Package size={19} /> : <Snowflake size={19} />}
          </span>
          <div>
            <strong>{item.productName}</strong>
            <small>
              {item.tempRequirement.replace(/_/g, ' ')} · {item.unitWeightKg} kg / unit
            </small>
          </div>
          <span className="driver-product-quantity">
            {item.quantity}
            <small>units</small>
          </span>
        </div>
      ))}
      <div className="driver-manifest-total">
        <span>Total consignment</span>
        <strong>
          {stop.weightKg} kg · {stop.items.reduce((sum, item) => sum + item.quantity, 0)} units
        </strong>
      </div>
    </Card>
  );
}

