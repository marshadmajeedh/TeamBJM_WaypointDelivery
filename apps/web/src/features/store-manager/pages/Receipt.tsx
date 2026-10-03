import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, FileText, Truck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ReceiptProofField } from '../components/ReceiptProofField';
import { ReceiptDocument } from '../components/ReceiptDocument';
import { useStoreOrder } from '../StoreContext';
import { storeService } from '../service';
import { ReceiptInput, StoreOrder, timeLabel, dateLabel } from '../types';
import { PageTitle } from '../components/StoreShell';
import { Card, Feedback, DispatchContact, TemperatureBadge } from '../components/OrderComponents';
export function Receipt() {
  const { id = '' } = useParams();
  const query = useStoreOrder(id);
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  return <ReceiptForm key={id} order={query.data} />;
}
function ReceiptForm({ order }: { order: StoreOrder }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [issue, setIssue] = useState<ReceiptInput['issue']>('NONE');
  const [affected, setAffected] = useState(order.items[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(user?.name || '');
  const [accepted, setAccepted] = useState(false);
  const [received, setReceived] = useState(
    order.items.map((item) => ({ itemId: item.id, quantity: item.quantity }))
  );
  const [proof, setProof] = useState<ReceiptInput['proof']>();
  const [proofBusy, setProofBusy] = useState(false);
  const [dockTemperature, setDockTemperature] = useState('');
  const [validation, setValidation] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      storeService.receipt(order.id, {
        signature,
        issue,
        affectedItemId: issue === 'NONE' ? undefined : affected,
        notes,
        received,
        proof,
        dockTemperatureC: dockTemperature === '' ? undefined : Number(dockTemperature),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['store'] });
      navigate('/store/orders?status=' + (issue === 'NONE' ? 'DELIVERED' : 'PARTIAL'));
    },
  });
  const delivery = order.deliveries[0];
  const trip = order.tripOrders[0]?.trip;
  if (order.receiptConfirmation)
    return (
      <>
        <PageTitle title="Delivery Receipt" back="/store/orders" />
        <Card>
          <CheckCircle className="sm-success-icon" size={36} />
          <h1>Receipt Confirmed</h1>
          <p>
            #{order.orderNumber} / {order.receiptConfirmation.status}
          </p>
          <p>
            {dateLabel(order.receiptConfirmation.confirmedAt)} /{' '}
            {timeLabel(order.receiptConfirmation.confirmedAt)}
          </p>
          <ReceiptDocument order={order} />
          <button className="sm-btn sm-secondary" onClick={() => window.print()}>
            Print Intake Gate Slip
          </button>
        </Card>
        <Link className="sm-btn" to="/store/orders">
          Back to My Orders
        </Link>
      </>
    );
  if (!['IN_TRANSIT', 'DELIVERED', 'PARTIAL'].includes(order.status))
    return (
      <Card>
        <h1>Receipt not available yet</h1>
        <p>Wait until this order is out for delivery before confirming intake.</p>
        <Link to={`/store/orders/${order.id}/track`}>Track order &rarr;</Link>
      </Card>
    );
  return (
    <>
      <PageTitle
        title="Confirm Delivery Receipt"
        subtitle={`Dock intake / ${order.orderNumber} / Bay 02`}
        back="/store/orders"
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setValidation('');
          if (
            issue === 'NONE' &&
            received.some(
              (value) =>
                value.quantity !== order.items.find((item) => item.id === value.itemId)?.quantity
            )
          ) {
            setValidation('Select Report Issue to record a shortage.');
            return;
          }
          if (issue !== 'NONE' && notes.trim().length < 10) {
            setValidation('Describe the issue in at least 10 characters.');
            return;
          }
          mutation.mutate();
        }}
      >
        <Card>
          <div className="sm-row">
            <Truck size={23} />
            <div>
              <strong>{trip?.vehicle.registrationNumber || 'Vehicle not provided'}</strong>
              <p className="sm-muted">{trip?.driver?.name || 'Driver not assigned'}</p>
            </div>
            <div>
              <small>Arrived</small>
              <strong className="sm-block">{timeLabel(delivery?.arrivedAt)}</strong>
            </div>
          </div>
          <p className="sm-muted">{order.outlet.name} / Receiving Bay 02</p>
          <div className="sm-two-col">
            <div className="sm-inset">
              <small>Dock temperature</small>
              <label className="sm-field">
                Reading (C)
                <input
                  aria-label="Dock temperature"
                  type="number"
                  min={-40}
                  max={60}
                  step="0.1"
                  value={dockTemperature}
                  onChange={(event) => setDockTemperature(event.target.value)}
                />
              </label>
            </div>
            <div className="sm-inset">
              <small>Manifest volume</small>
              <strong>
                {order.totalVolumeM3.toFixed(2)} m3 / {order.items.length} SKUs
              </strong>
            </div>
          </div>
        </Card>
        <Card>
          <h2>Verification Status</h2>
          <label className="sm-verification">
            <input
              type="radio"
              name="verification"
              checked={issue === 'NONE'}
              onChange={() => setIssue('NONE')}
            />
            <div>
              <strong>All Goods Complete & Intact</strong>
              <p>All units received undamaged and in acceptable condition.</p>
            </div>
          </label>
          <label className="sm-verification sm-issue">
            <input
              type="radio"
              name="verification"
              checked={issue !== 'NONE'}
              onChange={() => setIssue('SHORTAGE')}
            />
            <div>
              <strong>Report Issue / Shortage</strong>
              <p>Record missing, damaged or incorrect goods.</p>
            </div>
          </label>
        </Card>
        <Card>
          <div className="sm-row">
            <h2>Item Verification Manifest</h2>
            <span className="sm-badge">
              {
                received.filter(
                  (value) =>
                    value.quantity ===
                    order.items.find((item) => item.id === value.itemId)?.quantity
                ).length
              }
              /{order.items.length} complete
            </span>
          </div>
          <p className="sm-muted">Verify quantities and condition as stock is received.</p>
          {order.items.map((item) => {
            const quantity = received.find((value) => value.itemId === item.id)!.quantity;
            const mismatch =
              quantity !== item.quantity || (issue !== 'NONE' && affected === item.id);
            return (
              <div className={'sm-inset ' + (mismatch ? 'sm-issue' : '')} key={item.id}>
                <strong>{item.productName}</strong>
                <TemperatureBadge value={item.tempRequirement} />
                <div className="sm-row">
                  <label className="sm-field">
                    Received / {item.quantity}
                    <input
                      aria-label={'Received ' + item.productName}
                      type="number"
                      min={0}
                      max={item.quantity}
                      step={1}
                      required
                      value={quantity}
                      onChange={(event) => {
                        const count = Number(event.target.value);
                        if (Number.isInteger(count) && count >= 0 && count <= item.quantity)
                          setReceived((current) =>
                            current.map((value) =>
                              value.itemId === item.id ? { ...value, quantity: count } : value
                            )
                          );
                      }}
                    />
                  </label>
                  <span
                    className={
                      'sm-badge ' + (mismatch ? 'sm-status-PARTIAL' : 'sm-status-DELIVERED')
                    }
                  >
                    {mismatch
                      ? quantity < item.quantity
                        ? 'Shortage'
                        : 'Issue reported'
                      : 'Verified'}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
        {issue !== 'NONE' && (
          <Card>
            <h2>Issue Details & Claims Note</h2>
            <label className="sm-field">
              Issue category
              <select
                value={issue}
                onChange={(event) => setIssue(event.target.value as ReceiptInput['issue'])}
              >
                <option value="SHORTAGE">Missing Items / Shortage in Transit</option>
                <option value="DAMAGED">Damaged goods</option>
                <option value="INCORRECT">Incorrect goods</option>
              </select>
            </label>
            <label className="sm-field">
              Affected line item
              <select value={affected} onChange={(event) => setAffected(event.target.value)}>
                {order.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm-field">
              Audit explanation & store acknowledgement
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Describe expected and received quantities, condition, and action taken..."
              />
            </label>
            <p className="sm-muted">Photo proof / signed waybill</p>
            {delivery?.proofOfDelivery?.photoUrl &&
            /^https?:\/\//.test(delivery.proofOfDelivery.photoUrl) ? (
              <a
                href={delivery.proofOfDelivery.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="sm-inset sm-block"
              >
                <FileText size={18} /> View driver-provided proof
              </a>
            ) : (
              <div className="sm-inset sm-muted">
                No driver proof attached. Add your store photo below.
              </div>
            )}
          </Card>
        )}
        <Card>
          <ReceiptProofField value={proof} onChange={setProof} onBusyChange={setProofBusy} />
          <label className="sm-field">
            Store Manager signature / acknowledgement
            <input
              value={signature}
              required
              minLength={2}
              maxLength={150}
              onChange={(event) => setSignature(event.target.value)}
            />
          </label>
          <label className="sm-check">
            <input
              type="checkbox"
              checked={accepted}
              required
              onChange={(event) => setAccepted(event.target.checked)}
            />
            I confirm I physically checked this delivery and the details above are accurate.
          </label>
        </Card>
        {validation && (
          <p className="sm-error" role="alert">
            {validation}
          </p>
        )}
        {mutation.error && <Feedback error={mutation.error} />}
        <button
          className="sm-btn"
          type="submit"
          disabled={!accepted || mutation.isPending || proofBusy}
        >
          {mutation.isPending
            ? 'Saving receipt...'
            : issue === 'NONE'
              ? 'Confirm Receipt'
              : 'Confirm Receipt & Submit Exception'}
        </button>
      </form>
      <DispatchContact order={order} />
      <p className="sm-muted sm-center">
        The printable intake gate slip is available after receipt confirmation.
      </p>
    </>
  );
}
