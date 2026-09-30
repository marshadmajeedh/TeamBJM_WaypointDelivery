import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Route, PackageCheck, Truck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchHealth } from '../../services/api';

export const OverviewPortal: React.FC = () => {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    retry: 1,
  });

  const portals = [
    {
      title: 'Store Manager Portal',
      description: 'Order placement, delivery status tracking, and receipt confirmation.',
      path: '/store',
      icon: ShoppingBag,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      badge: 'Responsive',
    },
    {
      title: 'Dispatcher Portal',
      description: 'Fleet allocation engine, delivery planning, and deferral monitoring.',
      path: '/dispatcher',
      icon: Route,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      badge: 'Desktop-First',
    },
    {
      title: 'Loader Portal',
      description: 'Warehouse vehicle loading verification and dispatch sign-off.',
      path: '/loader',
      icon: PackageCheck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      badge: 'Tablet-Ready',
    },
    {
      title: 'Driver Portal',
      description: 'Route progression, offline delivery logs, and proof-of-delivery sync.',
      path: '/driver',
      icon: Truck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      badge: 'Mobile-First / PWA',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span>Rootcode Tech-Triathlon 2026</span>
            <span>•</span>
            <span>Team BJM</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Waypoint Delivery Planning System
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm sm:text-base leading-relaxed">
            End-to-end delivery management connecting store ordering, dispatcher planning,
            warehouse loading, driver offline delivery, and receipt verification.
          </p>
        </div>

        {/* Backend connectivity indicator badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Backend Health API:</span>
            {isLoading ? (
              <span className="text-amber-400 font-medium">Checking connection...</span>
            ) : isError ? (
              <span className="inline-flex items-center text-rose-400 font-medium space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>API Offline (Start backend on port 4000)</span>
              </span>
            ) : (
              <span className="inline-flex items-center text-emerald-400 font-medium space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected ({health?.service}: {health?.status})</span>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Environment: Initial Foundation Phase
          </div>
        </div>
      </div>

      {/* Role Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link
              key={portal.path}
              to={portal.path}
              className="group p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg border ${portal.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {portal.badge}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  {portal.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">{portal.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs font-semibold text-blue-400 flex items-center space-x-1">
                <span>Open Portal</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
