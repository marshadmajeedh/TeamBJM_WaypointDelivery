import { useNavigate } from 'react-router-dom';
import { UserRound, Mail, Truck, MapPin, LogOut, Phone, Compass } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useDriver } from '../DriverContext';
import { ActionLink, Button, Card } from '../components/ui';
import { DriverPageHeading } from '../components/PageHeading';
export function DriverProfilePage() {
  const { user, logout } = useAuth();
  const { trip, online, queue } = useDriver();
  const navigate = useNavigate();
  const dispatch = import.meta.env.VITE_DISPATCH_PHONE as string | undefined;
  return (
    <>
      <DriverPageHeading title="Driver Profile" subtitle="Your account and assigned vehicle" />
      <Card className="driver-profile-hero">
        <span className="today-avatar">
          <UserRound size={27} />
        </span>
        <h2>{user?.name}</h2>
        <span className="driver-tag">DRIVER</span>
        <p className="driver-muted">
          {online ? 'Online' : 'Offline'} · {queue.filter((q) => q.status !== 'SYNCED').length}{' '}
          pending actions
        </p>
      </Card>
      <Card title="Account & Assignment">
        <dl className="driver-profile-details">
          <div>
            <Mail size={16} />
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <MapPin size={16} />
            <dt>Depot</dt>
            <dd>{user?.depotId ?? 'Not assigned'}</dd>
          </div>
          <div>
            <Truck size={16} />
            <dt>Vehicle</dt>
            <dd>{trip?.vehicle.registrationNumber ?? 'Not assigned'}</dd>
          </div>
          <div>
            <Compass size={16} />
            <dt>Trip</dt>
            <dd>{trip?.tripNumber ?? 'Not assigned'}</dd>
          </div>
        </dl>
      </Card>
      <ActionLink to="/driver/sync">View Sync Status</ActionLink>
      <ActionLink to="/driver/prototype">Explore Driver Screens</ActionLink>
      {dispatch ? (
        <a className="driver-button secondary" href={`tel:${dispatch.replace(/[^+\d]/g, '')}`}>
          <Phone size={16} />
          Contact Dispatch
        </a>
      ) : (
        <Card>
          <p className="driver-muted">
            Use your depot's assigned dispatch contact. The hotline has not been configured.
          </p>
        </Card>
      )}
      <Button
        className="secondary"
        onClick={() => {
          logout();
          navigate('/driver/login');
        }}
      >
        <LogOut size={16} />
        Logout
      </Button>
    </>
  );
}
