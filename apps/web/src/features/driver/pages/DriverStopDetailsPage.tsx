import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, MapPin, Warehouse, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { ActionLink, Button, Card, DataState, Manifest, time } from '../components/ui';
import { DriverPageHeading, StopIdentity } from '../components/PageHeading';
import { DriverIssueModal } from '../components/DriverIssueModal';
export function DriverStopDetailsPage() {
  const { stopId } = useParams();
  const { trip, submit } = useDriver();
  const stop = trip?.stops.find((s) => s.id === stopId);
  const [report, setReport] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <DriverPageHeading
        title="Stop Details"
        back="/driver/stops"
        subtitle={stop?.outlet.name}
        step={1}
      />
      <DataState>
        {stop && trip ? (
          <>
            <StopIdentity stop={stop} />
            <Card className="driver-contact-card">
              <div className="driver-contact-avatar">
                {(stop.outlet.contactPerson ?? 'Receiving team')
                  .split(' ')
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <strong>{stop.outlet.contactPerson ?? 'Store receiving team'}</strong>
                <small>Delivery recipient</small>
              </div>
              {stop.outlet.contactPhone && (
                <a href={`tel:${stop.outlet.contactPhone.replace(/[^+\d]/g, '')}`}>
                  <Phone size={13} />
                  Call
                </a>
              )}
            </Card>
            <Card title="Dock & Access Instructions">
              <div className="driver-info-row">
                <Warehouse size={21} />
                <div>
                  <strong>Confirm the receiving bay</strong>
                  <p>
                    Dock and access instructions have not been provided. Confirm the unloading
                    location with the store contact before entering.
                  </p>
                </div>
              </div>
              <a
                className="driver-button secondary"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.outlet.address || stop.outlet.name)}`}
              >
                <MapPin size={15} /> Navigate to Outlet
              </a>
            </Card>
            <Card title="Arrival Status">
              <div className="driver-arrival">
                <Clock size={20} />
                <div>
                  <strong>
                    {stop.completedAt
                      ? 'Delivery complete'
                      : stop.arrivedAt
                        ? 'Arrived at outlet'
                        : 'En route to outlet'}
                  </strong>
                  <small>
                    {stop.arrivedAt
                      ? `Recorded at ${time(stop.arrivedAt)}`
                      : 'Record your arrival when safely parked.'}
                  </small>
                </div>
                <span className="driver-tag">
                  {stop.completedAt ? stop.outcome : stop.arrivedAt ? 'ARRIVED' : 'EN ROUTE'}
                </span>
              </div>
              {!stop.arrivedAt && !stop.completedAt && (
                <Button
                  disabled={busy || trip.status !== 'IN_TRANSIT'}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await submit({
                        type: 'ARRIVAL',
                        tripId: trip.id,
                        stopId: stop.id,
                        orderId: stop.orderId,
                      });
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not record arrival.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Recording…' : 'Record Arrival'}
                </Button>
              )}
            </Card>
            <Manifest stop={stop} />
            {!stop.completedAt &&
              (trip.status === 'IN_TRANSIT' ? (
                <ActionLink to={`/driver/stops/${stop.id}/outcome`}>
                  Start Delivery / Record Outcome → <ArrowRight size={15} />
                </ActionLink>
              ) : (
                <ActionLink to="/driver">Start Route Before Delivery</ActionLink>
              ))}
            <Button className="secondary driver-report-button" onClick={() => setReport(true)}>
              <AlertTriangle size={15} />
              Report Problem / Access Delay
            </Button>
            {error && (
              <p role="alert" className="driver-error">
                {error}
              </p>
            )}
            {report && (
              <DriverIssueModal
                stop={stop}
                close={() => setReport(false)}
                blocked={() =>
                  navigate(`/driver/stops/${stop.id}/outcome`, { state: { blocked: true } })
                }
              />
            )}
          </>
        ) : (
          <Card>Stop not found in this trip.</Card>
        )}
      </DataState>
    </>
  );
}
