import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, ShieldCheck, LogOut, User } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (location.pathname.startsWith('/driver')) return <Outlet />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Waypoint</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Team BJM
              </span>
            </div>
          </div>

          {/* Navigation Links for Foundation Testing */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              Overview
            </NavLink>
            <NavLink
              to="/store"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              Store
            </NavLink>
            <NavLink
              to="/dispatcher"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              Dispatcher
            </NavLink>
            <NavLink
              to="/loader"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              Loader
            </NavLink>
            <NavLink
              to="/driver"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              Driver
            </NavLink>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 border-l border-slate-800 pl-3 sm:pl-4">
                <div className="text-right hidden sm:block">
                  <div className="text-xs sm:text-sm font-medium text-white truncate max-w-[150px] flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 inline" />
                    <span>{user.name || user.email.split('@')[0]}</span>
                  </div>

                  <div className="text-[10px] font-mono text-blue-400 font-semibold">
                    {user.role}
                  </div>

                </div>
                <button
                  id="header-logout-button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1.5 border border-slate-700/60 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors border border-slate-700 ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Waypoint Delivery Planning System • Tech-Triathlon 2026 • Team BJM</span>
      </footer>
    </div>
  );
};
