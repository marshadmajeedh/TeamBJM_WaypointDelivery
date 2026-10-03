import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Package,
  Truck,
  GitFork,
  Clock,
  List,
  Snowflake,
} from 'lucide-react';
import { useDriver } from '../DriverContext';
import { Card, DataState, time } from '../components/ui';

export function DriverRouteOverviewPage() {
  const { trip } = useDriver();
  const next = trip?.stops.find((s) => !s.completedAt);
  const remaining = trip?.stops.filter((s) => !s.completedAt) ?? [];
  const completed = (trip?.stops.length ?? 0) - remaining.length;
  const upcoming = remaining.filter((s) => s.id !== next?.id).slice(0, 2);
  const fresh = next?.items.some((item) => item.tempRequirement !== 'AMBIENT');
  const branch = (name: string) => name.replace(/^Waypoint Fresh\s*[–-]\s*/, '');
  return (
    <div className="route-overview">
      <h1 className="route-page-title">Route Overview</h1>
      <DataState>
        {trip && (
          <>
            <section className="route-trip-strip" aria-label="Trip status">
              <span className="route-vehicle-icon">
                <Truck size={18} />
              </span>
              <div>
                <strong>{trip.vehicle.registrationNumber}</strong>
                <small>
                  Dep: {time(trip.actualDepartureTime ?? trip.plannedDepartureTime)} ·{' '}
                  {trip.stops.length} Stops ({completed} Done)
                </small>
              </div>
              <span className="route-status">
                <i />
                {trip.status === 'IN_TRANSIT' ? 'ACTIVE' : trip.status.replace(/_/g, ' ')}
              </span>
            </section>
            <Card className="route-corridor">
              <div className="route-section-heading">
                <h2>
                  <GitFork size={15} /> Corridor Schematic
                </h2>
                <span>
                  {branch(trip.stops[0]?.outlet.name ?? 'Depot')} →{' '}
                  {branch(
                    trip.stops[Math.min(2, trip.stops.length - 1)]?.outlet.name ?? 'Destination'
                  )}
                </span>
              </div>
              <div className="route-map" aria-label="First stops in delivery sequence">
                <div className="route-map-line" />
                <div className="route-map-point depot">
                  <span>
                    <Truck size={16} />
                  </span>
                  <strong>Depot</strong>
                  <small>{time(trip.plannedDepartureTime)}</small>
                </div>
                {trip.stops.slice(0, 3).map((stop) => (
                  <div
                    key={stop.id}
                    className={`route-map-point ${stop.id === next?.id ? 'current' : ''} ${stop.completedAt ? 'done' : ''}`}
                  >
                    <span>{stop.sequenceNumber}</span>
                    <strong>{branch(stop.outlet.name)}</strong>
                    <small>
                      {stop.completedAt
                        ? 'Delivered'
                        : (stop.outlet.deliveryWindowStart ?? 'Pending')}
                    </small>
                  </div>
                ))}
              </div>
              <div className="route-map-footer">
                <span>
                  <Clock size={13} /> {completed} of {trip.stops.length} delivered
                </span>
                <span>
                  <MapPin size={13} /> {remaining.length} stops remaining
                </span>
              </div>
            </Card>
            {next ? (
              <section className="route-next-card">
                <div className="route-next-heading">
                  <span>
                    <i /> NEXT STOP · STOP {next.sequenceNumber} OF {trip.stops.length}
                  </span>
                  {fresh && <span className="route-priority">PRIORITY FRESH</span>}
                </div>
                <div className="route-next-body">
                  <div className="route-outlet">
                    <div className="route-outlet-art">
                      <Package size={27} />
                      <span>FRESH</span>
                    </div>
                    <div>
                      <h2>{next.outlet.name}</h2>
                      <strong>Stop {next.sequenceNumber}</strong>
                      <p>
                        <MapPin size={12} />
                        {next.outlet.address || 'Address not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="route-delivery-grid">
                    <div>
                      <small>Projected ETA</small>
                      <strong>Awaiting update</strong>
                      <span>Dispatcher estimate pending</span>
                    </div>
                    <div>
                      <small>Delivery Window</small>
                      <strong>
                        {next.outlet.deliveryWindowStart ?? '—'} –{' '}
                        {next.outlet.deliveryWindowEnd ?? '—'}
                      </strong>
                      {fresh && (
                        <span className="route-cold">
                          <Snowflake size={11} /> Cold-chain consignment
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="route-consignment">
                    <strong>
                      <Package size={13} /> {next.orderNumber} Consignment
                    </strong>
                    <div>
                      <span>
                        {next.items.length} product lines ·{' '}
                        {next.items.reduce((sum, item) => sum + item.quantity, 0)} units
                      </span>
                      <b>{next.weightKg.toLocaleString()} kg net</b>
                    </div>
                    <div className="route-consignment-rule" />
                  </div>
                  <Link
                    className="driver-button route-details-button"
                    to={`/driver/stops/${next.id}`}
                  >
                    View Stop Details <ArrowRight size={16} />
                  </Link>
                </div>
              </section>
            ) : (
              <Link className="driver-button" to="/driver/trip-completed">
                View Trip Summary <ArrowRight size={16} />
              </Link>
            )}
            <section className="route-upcoming">
              <div className="route-section-heading">
                <h2>Upcoming Corridor Stops</h2>
                <span>
                  {upcoming.length} of {Math.max(remaining.length - 1, 0)} pending
                </span>
              </div>
              {upcoming.map((stop) => (
                <Link key={stop.id} to={`/driver/stops/${stop.id}`} className="route-upcoming-stop">
                  <span className="route-stop-number">{stop.sequenceNumber}</span>
                  <div>
                    <strong>{stop.outlet.name}</strong>
                    <small>
                      <span>Window {stop.outlet.deliveryWindowStart ?? '—'}</span> ·{' '}
                      {stop.items.length} SKUs ({stop.weightKg} kg)
                    </small>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ))}
              {!upcoming.length && <p className="driver-muted">No further stops on this route.</p>}
            </section>
            <div className="route-load">
              <span className="route-load-icon">
                <Package size={21} />
              </span>
              <div>
                <small>Total Manifest Load</small>
                <strong>
                  {trip.totalWeightKg.toLocaleString()} kg ·{' '}
                  {trip.stops.reduce((sum, stop) => sum + stop.items.length, 0)} product lines
                </strong>
              </div>
              <span className="route-load-count">
                {trip.stops.length}
                <small>Stops</small>
              </span>
            </div>
            <Link className="driver-button route-all-stops" to="/driver/stops">
              <List size={17} /> View Full Stop List ({trip.stops.length} Stops)
            </Link>
          </>
        )}
      </DataState>
    </div>
  );
}
