import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useStoreOrder } from '../StoreContext';
import { Card, Feedback, FulfillmentStepper, StatusBadge } from '../components/OrderComponents';
import { PageTitle } from '../components/StoreShell';
import { dateLabel, timeLabel } from '../types';
export function Confirmation() {
  const { id = '' } = useParams();
  const query = useStoreOrder(id);
  const [copied, setCopied] = useState('');
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  return (
    <>
      <PageTitle title="Order Details" />
      <Card className="sm-center sm-confirmation">
        <CheckCircle2 size={52} className="sm-success-icon" />
        <span className="sm-badge sm-status-DELIVERED">Transmitted to fleet core</span>
        <h1>
          Order Submitted
          <br />
          Successfully
        </h1>
        <p className="sm-muted">
          Your replenishment order has been received and logged in Waypoint Delivery central
          planning.
        </p>
        <div className="sm-inset sm-row">
          <div className="sm-left">
            <small>Order Waybill ID</small>
            <strong className="sm-block">#{order.orderNumber}</strong>
          </div>
          <button
            className="sm-small-btn"
            onClick={() => {
              void navigator.clipboard.writeText(order.orderNumber).then(
                () => setCopied('Copied'),
                () => setCopied('Copy unavailable')
              );
            }}
          >
            <Copy size={13} />
            {copied || 'Copy'}
          </button>
        </div>
      </Card>
      <Card>
        <div className="sm-row">
          <h2>Order Specifications</h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="sm-inset">
          <small>Destination outlet</small>
          <strong className="sm-block">
            {order.outlet.name} (#{order.outlet.code})
          </strong>
          <p>{order.outlet.address}</p>
        </div>
        <div className="sm-inset">
          <small>Target delivery window</small>
          <strong className="sm-block">{dateLabel(order.requestedDeliveryDate)}</strong>
          <small>
            {order.outlet.deliveryWindowStart || 'Awaiting dispatch planning'} /{' '}
            {order.outlet.deliveryWindowEnd || 'TBC'}
          </small>
        </div>
        <div className="sm-two-col">
          <div>
            <small>Submitted at</small>
            <strong>{dateLabel(order.createdAt)}</strong>
            <small>{timeLabel(order.createdAt)}</small>
          </div>
          <div>
            <small>Manifest weight</small>
            <strong>{order.totalWeightKg.toFixed(0)} kg</strong>
            <small>{order.items.length} product lines</small>
          </div>
        </div>
        <div className="sm-divider" />
        <h2>Fulfillment Stepper</h2>
        <FulfillmentStepper order={order} vertical />
      </Card>
      <div className="sm-inset">
        <ShieldCheck size={18} />
        <strong>Order updates</strong>
        <p className="sm-muted">Track progress in My Orders. SMS alerts are not configured.</p>
      </div>
      <Link className="sm-btn" to={`/store/orders/${id}/track`}>
        Track Order Status
      </Link>
      <Link className="sm-btn sm-secondary" to="/store">
        Back to Dashboard
      </Link>
    </>
  );
}
