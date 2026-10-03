import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth, getRolePortalPath } from './AuthContext';

export const LoginPortal: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // If already authenticated, redirect to role portal immediately
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = getRolePortalPath(user.role);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(trimmedEmail, password);
      const roleDestination = getRolePortalPath(result.user.role);

      // Check if user was attempting to reach their designated portal prior to redirect
      const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const target = fromPath && fromPath.startsWith(roleDestination) ? fromPath : roleDestination;

      navigate(target, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreFill = (accountEmail: string) => {
    setEmail(accountEmail);
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-500/10 text-blue-400 rounded-full mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign In</h2>
          <p className="text-sm text-slate-400">Waypoint Delivery Planning System</p>
        </div>

        {errorMessage && (
          <div
            id="login-error-alert"
            role="alert"
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. loader@waypoint.local"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type={visible ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible(!visible)}
              className="flex items-center gap-2 text-sm mt-2"
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              {visible ? 'Hide' : 'Show'} password
            </button>
          </div>

          <button
            id="sign-in-button"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-slate-200">Seeded Foundation Accounts:</p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handlePreFill('storemanager@waypoint.local')}
              className="text-left p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              Store Manager
            </button>
            <button
              type="button"
              onClick={() => handlePreFill('dispatcher@waypoint.local')}
              className="text-left p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              Dispatcher
            </button>
            <button
              type="button"
              onClick={() => handlePreFill('loader@waypoint.local')}
              className="text-left p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              Loader
            </button>
            <button
              type="button"
              onClick={() => handlePreFill('driver@waypoint.local')}
              className="text-left p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              Driver
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Passwords configured via local environment variables.
          </p>
        </div>
      </div>
    </div>
  );
};
