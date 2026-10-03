import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StoreOrder } from '../types';
const checks = [
  'Bay cleared and accessible',
  'Receiving staff assigned',
  'Cold-storage area ready',
  'Trolley/pallet equipment available',
  'Temperature receiving equipment ready',
];
export function ReceivingBayModal({
  order,
  onClose,
  onReady,
}: {
  order: StoreOrder;
  onClose: () => void;
  onReady: (checks: boolean[]) => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState<boolean[]>(
    order.workflow?.bay?.checks || checks.map(() => false)
  );
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button, input');
        if (!elements?.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="sm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="sm-modal"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bay-title"
      >
        <div className="sm-row">
          <h2 id="bay-title">Prepare Receiving Bay #02</h2>
          <button className="sm-icon" aria-label="Close modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="sm-muted">Get the receiving area ready before delivery arrives.</p>
        <div className="sm-inset">
          <div className="sm-row">
            <small>Order</small>
            <strong>{order.orderNumber}</strong>
          </div>
          <div className="sm-row">
            <small>Vehicle</small>
            <strong>
              {order.tripOrders[0]?.trip.vehicle.registrationNumber || 'Awaiting assignment'}
            </strong>
          </div>
          <div className="sm-row">
            <small>ETA</small>
            <strong>Awaiting live update</strong>
          </div>
          <div className="sm-row">
            <small>Delivery type</small>
            <strong>
              {order.items.some((item) => item.tempRequirement !== 'AMBIENT')
                ? 'Chilled & frozen'
                : 'Ambient'}
            </strong>
          </div>
        </div>
        <div className="sm-checklist">
          {checks.map((label, index) => (
            <label key={label}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(event) =>
                  setChecked((current) =>
                    current.map((value, i) => (i === index ? event.target.checked : value))
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
        <p className="sm-inset sm-muted">
          Complete all checks before the vehicle arrives. Readiness is saved to your store account.
        </p>
        <button
          className="sm-btn"
          disabled={saving || !checked.every(Boolean)}
          onClick={async () => {
            setSaving(true);
            setError('');
            try {
              await onReady(checked);
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Could not save bay readiness.');
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : 'Mark Bay Ready'}
        </button>
        {error && (
          <p className="sm-error" role="alert">
            {error}
          </p>
        )}
        <button className="sm-btn sm-text-btn" disabled={saving} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
