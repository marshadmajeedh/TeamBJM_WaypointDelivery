import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Truck,
  Clock,
  MapPin,
  Flag,
  CheckCheck,
  BadgeCheck,
  ShieldCheck,
  Map,
  Snowflake,
  GitFork,
  AlertTriangle,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useDriver } from '../DriverContext';
import { Card, DataState, time } from '../components/ui';

const checklist = [
  ['Loading sequence verified', 'Last in, first out for the delivery corridor'],
  ['Cargo manifest confirmed', 'Product quantities checked against the manifest'],
  ['Cold-chain chamber checked', 'Temperature requirements verified for all cargo'],
  ['Vehicle and security seals verified', 'Vehicle inspection and seal checks complete'],
  ['Gate dispatch clearance confirmed', 'Loading bay clearance received before departure'],
];
export function DriverTodayRoutePage() {
  const { user } = useAuth();
  const { trip, submit, issues, online, queue } = useDriver();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<boolean[]>(checklist.map(() => false));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const complete = trip?.stops.filter((s) => s.completedAt).length ?? 0;
  const passed = checks.filter(Boolean).length;
  const ready = trip?.status === 'READY_FOR_DISPATCH';
  const openIssues = issues.filter((i) => i.tripId === trip?.id && !i.resolved);
  const synced = online && !queue.some((q) => q.status !== 'SYNCED');
  const branch = (name: string) => name.replace(/^Waypoint Fresh\s*[–-]\s*/, '');
  async function startRoute() {
    if (!trip || busy) return;
    setBusy(true);
    setError('');
    try {
      if (ready) await submit({ type: 'START_TRIP', tripId: trip.id });
      navigate(trip.status === 'COMPLETED' ? '/driver/trip-completed' : '/driver/route');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start the route. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="today-route">
      <h1 className="route-page-title">Today's Route</h1>
      <section className="today-driver">
        <span className="today-avatar">
          <UserRound size={23} />
        </span>
        <div>
          <strong>
            {user?.name}
            <span className="today-driver-id">DRIVER</span>
          </strong>
          <small>
            {new Date().toLocaleDateString('en-LK', {
              timeZone: 'Asia/Colombo',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </small>
        </div>
        <Link to="/driver/sync" className="today-sync">
          <i />
          {synced ? 'Live synced' : online ? 'Sync pending' : 'Offline'}
        </Link>
      </section>
      <DataState>
        {trip && (
          <>
            <div className="today-vehicle">
              <Truck size={19} />
              <strong>{trip.vehicle.registrationNumber}</strong>
              <span>
                {trip.vehicle.tempType === 'REEFER' ? 'Refrigerated vehicle' : 'Ambient vehicle'}
              </span>
              {trip.vehicle.tempType === 'REEFER' && <Snowflake size={15} />}
            </div>
            {openIssues.length > 0 && (
              <Link to="/driver/issues" className="today-exception">
                <AlertTriangle size={21} />
                <div>
                  <strong>
                    Manifest Exception <span>{openIssues.length} open</span>
                  </strong>
                  <p>
                    Reported issues need review before delivery. View trip issues and dispatcher
                    guidance.
                  </p>
                </div>
                <ArrowRight size={15} />
              </Link>
            )}
            <Card className="today-wave">
              <div className="today-wave-heading">
                <span>DAILY DELIVERY WAVE</span>
                <span className="today-ready">
                  <i />
                  {ready ? 'Ready to start' : trip.status.replace(/_/g, ' ')}
                </span>
                <GitFork size={21} />
              </div>
              <h2>{branch(trip.stops[0]?.outlet.name ?? 'Assigned')} Delivery Corridor</h2>
              <p className="today-trip-reference">{trip.tripNumber}</p>
              <ol className="today-corridor">
                <li>
                  <span className="today-dot origin" />
                  <strong>Assigned depot</strong>
                  <small>Origin · see profile</small>
                </li>
                <li>
                  <span className="today-dot" />
                  {trip.stops
                    .slice(0, 2)
                    .map((s) => branch(s.outlet.name))
                    .join(' → ') || 'No stops assigned'}
                </li>
                <li>
                  <span className="today-dot" />
                  <strong>
                    {branch(trip.stops[trip.stops.length - 1]?.outlet.name ?? 'Destination')}
                  </strong>
                  <small>Final stop</small>
                </li>
              </ol>
              <div className="today-stats">
                <div>
                  <Clock size={18} />
                  <span>
                    <small>Departure</small>
                    <strong>{time(trip.actualDepartureTime ?? trip.plannedDepartureTime)}</strong>
                  </span>
                </div>
                <div>
                  <MapPin size={18} />
                  <span>
                    <small>Total Stops</small>
                    <strong>{trip.stops.length} Stores</strong>
                  </span>
                </div>
                <div>
                  <CheckCheck size={18} />
                  <span>
                    <small>Progress</small>
                    <strong>
                      {complete} / {trip.stops.length} (
                      {trip.stops.length ? Math.round((complete / trip.stops.length) * 100) : 0}%)
                    </strong>
                  </span>
                </div>
                <div>
                  <Flag size={18} />
                  <span>
                    <small>Est. Finish</small>
                    <strong className="today-pending">Awaiting ETA</strong>
                  </span>
                </div>
              </div>
              {error && (
                <p role="alert" className="driver-error">
                  {error}
                </p>
              )}
              <button
                className="driver-button today-start"
                onClick={() => void startRoute()}
                disabled={busy}
              >
                {busy
                  ? 'Starting route…'
                  : trip.status === 'COMPLETED'
                    ? 'View Completed Trip'
                    : ready
                      ? 'Start Route Wave'
                      : 'Continue Route Wave'}
                <ArrowRight size={17} />
              </button>
              {ready && passed < checklist.length && (
                <p className="today-start-hint">
                  Review the pre-trip checklist before leaving the depot.
                </p>
              )}
            </Card>
            <Card className="today-checklist">
              <div className="route-section-heading">
                <h2>
                  <BadgeCheck size={18} /> Pre-Trip Gate Checklist
                </h2>
                <span
                  className={`today-check-count ${passed === checklist.length ? 'passed' : ''}`}
                >
                  {passed} / {checklist.length} {passed === checklist.length ? 'PASSED' : 'CHECKED'}
                </span>
              </div>
              {checklist.map(([title, description], i) => (
                <label className="today-check" key={title}>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) =>
                      setChecks((previous) =>
                        previous.map((value, index) => (index === i ? e.target.checked : value))
                      )
                    }
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </label>
              ))}
            </Card>
            <div className="today-shortcuts">
              <Link to="/driver/stops">
                <Map size={22} />
                <strong>Full Route Path</strong>
                <small>Review all delivery stops</small>
              </Link>
              <Link to="/driver/profile">
                <Snowflake size={22} />
                <strong>Vehicle &amp; Profile</strong>
                <small>
                  {trip.vehicle.tempType === 'REEFER'
                    ? 'Refrigerated cargo details'
                    : 'Assigned vehicle details'}
                </small>
              </Link>
            </div>
          </>
        )}
      </DataState>
      <section className="today-safety">
        <ShieldCheck size={20} />
        <div>
          <strong>Safety Protocol Active</strong>
          <p>
            Keep your eyes on the road. Use the mobile manifest only when safely parked at loading
            bays. Contact dispatch whenever you need assistance.
          </p>
        </div>
      </section>
    </div>
  );
}
