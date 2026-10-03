import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Package, MapPin, Clock, ChevronRight } from 'lucide-react';
import type { DriverStop } from '@waypoint/shared';
export function DriverPageHeading({
  title,
  subtitle,
  back = '/driver',
  step,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  step?: number;
}) {
  return (
    <>
      <div className="driver-page-heading">
        <Link to={back} aria-label="Go back">
          <ArrowLeft size={19} />
        </Link>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {step && (
        <ol className="driver-flow-steps" aria-label="Delivery steps">
          {['Stop details', 'Outcome', 'Proof'].map((label, index) => (
            <li
              key={label}
              className={index + 1 === step ? 'current' : index + 1 < step ? 'done' : ''}
            >
              <span>{index + 1 < step ? <Check size={12} /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
export function StopIdentity({ stop }: { stop: DriverStop }) {
  return (
    <section className="driver-stop-identity">
      <span className="driver-tag">
        STOP {stop.sequenceNumber} · {stop.orderNumber}
      </span>
      <h2>{stop.outlet.name}</h2>
      <p>
        <MapPin size={13} />
        {stop.outlet.address}
      </p>
      <div>
        <span>
          <Clock size={13} />
          {stop.outlet.deliveryWindowStart ?? 'Not set'} –{' '}
          {stop.outlet.deliveryWindowEnd ?? 'Not set'}
        </span>
        <span>
          <Package size={13} />
          {stop.items.length} SKUs · {stop.weightKg} kg
        </span>
      </div>
    </section>
  );
}
export function ScreenLink({
  to,
  code,
  title,
  detail,
}: {
  to: string;
  code: string;
  title: string;
  detail: string;
}) {
  return (
    <Link className="driver-screen-link" to={to}>
      <span>{code}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight size={17} />
    </Link>
  );
}
