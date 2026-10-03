import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDraft, useStoreData } from '../StoreContext';
import { storeService } from '../service';
import { dateLabel } from '../types';
import { PageTitle } from '../components/StoreShell';
import {
  Card,
  Feedback,
  PayloadSummary,
  ProductItemCard,
  TemperatureNotice,
} from '../components/OrderComponents';
export function ReviewOrder() {
  const query = useStoreData();
  const { draft, clearDraft } = useDraft();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [accepted, setAccepted] = useState(false);
  const submit = useMutation({
    mutationFn: () => storeService.submit(draft),
    onSuccess: (order) => {
      clearDraft();
      void client.invalidateQueries({ queryKey: ['store'] });
      navigate(`/store/orders/${order.id}/confirmation`, { replace: true });
    },
  });
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const items = draft.items.flatMap((item) => {
    const product = query.data.catalog.find((product) => product.id === item.productId);
    return product && item.quantity > 0 ? [{ ...product, quantity: item.quantity }] : [];
  });
  const outlet = query.data.outlets.find((outlet) => outlet.id === draft.outletId);
  if (!items.length || !outlet)
    return (
      <Card>
        <h1>No complete draft to review</h1>
        <p>Add products and a delivery destination first.</p>
        <Link className="sm-btn" to="/store/orders/new">
          Create New Order
        </Link>
      </Card>
    );
  return (
    <>
      <PageTitle title="Order Details" back="/store/orders/new" />
      <div className="sm-row">
        <div>
          <span className="sm-eyebrow">Manifest / Replenishment / Draft</span>
          <h1>Review Order</h1>
          <p className="sm-muted">Verify cold-chain payloads and store requirements.</p>
        </div>
        <span className="sm-badge">Awaiting sign-off</span>
      </div>
      <TemperatureNotice />
      <Card>
        <span className="sm-eyebrow">Delivery destination</span>
        <h2>
          {outlet.name} (#{outlet.code})
        </h2>
        <p className="sm-muted">{outlet.address}</p>
        <div className="sm-inset sm-two-col">
          <div>
            <small>Target delivery date</small>
            <strong>{dateLabel(draft.requestedDeliveryDate)}</strong>
            <small>
              {outlet.deliveryWindowStart || 'Window pending'} - {outlet.deliveryWindowEnd || 'TBC'}
            </small>
          </div>
          <div>
            <small>Dispatch classification</small>
            <strong>Store Replenish</strong>
            <small>{(draft.category || 'DAILY_REPLENISHMENT').replace(/_/g, ' ')}</small>
          </div>
        </div>
      </Card>
      <div className="sm-section-title">
        <h2>Itemized Payload Manifest</h2>
        <span className="sm-badge">{items.length} line items</span>
      </div>
      {items.map((item) => (
        <ProductItemCard key={item.id} item={item} pack={item.pack} />
      ))}
      <PayloadSummary items={items} dark />
      <Card>
        <h2>Special Receiving Instructions</h2>
        <p className="sm-muted">
          {draft.receivingInstructions || 'No additional receiving instructions.'}
        </p>
        <label className="sm-check">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          I have checked the destination, quantities and delivery date.
        </label>
      </Card>
      {submit.error && <Feedback error={submit.error} />}
      <div className="sm-actions">
        <Link className="sm-btn sm-secondary" to="/store/orders/new">
          Edit Order
        </Link>
        <button
          className="sm-btn"
          disabled={!accepted || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? 'Submitting...' : 'Submit Order >'}
        </button>
      </div>
    </>
  );
}
