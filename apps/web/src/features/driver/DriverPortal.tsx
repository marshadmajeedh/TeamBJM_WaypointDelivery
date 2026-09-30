import React from 'react';
import { Truck, Wifi } from 'lucide-react';
import { MobileLayout } from '../../layouts/MobileLayout';

export const DriverPortal: React.FC = () => {
  return (
    <MobileLayout
      title="Driver Portal"
      badge="Active Run"
      actions={
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <Wifi className="w-4 h-4" />
            <span>PWA Offline Mode Ready</span>
          </div>
          <span className="font-mono">Dexie v4</span>
        </div>
      }
    >
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Driver Portal</h2>
            <p className="text-xs text-slate-400">Mobile-First Delivery Manifest</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Foundation placeholder active. Workflows for route progression, proof-of-delivery capture,
          offline caching in IndexedDB, and automatic queue synchronization will be connected here.
        </p>
      </div>
    </MobileLayout>
  );
};
