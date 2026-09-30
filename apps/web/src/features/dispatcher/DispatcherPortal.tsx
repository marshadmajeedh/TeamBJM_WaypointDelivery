import React from 'react';
import { Route } from 'lucide-react';
import { DesktopLayout } from '../../layouts/DesktopLayout';

export const DispatcherPortal: React.FC = () => {
  return (
    <DesktopLayout title="Dispatcher Portal">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <Route className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Dispatcher Portal</h2>
            <p className="text-sm text-slate-400">Delivery planning, vehicle allocation, and route management</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          Foundation placeholder active. Workflows for review of confirmed orders, running daily allocation
          under physical constraints, recording order deferrals, and dispatching vehicles will be connected here.
        </p>
      </div>
    </DesktopLayout>
  );
};
