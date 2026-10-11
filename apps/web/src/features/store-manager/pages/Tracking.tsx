import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Truck, Clock, CheckCircle, Thermometer } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { storeService } from '../service';
import { useStoreOrder } from '../StoreContext';
import {
  Card,
  Feedback,
  FulfillmentStepper,
  RoutePreview,
  StatusBadge,
} from '../components/OrderComponents';
import { PageTitle } from '../components/StoreShell';
import { ReceivingBayModal } from '../components/ReceivingBayModal';
import { dateLabel, timeLabel } from '../types';
export function Tracking() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const query = useStoreOrder(id);
  const [modal, setModal] = useState(false);
  const close = useCallback(() => setModal(false), []);
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  const ready = Boolean(order.workflow?.bay);
  const telemetry = order.workflow?.telemetry;
  const live = telemetry && !telemetry.stale ? telemetry : null;
  const trip = order.tripOrders[0]?.trip;
  const delivery = order.deliveries[0];
  const events = [
    {
      label: 'Order received by planning',
      time: order.createdAt,
      detail: 'Replenishment manifest submitted.',
    },
    ...(trip?.plannedDepartureTime
      ? [
          {
            label: 'Dispatch departure planned',
            time: trip.plannedDepartureTime,
            detail: trip.tripNumber,
          },
        ]
      : []),
    ...(trip?.actualDepartureTime
      ? [
          {
            label: 'Departed distribution centre',
            time: trip.actualDepartureTime,
            detail: trip.vehicle.registrationNumber,
          },
        ]
      : []),
    ...(delivery?.arrivedAt
      ? [{ label: 'Arrived at outlet', time: delivery.arrivedAt, detail: order.outlet.name }]
      : []),
    ...(order.receiptConfirmation
      ? [
          {
            label: 'Receipt confirmed',
            time: order.receiptConfirmation.confirmedAt,
            detail: order.receiptConfirmation.status,
          },
        ]
      : []),
  ].sort((a, b) => b.time.localeCompare(a.time));
  return (
    <>
      <PageTitle
        title="Track Order"
        subtitle="Live logistics"
        back="/store/orders"
        aside={<span className="sm-badge">#{order.orderNumber}</span>}
      />
      <Card className="sm-tracking-progress">
        <FulfillmentStepper order={order} />
      </Card>
      {order.status === 'DEFERRED' && (
        <Link className="sm-inset sm-warning sm-block" to={`/store/orders/${id}/deferred`}>
          Delivery deferred / View updated notice &rarr;
        </Link>
      )}
      <Card className="sm-arriving">
        <div className="sm-row">
          <span className="sm-eyebrow">Estimated window</span>
          <StatusBadge status={order.status} />
        </div>
        <h1 className="sm-eta">
          {live?.eta ? timeLabel(live.eta) : order.outlet.deliveryWindowStart || 'ETA pending'}
        </h1>
        <p className="sm-muted">
          {dateLabel(order.requestedDeliveryDate)}
          {order.outlet.deliveryWindowEnd && ' - until ' + order.outlet.deliveryWindowEnd}
        </p>
        <div className="sm-inset">
          <Clock size={15} />{' '}
          {live
            ? `Live update at ${timeLabel(live.capturedAt)}${live.stopsAway !== null ? ` - ${live.stopsAway} stops away` : ''}`
            : telemetry?.stale
              ? 'Last telemetry update is stale. Awaiting a new signal.'
              : 'Delivery window shown. Live vehicle update pending.'}
        </div>
        <div className="sm-driver">
          <span className="sm-avatar">
            <Truck size={21} />
          </span>
          <div>
            <strong>{trip?.driver?.name || 'Driver not assigned'}</strong>
            <small>{trip?.vehicle.registrationNumber || 'Vehicle assignment pending'}</small>
            <small>
              {trip
                ? `${trip.vehicle.type} / ${trip.vehicle.tempType}`
                : 'Dispatch will allocate a vehicle'}
            </small>
          </div>
          {trip?.driver?.phone && (
            <a className="sm-small-btn" href={'tel:' + trip.driver.phone}>
              Call
            </a>
          )}
        </div>
        <div className="sm-two-col">
          <div className="sm-inset">
            <Thermometer size={14} />
            <small>Chilled zone</small>
            <strong>
              {live?.chilledC != null ? `${live.chilledC.toFixed(1)} C` : 'Not available'}
            </strong>
          </div>
          <div className="sm-inset">
            <Thermometer size={14} />
            <small>Frozen zone</small>
            <strong>
              {live?.frozenC != null ? `${live.frozenC.toFixed(1)} C` : 'Not available'}
            </strong>
          </div>
        </div>
      </Card>
      <Card>
        <RoutePreview order={order} />
        {live?.latitude != null && live.longitude != null && (
          <a
            className="sm-small-btn"
            href={`https://www.google.com/maps?q=${live.latitude},${live.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Open vehicle location
          </a>
        )}
        {order.workflow?.receivingInstructions && (
          <p className="sm-inset">Receiving instructions: {order.workflow.receivingInstructions}</p>
        )}
      </Card>
      <Card className="sm-tracking-audit">
        <div className="sm-section-title">
          <h2>Checkpoint Audit</h2>
          <span className="sm-muted">Refreshes every 30s</span>
        </div>
        <div className="sm-timeline">
          {events.map((event, index) => (
            <div key={index}>
              <span className="sm-timeline-dot">
                <CheckCircle size={14} />
              </span>
              <div>
                <div className="sm-row">
                  <strong>{event.label}</strong>
                  <small>{timeLabel(event.time)}</small>
                </div>
                <p>{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {ready && (
        <p className="sm-inset sm-success" role="status">
          Bay #02 is ready - saved to your account
        </p>
      )}
      {!['DELIVERED', 'PARTIAL', 'FAILED'].includes(order.status) && (
        <button className="sm-btn" onClick={() => setModal(true)}>
          {' '}
          {ready ? 'Review Receiving Bay #02' : 'Prepare Receiving Bay #02'}
        </button>
      )}
      {['IN_TRANSIT', 'DELIVERED', 'PARTIAL'].includes(order.status) && (
        <Link className="sm-btn sm-secondary" to={`/store/orders/${id}/receipt`}>
          {order.receiptConfirmation ? 'View Receipt' : 'Confirm Delivery Receipt'}
        </Link>
      )}
      {modal && (
        <ReceivingBayModal
          order={order}
          onClose={close}
          onReady={async (checks) => {
            await storeService.markBay(id, checks);
            await client.invalidateQueries({ queryKey: ['store'] });
            close();
          }}
        />
      )}
    </>
  );
}
