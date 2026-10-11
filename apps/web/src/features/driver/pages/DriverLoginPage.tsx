import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Compass, Truck, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth, getRolePortalPath } from '../../auth/AuthContext';
import '../driver.css';
export function DriverLoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (isAuthenticated && user) return <Navigate to={getRolePortalPath(user.role)} replace />;
  return (
    <main className="driver-shell driver-login">
      <Link className="driver-brand" to="/">
        <Compass />
        <span>
          WAYPOINT<small>DELIVERY</small>
        </span>
      </Link>
      <span className="driver-tag">DRIVER &amp; FLEET PORTAL</span>
      <section className="driver-card">
        <h1>Welcome Back</h1>
        <p className="driver-muted">
          Sign in to access your assigned route, stop sequence and delivery manifests.
        </p>
        <div className="driver-login-callout">
          <Truck size={24} />
          <div>
            <strong>Your delivery day, connected</strong>
            <small>Route information and proof of delivery in one place.</small>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const result = await login(email.trim(), password);
              navigate(getRolePortalPath(result.user.role), { replace: true });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Unable to sign in.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="driver-email">
            Driver Email
            <input
              id="driver-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              placeholder="driver@waypoint.local"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label htmlFor="driver-password">Password</label>
          <div className="driver-password-field">
            <input
              id="driver-password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button
              type="button"
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p className="driver-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </p>
          )}
          <button className="driver-button" disabled={busy}>
            {busy ? 'Signing in…' : "Sign In to Today's Route"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
      <section className="today-safety">
        <ShieldCheck size={20} />
        <div>
          <strong>Driver Safety Notice</strong>
          <p>
            Use the portal only while safely parked. Delivery records remain available offline after
            your route is loaded.
          </p>
        </div>
      </section>
      <p className="driver-login-footer">Waypoint Logistics · Team BJM</p>
    </main>
  );
}
