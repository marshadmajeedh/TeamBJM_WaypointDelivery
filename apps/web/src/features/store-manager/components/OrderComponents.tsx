import { ReactNode } from 'react';
import { DeliveryMap } from './DeliveryMap';
import { Link } from 'react-router-dom';
import {
  Check,
  Clock,
  Package,
  Snowflake,
  Truck,
  Leaf,
  ArrowRight,
  Thermometer,
} from 'lucide-react';
import type { OrderStatusType } from '@waypoint/shared';
import { OrderItem, StoreOrder, totals, dateLabel } from '../types';
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'sm-card ' + className}>{children}</section>;
}
export function Feedback({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div className="sm-empty" role="status">
        Loading your store...
      </div>
    );
  if (error)
    return (
      <div className="sm-error" role="alert">
        <strong>We could not load this information.</strong>
        <p>{error.message}</p>
        {retry && (
          <button className="sm-btn sm-secondary" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return null;
}
export const statusLabels: Record<OrderStatusType, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Awaiting Planning',
  PLANNED: 'Planned',
  DEFERRED: 'Deferred',
  LOADING: 'Loading',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  PARTIAL: 'Receipt Exception',
  FAILED: 'Failed',
};
export function StatusBadge({ status }: { status: OrderStatusType }) {
  return <span className={'sm-badge sm-status-' + status}> {statusLabels[status]}</span>;
}
export function TemperatureBadge({ value }: { value: string }) {
  return (
    <span className={'sm-badge sm-temp-' + value}>
      {value === 'CHILLED' ? 'Chilled 2-4 C' : value === 'FROZEN' ? 'Frozen -18 C' : 'Ambient'}
    </span>
  );
}
export function OrderCard({ order, compact = false }: { order: StoreOrder; compact?: boolean }) {
  const destination =
    order.status === 'DEFERRED'
      ? 'deferred'
      : ['DELIVERED', 'PARTIAL'].includes(order.status)
        ? 'receipt'
        : 'track';
  return (
    <article className={'sm-order-card ' + (compact ? 'sm-compact' : '')}>
      <div className="sm-row">
        <strong>#{order.orderNumber}</strong>
        <StatusBadge status={order.status} />
      </div>
      <p className="sm-muted">
        {order.items.length} SKUs / {order.outlet.name}
      </p>
      <div className={order.status === 'DEFERRED' ? 'sm-inset sm-warning' : 'sm-inset'}>
        <p>
          <Clock size={13} /> {dateLabel(order.requestedDeliveryDate)} /{' '}
          {order.outlet.deliveryWindowStart || 'Delivery window pending'}
        </p>
        {!compact && (
          <p>
            <Package size={13} /> {totals(order.items).units} units /{' '}
            {order.totalWeightKg.toFixed(0)} kg
          </p>
        )}
        {order.status === 'DEFERRED' && (
          <p>{order.deferralReason || 'Dispatch is reviewing your delivery slot.'}</p>
        )}
      </div>
      <div className="sm-row">
        <small className="sm-muted">
          {order.receiptConfirmation
            ? 'Receipt confirmed'
            : order.status === 'CONFIRMED'
              ? 'Allocation pending'
              : 'Store replenishment'}
        </small>
        <Link
          className="sm-small-btn"
          to={
            order.status === 'CONFIRMED'
              ? `/store/orders/${order.id}`
              : `/store/orders/${order.id}/${destination}`
          }
        >
          {destination === 'deferred'
            ? 'View Notice'
            : destination === 'receipt'
              ? 'Receipt'
              : order.status === 'CONFIRMED'
                ? 'View Order'
                : 'Track Order'}{' '}
          <ArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}
export function ProductItemCard({
  item,
  pack,
  controls,
}: {
  item: OrderItem;
  pack?: string;
  controls?: ReactNode;
}) {
  const Icon =
    item.tempRequirement === 'AMBIENT'
      ? Leaf
      : item.tempRequirement === 'FROZEN'
        ? Snowflake
        : Package;
  return (
    <article className="sm-product">
      <div className="sm-product-top">
        <span className={'sm-product-icon sm-temp-' + item.tempRequirement}>
          <Icon size={25} />
        </span>
        <div>
          <TemperatureBadge value={item.tempRequirement} />
          <h3>{item.productName}</h3>
          <p className="sm-muted">{pack || 'Manifest line item'}</p>
        </div>
      </div>
      <div className="sm-inset sm-row">
        <div>
          <strong>
            {(item.unitWeightKg * item.quantity).toFixed(1)} kg /{' '}
            {(item.unitVolumeM3 * item.quantity).toFixed(2)} m3
          </strong>
          <small className="sm-muted sm-block">{item.quantity} units</small>
        </div>
        {controls}
      </div>
    </article>
  );
}
export function PayloadSummary({ items, dark = false }: { items: OrderItem[]; dark?: boolean }) {
  const sum = totals(items);
  const temperatures = ['AMBIENT', 'CHILLED', 'FROZEN'];
  return (
    <Card className={dark ? 'sm-payload sm-dark' : 'sm-payload'}>
      <div className="sm-row">
        <span className="sm-eyebrow">Payload manifest summary</span>
        <span className="sm-badge">{items.length} line items</span>
      </div>
      <div className="sm-metrics">
        <div>
          <small>Total units</small>
          <strong>{sum.units}</strong>
        </div>
        <div>
          <small>Gross weight</small>
          <strong>
            {sum.weight.toFixed(0)} <em>kg</em>
          </strong>
        </div>
        <div>
          <small>Est. volume</small>
          <strong>
            {sum.volume.toFixed(2)} <em>m3</em>
          </strong>
        </div>
      </div>
      <div className="sm-divider" />
      <small>
        Cold-chain split - {new Set(items.map((item) => item.tempRequirement)).size} compartments
      </small>
      <div className="sm-split">
        {temperatures.map((temp) => (
          <span key={temp}>
            {temp.toLowerCase()}{' '}
            {totals(items.filter((item) => item.tempRequirement === temp)).weight.toFixed(0)}kg
          </span>
        ))}
      </div>
    </Card>
  );
}
export function FulfillmentStepper({
  order,
  vertical = false,
}: {
  order: StoreOrder;
  vertical?: boolean;
}) {
  const active = ['DELIVERED', 'PARTIAL'].includes(order.status)
    ? 4
    : order.status === 'IN_TRANSIT'
      ? 3
      : order.status === 'LOADING'
        ? 2
        : order.status === 'PLANNED'
          ? 1
          : 0;
  return (
    <div className={vertical ? 'sm-steps sm-steps-vertical' : 'sm-steps'}>
      {['Confirmed', 'Planned', 'Loaded', 'Out for Delivery', 'Delivered'].map((label, index) => (
        <div key={label} className={index <= active ? 'sm-step done' : 'sm-step'}>
          <span>
            {index < active ? (
              <Check size={13} />
            ) : index === 3 ? (
              <Truck size={13} />
            ) : (
              <Clock size={13} />
            )}
          </span>
          <small>{label}</small>
          {vertical && (
            <small className="sm-muted">
              {index < active ? 'Complete' : index === active ? 'Current stage' : 'Pending'}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}
export function RoutePreview({ order }: { order: StoreOrder }) {
  return <DeliveryMap order={order} />;
}
export function DispatchContact({ order }: { order: StoreOrder }) {
  return order.outlet.contactPhone ? (
    <a className="sm-btn sm-secondary" href={'tel:' + order.outlet.contactPhone}>
      Call outlet / dispatch contact
    </a>
  ) : (
    <p className="sm-muted sm-center">Dispatch contact not configured for this outlet.</p>
  );
}
export function TemperatureNotice() {
  return (
    <div className="sm-inset sm-warning">
      <strong>
        <Thermometer size={16} /> Temperature Controlled Dispatch
      </strong>
      <p>
        Keep chilled, frozen and ambient goods separated. Verify temperatures and quantities at
        receiving.
      </p>
    </div>
  );
}
