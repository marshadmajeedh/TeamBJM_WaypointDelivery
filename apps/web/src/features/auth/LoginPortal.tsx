import React from 'react';
import { KeyRound } from 'lucide-react';

export const LoginPortal: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-500/10 text-blue-400 rounded-full mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Login Portal</h2>
          <p className="text-sm text-slate-400">Waypoint Delivery Planning System</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200">Pre-seeded Test Accounts:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-mono text-[11px]">
            <li>storemanager@waypoint.local</li>
            <li>dispatcher@waypoint.local</li>
            <li>loader@waypoint.local</li>
            <li>driver@waypoint.local</li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Authentication logic and JWT session handling will be activated in the auth feature milestone.
        </p>
      </div>
    </div>
  );
};
