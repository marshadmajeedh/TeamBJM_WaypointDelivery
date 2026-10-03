import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Compass, List, AlertTriangle, UserCircle, Wifi, WifiOff } from 'lucide-react';
import { DriverProvider, useDriver } from './DriverContext';
import './driver.css';
function DriverLayout() {
  const { online, queue, feedback, error } = useDriver();
  const location = useLocation();
  const pending = queue.filter((q) => q.status !== 'SYNCED').length;
  return (
    <div className="driver-shell">
      <header className="driver-header">
        <Link to="/driver" className="driver-brand">
          <Compass aria-hidden="true" />
          <span>
            WAYPOINT<small>DELIVERY · Driver Portal</small>
          </span>
        </Link>
        <Link to="/driver/sync" className="driver-tag">
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? 'Online' : 'Offline'} · {pending ? `${pending} pending` : 'Synced'}
        </Link>
      </header>
      {!online && (
        <Link className="driver-banner" to="/driver/offline">
          Offline mode · Your changes stay on this device until synced.
        </Link>
      )}
      <main className="driver-content">
        {feedback && (
          <p role="status" className="driver-success">
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="driver-error">
            {error}
          </p>
        )}
        <Outlet />
      </main>
      <nav className="driver-nav" aria-label="Driver navigation">
        {[
          { to: '/driver', label: 'Route', Icon: Compass },
          { to: '/driver/stops', label: 'Stops', Icon: List },
          { to: '/driver/issues', label: 'Issues', Icon: AlertTriangle },
          { to: '/driver/profile', label: 'Profile', Icon: UserCircle },
        ].map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/driver'}
            className={({ isActive }) =>
              isActive || (to === '/driver' && location.pathname === '/driver/route')
                ? 'active'
                : ''
            }
          >
            <Icon size={21} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function DriverPortal() {
  return (
    <DriverProvider>
      <DriverLayout />
    </DriverProvider>
  );
}
