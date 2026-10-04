import { DriverPageHeading, StopIdentity } from '../components/PageHeading';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DeliveryOutcome, DeliveryResult, failureReasons } from '@waypoint/shared';
import { useDriver } from '../DriverContext';
import { Button, Card, DataState, Manifest } from '../components/ui';
import { validateOutcome } from '../services/validation';
export function DriverDeliveryOutcomePage() {
  const { stopId } = useParams();
  const { trip, draft, saveDraft } = useDriver();
  const stop = trip?.stops.find((s) => s.id === stopId);
  const navigate = useNavigate();
  const location = useLocation();
  const [outcome, setOutcome] = useState<DeliveryOutcome>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (stopId)
      void draft(stopId).then((value) => {
        if (!active) return;
        if (value) {
          setOutcome(value.outcome);
          setQuantities(Object.fromEntries(value.quantities.map((q) => [q.itemId, q.delivered])));
          setReason(value.reason ?? '');
          setNotes(value.notes ?? '');
        } else if ((location.state as { blocked?: boolean })?.blocked) {
          setOutcome(DeliveryOutcome.FAILED);
          setReason('Access Problem');
        }
      });
    return () => {
      active = false;
    };
  }, [stopId]);
  const select = (v: DeliveryOutcome) => {
    setOutcome(v);
    setReason('');
    setQuantities(
      Object.fromEntries(
        (stop?.items ?? []).map((i) => [i.id, v === DeliveryOutcome.FAILED ? 0 : i.quantity])
      )
    );
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stop || !outcome) {
      setError('Select one delivery outcome.');
      return;
    }
    const result: DeliveryResult = {
      outcome,
      quantities: stop.items.map((i) => ({
        itemId: i.id,
        delivered:
          outcome === DeliveryOutcome.FULL
            ? i.quantity
            : outcome === DeliveryOutcome.FAILED
              ? 0
              : (quantities[i.id] ?? i.quantity),
      })),
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const invalid = validateOutcome(stop, result);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      await saveDraft(stop.id, result);
      navigate(`/driver/stops/${stop.id}/proof`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DriverPageHeading
        title="Record Delivery Outcome"
        back={`/driver/stops/${stopId}`}
        subtitle={stop?.outlet.name}
        step={2}
      />
      <DataState>
        {stop ? (
          stop.completedAt ? (
            <Card>This delivery is already complete.</Card>
          ) : trip?.status !== 'IN_TRANSIT' ? (
            <Card>Start the route before recording an outcome.</Card>
          ) : (
            <>
              <StopIdentity stop={stop} />
              <Manifest stop={stop} />
              <form className="driver-delivery-form" onSubmit={save}>
                <Card title="What happened at this stop?">
                  <fieldset>
                    <legend>Select one outcome</legend>
                    {[
                      { value: DeliveryOutcome.FULL, label: 'Delivered in Full' },
                      { value: DeliveryOutcome.PARTIAL, label: 'Partial Delivery' },
                      { value: DeliveryOutcome.FAILED, label: 'Unable to Deliver' },
                    ].map((o) => (
                      <label key={o.value} className="driver-check">
                        <input
                          type="radio"
                          name="outcome"
                          checked={outcome === o.value}
                          onChange={() => select(o.value)}
                        />
                        {o.label}
                      </label>
                    ))}
                  </fieldset>
                  {outcome === DeliveryOutcome.FULL && (
                    <p>
                      All {stop.items.reduce((n, i) => n + i.quantity, 0)} expected units will be
                      confirmed.
                    </p>
                  )}
                  {outcome === DeliveryOutcome.PARTIAL &&
                    stop.items.map((i) => (
                      <label key={i.id}>
                        {i.productName} · expected {i.quantity}
                        <input
                          aria-label={`Delivered ${i.productName}`}
                          type="number"
                          min={0}
                          max={i.quantity}
                          step={1}
                          value={quantities[i.id] ?? i.quantity}
                          onChange={(e) =>
                            setQuantities({ ...quantities, [i.id]: Number(e.target.value) })
                          }
                        />
                        <span className="driver-muted">
                          Short/damaged: {i.quantity - (quantities[i.id] ?? i.quantity)}
                        </span>
                      </label>
                    ))}
                  {outcome === DeliveryOutcome.PARTIAL && (
                    <label>
                      Shortage / damage reason
                      <input
                        required
                        maxLength={300}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                  )}
                  {outcome === DeliveryOutcome.FAILED && (
                    <label>
                      Unable-to-deliver reason
                      <select required value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Choose a reason</option>
                        {failureReasons.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Notes (optional)
                    <textarea
                      maxLength={2000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                  {error && (
                    <p role="alert" className="driver-error">
                      {error}
                    </p>
                  )}
                  <Button disabled={busy}>Continue to Proof of Delivery →</Button>
                </Card>
              </form>
            </>
          )
        ) : (
          <Card>Stop not found.</Card>
        )}
      </DataState>
    </>
  );
}

