import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeService } from '../service';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useStoreOrder } from '../StoreContext';
import { Card, Feedback, ProductItemCard, DispatchContact } from '../components/OrderComponents';
import { PageTitle } from '../components/StoreShell';
import { dateLabel, timeLabel } from '../types';
export function DeferredNotice() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const query = useStoreOrder(id);
  const respond = useMutation({
    mutationFn: ({ action, slotId }: { action: 'ACKNOWLEDGE' | 'ACCEPT'; slotId?: string }) =>
      storeService.respondDeferral(id, action, slotId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['store'] }),
  });
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  const slot = order.workflow?.slot;
  const accepted = order.workflow?.deferralResponse?.action === 'ACCEPT';
  const acknowledged = Boolean(order.workflow?.deferralResponse);
  const validSlot = slot && new Date(slot.end).getTime() > Date.now();
  if (order.status !== 'DEFERRED')
    return (
      <Card>
        <h1>No active deferral notice</h1>
        <Link to={`/store/orders/${id}/track`}>View current order status &rarr;</Link>
      </Card>
    );
  return (
    <>
      <PageTitle title="Order Details" back="/store/orders" />
      <span className="sm-eyebrow">Automated dispatch notification / {order.orderNumber}</span>
      <Card className="sm-warning">
        <span className="sm-badge">
          <AlertTriangle size={12} /> Delivery Deferred
        </span>
        <h1>Order Delivery Rescheduled</h1>
        <p>
          Waypoint Central Dispatch has deferred order #{order.orderNumber}. Review the latest
          dispatch information below.
        </p>
      </Card>
      <Card>
        <h2>Timeline Adjustment</h2>
        <div className="sm-inset">
          <small>Requested delivery window</small>
          <strong className="sm-block">{dateLabel(order.requestedDeliveryDate)}</strong>
          <small>
            {order.outlet.deliveryWindowStart || 'Morning run'} /{' '}
            {order.outlet.deliveryWindowEnd || 'Window pending'}
          </small>
        </div>
        <div className="sm-inset sm-dark">
          <small>Revised delivery slot</small>
          <strong className="sm-block">
            {slot
              ? `${dateLabel(slot.start)} - ${timeLabel(slot.start)}`
              : 'Awaiting dispatch confirmation'}
          </strong>
          <small>
            {slot ? `Window ends ${timeLabel(slot.end)}` : 'A revised slot has not been published.'}
          </small>
        </div>
        <p className="sm-muted">Manifest status / Re-queued for dispatch planning</p>
      </Card>
      <Card>
        <h2>Dispatch Diagnostic</h2>
        <div className="sm-inset sm-warning">
          <span className="sm-eyebrow">Primary reason</span>
          <p>{order.deferralReason || 'Dispatch is reviewing fleet availability.'}</p>
        </div>
        <div className="sm-two-col">
          <div className="sm-inset">
            <small>Store safety buffer</small>
            <strong>Not provided</strong>
          </div>
          <div className="sm-inset">
            <small>Deferral count</small>
            <strong>{order.deferralCount}</strong>
          </div>
        </div>
      </Card>
      <Card>
        <h2>
          Impacted Consignment <span className="sm-badge">{order.items.length} SKUs</span>
        </h2>
        {order.items.map((item) => (
          <ProductItemCard key={item.id} item={item} />
        ))}
      </Card>
      <div className="sm-inset">
        <ShieldCheck size={18} />
        <strong>Automated Fulfillment Guarantee</strong>
        <p>
          Your existing order stays recorded. Please wait for dispatch confirmation before placing a
          replacement order.
        </p>
      </div>
      {acknowledged && (
        <p role="status" className="sm-success sm-inset">
          {accepted
            ? 'Revised delivery slot accepted and saved.'
            : 'Notice acknowledged and saved to your account.'}
        </p>
      )}
      {respond.error && <Feedback error={respond.error} />}
      <button
        className="sm-btn"
        disabled={respond.isPending || accepted || (acknowledged && !validSlot)}
        onClick={() =>
          respond.mutate({
            action: validSlot ? 'ACCEPT' : 'ACKNOWLEDGE',
            slotId: validSlot ? slot.id : undefined,
          })
        }
      >
        {respond.isPending
          ? 'Saving...'
          : accepted
            ? 'Slot Accepted'
            : validSlot
              ? 'Acknowledge & Accept Slot'
              : acknowledged
                ? 'Notice Acknowledged'
                : 'Acknowledge Notice'}
      </button>
      {!validSlot && (
        <p className="sm-muted sm-center">
          Acknowledge this notice now. Slot acceptance is available when dispatch publishes a future
          delivery slot.
        </p>
      )}
      <DispatchContact order={order} />
      <Link className="sm-btn sm-secondary" to={`/store/orders/${id}`}>
        Full Details
      </Link>
    </>
  );
}
