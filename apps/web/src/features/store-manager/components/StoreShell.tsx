import { ReactNode, useState } from 'react';
import {
  Bell,
  Compass,
  LayoutGrid,
  Package,
  Plus,
  Route,
  Headphones,
  LogOut,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { isStoreDemo } from '../service';
import { useDraft, useStoreData } from '../StoreContext';
export function Brand() {
  return (
    <Link to="/store" className="sm-brand">
      <span className="sm-logo">
        <Compass size={23} />
      </span>
      <span>
        WAYPOINT<small>DELIVERY</small>
      </span>
    </Link>
  );
}
export function StoreHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<'alerts' | 'profile' | null>(null);
  const { data } = useStoreData();
  const { activeOutletId, selectOutlet } = useDraft();
  return (
    <>
      <header className="sm-header">
        <Brand />
        <span className="sm-header-context">Store Manager Portal</span>
        <span className="sm-outlet">
          <Store size={12} />
          <select
            aria-label="Active outlet"
            value={activeOutletId}
            onChange={(event) => selectOutlet(event.target.value)}
          >
            <option value="">All outlets</option>
            {data?.outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </span>
        <button
          className="sm-icon"
          aria-label="Notifications"
          onClick={() => setPanel(panel === 'alerts' ? null : 'alerts')}
        >
          <Bell size={18} />
          <i />
        </button>
        <button
          className="sm-avatar"
          aria-label="Profile"
          onClick={() => setPanel(panel === 'profile' ? null : 'profile')}
        >
          {user?.name?.slice(0, 2).toUpperCase() || 'SM'}
        </button>
      </header>
      {panel && (
        <div className="sm-header-panel">
          {panel === 'alerts' ? (
            <>
              <strong>Order updates</strong>
              <p>
                {data?.orders.filter((order) => order.status === 'DEFERRED').length || 0} deferred
                orders need your attention.
              </p>
              <Link to="/store/orders" onClick={() => setPanel(null)}>
                View My Orders &rarr;
              </Link>
            </>
          ) : (
            <>
              <strong>{user?.name || 'Store Manager'}</strong>
              <p>{user?.email}</p>
              <button
                className="sm-btn sm-secondary"
                onClick={() => {
                  logout();
                  navigate('/store/login');
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
export function StoreBottomNav() {
  const location = useLocation();
  const tracking =
    location.pathname.endsWith('/track') ||
    (location.pathname === '/store/orders' &&
      new URLSearchParams(location.search).get('status') === 'IN_TRANSIT');
  const [support, setSupport] = useState(false);
  return (
    <>
      <nav className="sm-bottom" aria-label="Store navigation">
        <div className="sm-nav-heading">Store workspace</div>
        <NavLink to="/store" end>
          <LayoutGrid />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/store/orders"
          end
          className={() => (location.pathname === '/store/orders' && !tracking ? 'active' : '')}
        >
          <Package />
          <span>My Orders</span>
        </NavLink>
        <NavLink to="/store/orders/new" className="sm-new" aria-label="Place new order">
          <Plus />
          <span className="sm-nav-create-label">New Order</span>
        </NavLink>
        <NavLink to="/store/orders?status=IN_TRANSIT" className={() => (tracking ? 'active' : '')}>
          <Route />
          <span>Tracking</span>
        </NavLink>
        <button onClick={() => setSupport(!support)}>
          <Headphones />
          <span>Support</span>
        </button>
      </nav>
      {support && (
        <div className="sm-support" role="status">
          <strong>Need assistance?</strong>
          <p>
            Contact your assigned outlet or depot administrator for dispatch and account support.
          </p>
          <button onClick={() => setSupport(false)}>Close</button>
        </div>
      )}
    </>
  );
}
export function StoreShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const page =
    pathname === '/store' || pathname === '/store/'
      ? 'dashboard'
      : pathname === '/store/orders'
        ? 'orders'
        : pathname.endsWith('/new')
          ? 'new'
          : pathname.endsWith('/review')
            ? 'review'
            : pathname.endsWith('/track')
              ? 'tracking'
              : pathname.endsWith('/deferred')
                ? 'deferred'
                : pathname.endsWith('/receipt')
                  ? 'receipt'
                  : pathname.endsWith('/confirmation')
                    ? 'confirmation'
                    : 'details';
  return (
    <div className="store-ui">
      <div className="sm-app">
        <StoreHeader />
        <div className="sm-workspace">
          {isStoreDemo && (
            <div className="sm-demo">Development preview - sample data - changes are temporary</div>
          )}
          <main className={`sm-main sm-page-${page}`}>{children}</main>
        </div>
        <StoreBottomNav />
      </div>
    </div>
  );
}
export function PageTitle({
  title,
  subtitle,
  back = '/store',
  aside,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="sm-page-title">
      <Link className="sm-icon sm-blue" to={back} aria-label="Go back">
        <ArrowLeft size={18} />
      </Link>
      <div>
        {subtitle && <span className="sm-eyebrow">{subtitle}</span>}
        <h1>{title}</h1>
      </div>
      {aside && <div className="sm-title-aside">{aside}</div>}
    </div>
  );
}
