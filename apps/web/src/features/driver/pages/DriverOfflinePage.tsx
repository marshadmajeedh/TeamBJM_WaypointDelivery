import { WifiOff, ShieldCheck, Check, CloudUpload } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { ActionLink, Button, Card, StopCard } from '../components/ui';
import { DriverPageHeading } from '../components/PageHeading';
export function DriverOfflinePage() {
  const { trip, online, queue, sync } = useDriver();
  const next = trip?.stops.find((s) => !s.completedAt);
  const pending = queue.filter((q) => q.status !== 'SYNCED');
  return (
    <>
      <DriverPageHeading
        title="Offline Mode"
        subtitle="Your route continues, even without signal"
        back="/driver/route"
      />
      <section className="driver-connection-banner">
        <WifiOff size={21} />
        <div>
          <strong>{online ? 'Connection available' : 'Offline Mode Active'}</strong>
          <small>
            {online
              ? 'Your saved records can synchronize now.'
              : 'Continue your route using saved information.'}
          </small>
        </div>
        <span className="driver-tag">LOCAL SAVE</span>
      </section>
      <Card className="driver-offline-storage">
        <div className="driver-info-row">
          <ShieldCheck size={25} />
          <div>
            <h2>{pending.length} updates saved on this device</h2>
            <p>
              Signatures, delivery outcomes and evidence stay in the local queue until the server
              confirms them.
            </p>
          </div>
        </div>
        <div className="driver-offline-caption">Auto-sync resumes when connectivity returns.</div>
        <p className="driver-muted">Cached route: {trip?.tripNumber ?? 'No cached route'}</p>
      </Card>
      {next && <StopCard stop={next} />}
      <Card title="Available Offline">
        <ul className="driver-capability-list">
          {[
            'View cached route, stops and outlet contacts',
            'Record arrival and delivery outcomes',
            'Capture recipient signatures, photos and notes',
            'Report delivery problems and access delays',
          ].map((label) => (
            <li key={label}>
              <Check size={15} />
              {label}
            </li>
          ))}
        </ul>
        <p className="driver-muted">
          Stay signed in on this device to retain access to your cached route.
        </p>
      </Card>
      <Card title="Queued for Dispatch Sync">
        {pending.map((q) => (
          <div key={q.clientSyncId} className="driver-queue-row">
            <CloudUpload size={17} />
            <div>
              <strong>{String(q.payload.type).replace(/_/g, ' ')}</strong>
              <small>
                {new Date(q.createdAt).toLocaleTimeString('en-LK', {
                  timeZone: 'Asia/Colombo',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            </div>
            <span className="driver-tag">{q.status}</span>
          </div>
        ))}
        {!pending.length && <p className="driver-muted">No pending actions.</p>}
      </Card>
      <ActionLink to={next ? `/driver/stops/${next.id}` : '/driver/route'}>
        Continue {online ? 'Route' : 'Offline'} →
      </ActionLink>
      <Button className="secondary" onClick={() => void sync()}>
        Retry Connection Now
      </Button>
      <ActionLink to="/driver/sync">View Sync Status</ActionLink>
    </>
  );
}
