import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DesktopLayout } from '../../layouts/DesktopLayout';

export const StoreManagerPortal: React.FC = () => {
  return (
    <DesktopLayout title="Store Manager Portal">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Store Manager Portal</h2>
            <p className="text-sm text-slate-400">Order placement, tracking, and receipt confirmation</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          Foundation placeholder active. Workflows for placing daily outlet orders, tracking delivery ETAs,
          and confirming received shipments will be connected in feature implementation.
        </p>
      </div>
    </DesktopLayout>
  );
};
