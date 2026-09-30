import React from 'react';
import { PackageCheck } from 'lucide-react';

export const LoaderPortal: React.FC = () => {
  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Loader Portal</h1>
        <div className="text-xs text-slate-500 font-mono">Tablet / Responsive Environment</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Loader Portal</h2>
            <p className="text-sm text-slate-400">Warehouse loading tasks, item checklists, and dispatch sign-off</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          Foundation placeholder active. Workflows for loading vehicle queues, verifying item counts and temperature
          requirements, reporting discrepancies, and marking vehicles ready for dispatch will be integrated here.
        </p>
      </div>
    </div>
  );
};
