import { useState } from 'react';
import { CloudUpload, CheckCircle2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { ActionLink, Button, Card } from '../components/ui';
import { DriverPageHeading } from '../components/PageHeading';
export function DriverSyncStatusPage() {
  const { online, queue, sync, trip } = useDriver();
  const [busy, setBusy] = useState(false);
  const pending = queue.filter((q) => q.status !== 'SYNCED');
  const count = queue.filter((q) => q.status === 'SYNCED').length;
  return (
    <>
      <DriverPageHeading
        title="Sync Status"
        subtitle="Your delivery records, safely accounted for"
        back="/driver/route"
      />
      <section className={`driver-sync-hero ${online ? 'online' : 'offline'}`}>
        {online ? <Wifi size={24} /> : <WifiOff size={24} />}
        <strong>{online ? 'Online · Connection available' : 'Offline Mode Active'}</strong>
        <p>
          {pending.length
            ? `${pending.length} saved actions awaiting server confirmation.`
            : 'All saved actions confirmed by the server.'}
        </p>
        <progress value={count} max={queue.length || 1} aria-label="Sync progress" />
        <small>
          {count} synchronized · {pending.length} awaiting confirmation
        </small>
      </section>
      <Card>
        <div className="driver-info-row">
          <CheckCircle2 size={28} />
          <div>
            <h2>{pending.length ? 'Sync is pending' : 'Your records are up to date'}</h2>
            <p>
              {pending.length
                ? 'Your records stay on this device until the server confirms them.'
                : 'Delivery records have been confirmed. You can continue your route.'}
            </p>
          </div>
        </div>
        <Button
          disabled={!online || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await sync();
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={15} />
          {busy ? 'Synchronizing…' : 'Retry Sync / Refresh Connection'}
        </Button>
      </Card>
      {queue.map((q) => (
        <Card key={q.clientSyncId} className="driver-sync-record">
          <div className="driver-queue-row">
            {q.status === 'SYNCED' ? <CheckCircle2 size={19} /> : <CloudUpload size={19} />}
            <div>
              <strong>{String(q.payload.type).replace(/_/g, ' ')}</strong>
              <small>
                {new Date(q.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
              </small>
            </div>
            <span className="driver-tag">{q.status}</span>
          </div>
          <p className="driver-muted">Attempts: {q.retryCount}</p>
          {q.error && (
            <p role="alert" className="driver-error">
              {q.error}
            </p>
          )}
        </Card>
      ))}
      {!queue.length && <Card>No locally saved actions.</Card>}
      <ActionLink
        to={trip?.stops.every((s) => s.completedAt) ? '/driver/trip-completed' : '/driver/route'}
      >
        {trip?.stops.every((s) => s.completedAt) ? 'View Trip Summary' : 'Continue Route'} →
      </ActionLink>
    </>
  );
}
