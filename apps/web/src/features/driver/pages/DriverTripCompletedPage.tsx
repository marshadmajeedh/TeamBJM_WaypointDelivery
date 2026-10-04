import { useState } from 'react';
import { BadgeCheck, Flag, Download, Truck } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { ActionLink, Button, Card, DataState, time } from '../components/ui';
import { DriverPageHeading } from '../components/PageHeading';
export function DriverTripCompletedPage() {
  const { trip, queue, submit, online } = useDriver();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = trip?.stops.filter((s) => s.completedAt) ?? [];
  const pending = queue.filter((q) => q.payload.tripId === trip?.id && q.status !== 'SYNCED');
  const allDone = !!trip?.stops.length && done.length === trip.stops.length;
  function downloadReport() {
    if (!trip) return;
    const csv = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = [
      ['Trip', trip.tripNumber],
      ['Vehicle', trip.vehicle.registrationNumber],
      [],
      ['Stop', 'Outlet', 'Order', 'Outcome', 'Completed at'],
      ...trip.stops.map((s) => [
        s.sequenceNumber,
        s.outlet.name,
        s.orderNumber,
        s.outcome ?? 'PENDING',
        s.completedAt ?? '',
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.map((r) => r.map(csv).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.tripNumber}-delivery-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <DriverPageHeading
        title={allDone ? 'Trip Delivery Summary' : 'Trip In Progress'}
        back="/driver/route"
        subtitle="Your delivery wave at a glance"
      />
      <DataState>
        {trip && (
          <>
            <Card className="driver-completion-card">
              <span className="driver-completion-icon">
                <BadgeCheck size={40} />
              </span>
              <span className="driver-tag">
                {trip.status === 'COMPLETED'
                  ? 'TRIP FINALIZED'
                  : allDone
                    ? 'ALL STOPS RECORDED'
                    : 'DELIVERY WAVE ACTIVE'}
              </span>
              <h2>
                {trip.status === 'COMPLETED'
                  ? 'Trip Completed Successfully!'
                  : allDone
                    ? 'Your delivery wave is complete'
                    : 'Your route is in progress'}
              </h2>
              <p className="driver-muted">{trip.tripNumber}</p>
              <div className="driver-completion-vehicle">
                <Truck size={18} />
                {trip.vehicle.registrationNumber} · {trip.vehicle.tempType}
              </div>
              <div className="driver-stats">
                <div>
                  Stops Completed
                  <strong>
                    {done.length} / {trip.stops.length}
                  </strong>
                </div>
                <div>
                  Delivered in Full
                  <strong>{done.filter((s) => s.outcome === 'FULL').length} outlets</strong>
                </div>
                <div>
                  Partial Deliveries
                  <strong>{done.filter((s) => s.outcome === 'PARTIAL').length} outlets</strong>
                </div>
                <div>
                  Unable to Deliver
                  <strong>{done.filter((s) => s.outcome === 'FAILED').length} outlets</strong>
                </div>
              </div>
              <div className="driver-summary-load">
                <span>Total Manifest Load</span>
                <strong>{trip.totalWeightKg.toLocaleString()} kg</strong>
              </div>
              <div className="driver-summary-window">
                <Flag size={17} />
                <div>
                  <small>Route Window</small>
                  <strong>
                    {time(trip.actualDepartureTime)} → {time(trip.completedTime)}
                  </strong>
                </div>
              </div>
              {pending.length ? (
                <p className="driver-warning">
                  {pending.length} actions pending sync. Finalize after the server confirms your
                  records.
                </p>
              ) : (
                <p className="driver-success">All saved actions synchronized.</p>
              )}
              {error && (
                <p role="alert" className="driver-error">
                  {error}
                </p>
              )}
              <Button
                disabled={
                  busy || !allDone || pending.length > 0 || !online || trip.status === 'COMPLETED'
                }
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await submit({ type: 'FINISH_TRIP', tripId: trip.id });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not finish the trip.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? 'Finalizing…'
                  : trip.status === 'COMPLETED'
                    ? 'Trip finalized'
                    : 'Finish Trip'}
              </Button>
            </Card>
            <ActionLink to="/driver/sync">View Sync Status</ActionLink>
            {!allDone && <ActionLink to="/driver/stops">Continue deliveries</ActionLink>}
            <Button className="secondary" onClick={downloadReport}>
              <Download size={16} />
              Download Delivery Report (CSV)
            </Button>
            <ActionLink to="/driver">Return to Today's Route</ActionLink>
          </>
        )}
      </DataState>
    </>
  );
}
