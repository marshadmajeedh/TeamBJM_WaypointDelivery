import { DriverPageHeading, StopIdentity } from '../components/PageHeading';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DeliveryOutcome, DeliveryResult } from '@waypoint/shared';
import { useDriver } from '../DriverContext';
import { Button, Card, DataState } from '../components/ui';
import { SignatureInput } from '../components/SignatureInput';
import { readPhoto } from '../components/media';
import { validateOutcome } from '../services/validation';
export function DriverProofOfDeliveryPage() {
  const { stopId } = useParams();
  const { trip, draft, submit } = useDriver();
  const stop = trip?.stops.find((s) => s.id === stopId);
  const navigate = useNavigate();
  const [result, setResult] = useState<DeliveryResult>();
  const [recipient, setRecipient] = useState('');
  const [designation, setDesignation] = useState('');
  const [signature, setSignature] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (stopId)
      void draft(stopId).then((v) => {
        if (active) {
          setResult(v);
          if (v?.outcome === DeliveryOutcome.FAILED)
            setRecipient('No recipient — delivery unsuccessful');
        }
      });
    return () => {
      active = false;
    };
  }, [stopId]);
  const complete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || reading || !trip || !stop || !result) return;
    const invalid = validateOutcome(stop, result);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (
      !confirmed ||
      !recipient.trim() ||
      (result.outcome !== DeliveryOutcome.FAILED && !signature)
    ) {
      setError('Enter the recipient, capture a signature and confirm the handover.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submit({
        type: 'COMPLETE_DELIVERY',
        tripId: trip.id,
        stopId: stop.id,
        orderId: stop.orderId,
        result,
        proof: {
          recipientName: recipient.trim(),
          designation: designation.trim() || undefined,
          signature,
          photos,
          confirmed: true,
          notes: notes.trim() || undefined,
        },
      });
      const next = trip.stops.find((s) => !s.completedAt && s.id !== stop.id);
      navigate(next ? `/driver/stops/${next.id}` : '/driver/trip-completed');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DriverPageHeading
        title="Proof of Delivery"
        back={`/driver/stops/${stopId}/outcome`}
        subtitle={stop?.outlet.name}
        step={3}
      />
      <DataState>
        {stop && result ? (
          stop.completedAt ? (
            <Card>This delivery is already complete.</Card>
          ) : (
            <form className="driver-delivery-form" onSubmit={complete}>
              <StopIdentity stop={stop} />
              <Card title={stop.outlet.name}>
                <span className="driver-tag">
                  {result.outcome} · {stop.orderNumber}
                </span>
                {stop.items.map((i) => (
                  <p key={i.id}>
                    {i.productName}: {result.quantities.find((q) => q.itemId === i.id)?.delivered} /{' '}
                    {i.quantity} delivered
                  </p>
                ))}
                <p>{result.reason}</p>
              </Card>
              <Card title="1. Recipient Details">
                <label>
                  {result.outcome === DeliveryOutcome.FAILED
                    ? 'Attempt recorded by / recipient'
                    : 'Receiver name'}
                  <input
                    required
                    maxLength={200}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </label>
                <label>
                  Designation (optional)
                  <input
                    maxLength={200}
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </label>
                {stop.outlet.contactPhone && <p>Contact: {stop.outlet.contactPhone}</p>}
              </Card>
              {result.outcome !== DeliveryOutcome.FAILED && (
                <Card title="2. Digital Signature">
                  <SignatureInput onChange={setSignature} />
                </Card>
              )}
              <Card title="3. Delivery Evidence">
                <label>
                  Delivery photo (up to 2 photos, 2 MB each)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    disabled={photos.length >= 2 || busy || reading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setReading(true);
                      try {
                        const photo = await readPhoto(file);
                        setPhotos((v) => [...v, photo].slice(0, 2));
                      } catch (err) {
                        setError((err as Error).message);
                      } finally {
                        setReading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                {photos.map((p, i) => (
                  <div key={i}>
                    <img className="driver-photo" src={p} alt={`Delivery evidence ${i + 1}`} />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                    >
                      Remove photo {i + 1}
                    </button>
                  </div>
                ))}
                <label>
                  Notes (optional)
                  <textarea
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <label className="driver-check">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  {result.outcome === DeliveryOutcome.FAILED
                    ? 'I confirm the unsuccessful delivery attempt and reason.'
                    : 'Recipient acknowledged the handover and quantities.'}
                </label>
                {error && (
                  <p role="alert" className="driver-error">
                    {error}
                  </p>
                )}
                <Button disabled={busy || reading}>
                  {busy ? 'Saving…' : 'Complete Delivery →'}
                </Button>
              </Card>
            </form>
          )
        ) : (
          <Card>
            Record a delivery outcome before capturing proof.
            <Link className="driver-button" to={`/driver/stops/${stopId}/outcome`}>
              Record Outcome
            </Link>
          </Card>
        )}
      </DataState>
    </>
  );
}
