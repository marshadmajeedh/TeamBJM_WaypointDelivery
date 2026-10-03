import { DriverPageHeading } from '../components/PageHeading';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDriver } from '../DriverContext';
import { Button, Card } from '../components/ui';
import { DriverIssueModal } from '../components/DriverIssueModal';
export function DriverIssuesPage() {
  const { trip, issues, queue, loading } = useDriver();
  const [filter, setFilter] = useState('All');
  const [stopId, setStopId] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const stop =
    trip?.stops.find((s) => s.id === stopId) ??
    trip?.stops.find((s) => !s.completedAt) ??
    trip?.stops[0];
  const rows = issues.filter(
    (i) =>
      i.tripId === trip?.id &&
      (filter === 'All' || (filter === 'Resolved' ? i.resolved : !i.resolved))
  );
  return (
    <>
      <DriverPageHeading
        title="Driver Issues"
        back="/driver/route"
        subtitle="Waypoint Driver Portal"
      />
      <p>{trip?.tripNumber ?? 'No current trip'}</p>
      <div className="driver-filters">
        {['All', 'Open', 'Resolved'].map((f) => (
          <button key={f} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      {rows.map((i) => {
        const s = trip?.stops.find((s) => s.id === i.stopId);
        const status = queue.find((q) => q.clientSyncId === i.id)?.status;
        return (
          <Card key={i.id} title={i.issueType}>
            <Link to={`/driver/stops/${i.stopId}`}>{s?.outlet.name ?? i.stopId}</Link>
            <p>{s?.orderNumber ?? i.orderId}</p>
            <p>{new Date(i.reportedAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</p>
            <p>{i.description || 'No description provided.'}</p>
            <span className="driver-tag">
              {i.resolved ? 'Resolved' : 'Open'} Â· {status ?? 'SYNCED'}
            </span>
            {i.preventsDelivery && <p className="driver-warning">Prevents delivery</p>}
            {i.photo && (
              <img className="driver-photo" src={i.photo} alt="Reported issue evidence" />
            )}
          </Card>
        );
      })}
      {!rows.length && (
        <Card>{loading ? 'Loading issuesâ€¦' : 'No issues match this filter.'}</Card>
      )}
      {trip && (
        <Card title="Report New Issue">
          <label>
            Stop
            <select value={stop?.id ?? ''} onChange={(e) => setStopId(e.target.value)}>
              {trip.stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sequenceNumber}. {s.outlet.name}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={!stop} onClick={() => setOpen(true)}>
            Report New Issue
          </Button>
        </Card>
      )}
      {open && stop && (
        <DriverIssueModal
          stop={stop}
          close={() => setOpen(false)}
          blocked={() => navigate(`/driver/stops/${stop.id}/outcome`, { state: { blocked: true } })}
        />
      )}
    </>
  );
}
