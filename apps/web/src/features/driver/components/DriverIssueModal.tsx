import React, { useEffect, useRef, useState } from 'react';
import { DriverStop, issueCategories } from '@waypoint/shared';
import { useDriver } from '../DriverContext';
import { Button } from './ui';
import { readPhoto } from './media';
export function DriverIssueModal({
  stop,
  close,
  blocked,
}: {
  stop: DriverStop;
  close: () => void;
  blocked: () => void;
}) {
  const { trip, submit } = useDriver();
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<(typeof issueCategories)[number]>('Access Blocked');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [prevents, setPrevents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = dialog.current!;
    const active = document.activeElement as HTMLElement;
    el.showModal();
    return () => {
      el.close();
      active?.focus();
    };
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || reading || !trip) return;
    setBusy(true);
    setError('');
    try {
      await submit({
        type: 'ISSUE',
        tripId: trip.id,
        stopId: stop.id,
        orderId: stop.orderId,
        issueType: type,
        description: description.trim() || undefined,
        photo,
        preventsDelivery: prevents,
      });
      close();
      if (prevents) blocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save issue.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="driver-sheet"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="issue-title"
    >
      <form onSubmit={save}>
        <div className="driver-row">
          <h2 id="issue-title">Report Problem / Access Delay</h2>
          <button type="button" aria-label="Close report" disabled={busy} onClick={close}>
            ✕
          </button>
        </div>
        <p>
          {stop.outlet.name} · {stop.orderNumber}
        </p>
        <p className="driver-muted">
          Trip and stop are attached automatically. Time is recorded when you submit.
        </p>
        <label>
          Issue type
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {issueCategories.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Description (optional)
          <textarea
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Photo (optional, up to 2 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={reading || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setReading(true);
              try {
                setPhoto(await readPhoto(file));
                setError('');
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setReading(false);
              }
            }}
          />
        </label>
        {photo && (
          <>
            <img className="driver-photo" src={photo} alt="Issue evidence" />
            <button type="button" onClick={() => setPhoto(undefined)}>
              Remove photo
            </button>
          </>
        )}
        <label className="driver-check">
          <input
            type="checkbox"
            checked={prevents}
            onChange={(e) => setPrevents(e.target.checked)}
          />
          This issue prevents delivery
        </label>
        {error && (
          <p role="alert" className="driver-error">
            {error}
          </p>
        )}
        <Button disabled={busy || reading}>{busy ? 'Saving…' : 'Submit issue'}</Button>
      </form>
    </dialog>
  );
}
