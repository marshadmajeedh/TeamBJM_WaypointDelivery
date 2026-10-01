import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Building2, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '@waypoint/shared';
import { useAuth } from '../../auth/AuthContext';
import { Brand } from '../components/StoreShell';
import '../store.css';
export function StoreLogin() {
  const { login, user, isAuthenticated, getRolePortalPath } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('waypoint.store.email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [help, setHelp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    window.addEventListener('online', change);
    window.addEventListener('offline', change);
    return () => {
      window.removeEventListener('online', change);
      window.removeEventListener('offline', change);
    };
  }, []);
  if (isAuthenticated && user) return <Navigate to={getRolePortalPath(user.role)} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      try {
        if (remember) localStorage.setItem('waypoint.store.email', email.trim());
        else localStorage.removeItem('waypoint.store.email');
      } catch {
        /* Authentication does not depend on remembered email. */
      }
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(
        result.user.role === UserRole.STORE_MANAGER &&
          from?.startsWith('/store/') &&
          from !== '/store/login'
          ? from
          : getRolePortalPath(result.user.role),
        { replace: true }
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="store-ui sm-login-page">
      <div className="sm-login-layout">
        <aside className="sm-login-intro">
          <div className="sm-login-intro-icon">
            <Building2 size={36} />
          </div>
          <span className="sm-eyebrow">WAYPOINT DELIVERY</span>
          <h2>
            Keep every delivery
            <br />
            on track.
          </h2>
          <p>One workspace for your store's orders, incoming deliveries and receiving team.</p>
          <ul>
            <li>Plan your next replenishment</li>
            <li>Follow each delivery to your outlet</li>
            <li>Verify stock and confirm receipts</li>
          </ul>
          <span className="sm-login-intro-footer">
            <ShieldCheck size={18} /> Your store. Connected to your depot.
          </span>
        </aside>
        <div className="sm-login">
          <Brand />
          <span className="sm-badge">Store Manager Portal</span>
          <div className="sm-login-mark">
            <LockKeyhole size={28} />
          </div>
          <h1>Welcome Back</h1>
          <p className="sm-muted">Sign in to manage your store deliveries.</p>
          <div className="sm-inset sm-driver">
            <Building2 size={25} />
            <div>
              <small>Assigned outlet</small>
              <strong>Your depot's store outlets</strong>
              <small>Available after secure sign-in</small>
            </div>
          </div>
          <form onSubmit={submit}>
            <label className="sm-field">
              Work email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your work email"
              />
            </label>
            <label className="sm-field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </label>
            <div className="sm-row">
              <label className="sm-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <button className="sm-link" type="button" onClick={() => setHelp(!help)}>
                Forgot password?
              </button>
            </div>
            <p className="sm-muted">
              Remember me saves your email only. Your sign-in stays in this browser session.
            </p>
            {error && (
              <p className="sm-error" role="alert">
                {error}
              </p>
            )}
            <button className="sm-btn" disabled={pending || !online}>
              {pending ? 'Signing in...' : 'Sign In to Portal >'}
            </button>
          </form>
          {help && (
            <div role="status" className="sm-inset">
              Contact your depot administrator to reset your password. Self-service password reset
              is not configured.
            </div>
          )}
          <div className="sm-divider" />
          <p className="sm-muted sm-center">
            <ShieldCheck size={16} /> Secure access for authorized store managers
          </p>
          <button className="sm-btn sm-text-btn" onClick={() => setHelp(!help)}>
            Need help? Contact support
          </button>
          <p className="sm-network">
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Device network connected' : 'Device offline'}
          </p>
          <Link className="sm-muted sm-center sm-block" to="/">
            Back to Waypoint overview
          </Link>
        </div>
      </div>
    </div>
  );
}
