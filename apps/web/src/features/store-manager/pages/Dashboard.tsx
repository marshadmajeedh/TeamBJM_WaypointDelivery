import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Truck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useDraft, useStoreData } from '../StoreContext';
import {
  Card,
  Feedback,
  OrderCard,
  RoutePreview,
  StatusBadge,
} from '../components/OrderComponents';
import { dateLabel } from '../types';
export function Dashboard() {
  const { user } = useAuth();
  const query = useStoreData();
  const { activeOutletId } = useDraft();
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const { outlets } = query.data;
  const orders = query.data.orders.filter(
    (order) => !activeOutletId || order.outletId === activeOutletId
  );
  const arriving = orders.find((order) => order.status === 'IN_TRANSIT');
  const summaries = [
    {
      label: 'Active Orders',
      value: orders.filter(
        (order) => !['DELIVERED', 'PARTIAL', 'FAILED', 'DRAFT'].includes(order.status)
      ).length,
      icon: Package,
      tone: 'blue',
    },
    {
      label: 'In Transit',
      value: orders.filter((order) => order.status === 'IN_TRANSIT').length,
      icon: Truck,
      tone: 'blue',
    },
    {
      label: 'Upcoming',
      value: orders.filter((order) => ['CONFIRMED', 'PLANNED', 'LOADING'].includes(order.status))
        .length,
      icon: Calendar,
      tone: 'blue',
    },
    {
      label: 'Deferred',
      value: orders.filter((order) => order.status === 'DEFERRED').length,
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      label: 'Completed',
      value: orders.filter((order) => order.status === 'DELIVERED').length,
      icon: CheckCircle,
      tone: 'teal',
    },
  ];
  return (
    <>
      <div className="sm-greeting">
        <span className="sm-eyebrow">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <h1>Good Morning, {user?.name?.split(' ')[0] || 'Store Manager'}</h1>
        <p>
          {' '}
          {outlets.find((outlet) => outlet.id === activeOutletId)?.name || 'All depot outlets'}
        </p>
      </div>
      <div className="sm-summary-grid">
        {summaries.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className={'sm-summary sm-' + tone}>
            <Icon size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </Card>
        ))}
      </div>
      <Link to="/store/orders/new" className="sm-cta">
        <span>
          <strong>
            Place New Order <small>FAST</small>
          </strong>
          <small>Plan your next store replenishment</small>
        </span>
        <ArrowRight />
      </Link>
      {arriving ? (
        <>
          <Card className="sm-arriving">
            <div className="sm-row">
              <span className="sm-eyebrow">Out for delivery</span>
              <small>#{arriving.orderNumber}</small>
            </div>
            <div className="sm-row">
              <div>
                <p className="sm-muted">Expected delivery window</p>
                <h2 className="sm-eta">{arriving.outlet.deliveryWindowStart || 'ETA pending'}</h2>
                <small>{dateLabel(arriving.requestedDeliveryDate)}</small>
              </div>
              <StatusBadge status={arriving.status} />
            </div>
            <div className="sm-inset">
              <Truck size={17} />{' '}
              {arriving.tripOrders[0]?.trip.vehicle.registrationNumber || 'Vehicle pending'}
              <small className="sm-block">
                {arriving.tripOrders[0]?.trip.driver?.name || 'Driver assignment pending'}
              </small>
            </div>
            <Link className="sm-btn sm-bright" to={`/store/orders/${arriving.id}/track`}>
              Track Order <ArrowRight size={15} />
            </Link>
          </Card>
          <Card>
            <RoutePreview order={arriving} />
          </Card>
        </>
      ) : (
        <Card>
          <strong>No deliveries in transit</strong>
          <p className="sm-muted">Your next dispatch will appear here once it is on the way.</p>
        </Card>
      )}
      <div className="sm-section-title">
        <h2>Recent Orders</h2>
        <Link to="/store/orders">View All &rarr;</Link>
      </div>
      <div className="sm-order-grid">
        {orders.length ? (
          orders.slice(0, 4).map((order) => <OrderCard key={order.id} order={order} compact />)
        ) : (
          <Card>
            <p>No orders yet. Place your first replenishment order above.</p>
          </Card>
        )}
      </div>
      <Link
        className="sm-inset sm-dock"
        to={arriving ? `/store/orders/${arriving.id}/track` : '/store/orders'}
      >
        <Building2 />
        <span>
          <strong>Receiving Dock - Bay 02</strong>
          <small className="sm-block">Prepare for your next intake</small>
        </span>
        <ArrowRight size={16} />
      </Link>
    </>
  );
}
