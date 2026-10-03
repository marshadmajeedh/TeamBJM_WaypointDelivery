import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { Card } from '../components/ui';
import { DriverPageHeading, ScreenLink } from '../components/PageHeading';
export function DriverPrototypePage() {
  const { trip } = useDriver();
  const stop = trip?.stops.find((s) => !s.completedAt) ?? trip?.stops[0];
  const base = stop ? `/driver/stops/${stop.id}` : '/driver/stops';
  const screens = [
    ['DR-01', 'Driver Login', 'Secure access to your assigned route', '/driver/login'],
    ['DR-02', 'Today’s Route', 'Vehicle, departure and pre-trip checks', '/driver'],
    ['DR-03', 'Route Overview', 'Corridor, next stop and manifest load', '/driver/route'],
    ['DR-04', 'Stop List', 'Search, filter and open delivery stops', '/driver/stops'],
    ['DR-05', 'Stop Details', 'Outlet, arrival and consignment', base],
    [
      'DR-06',
      'Delivery Outcome',
      'Full, partial or unsuccessful delivery',
      stop ? `${base}/outcome` : base,
    ],
    [
      'DR-07',
      'Proof of Delivery',
      'Recipient, signature and photo evidence',
      stop ? `${base}/proof` : base,
    ],
    ['DR-08', 'Offline Mode', 'Cached route and local action queue', '/driver/offline'],
    ['DR-09', 'Sync Status', 'Server confirmation and retry controls', '/driver/sync'],
    ['DR-09', 'Trip Completed', 'Delivery summary and trip finalization', '/driver/trip-completed'],
  ];
  return (
    <>
      <DriverPageHeading
        title="Driver Screen Guide"
        subtitle="A. N. Nafris Ahmed · Designathon driver workflow"
      />
      <Card className="driver-guide-intro">
        <Compass size={29} />
        <h2>One route. Every step connected.</h2>
        <p>
          Follow the delivery journey from departure to proof and synchronization. These screens use
          your assigned trip.
        </p>
        <Link className="driver-button" to="/driver">
          Begin with Today's Route <ArrowRight size={16} />
        </Link>
      </Card>
      <div className="driver-screen-list">
        {screens.map(([code, title, detail, to]) => (
          <ScreenLink key={title} code={code} title={title} detail={detail} to={to} />
        ))}
      </div>
      <p className="driver-muted">
        Start your trip before recording an outcome. Save an outcome before capturing proof. The
        trip summary becomes final after deliveries are complete and synchronized.
      </p>
    </>
  );
}
