import React from 'react';

interface MobileLayoutProps {
  title: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ title, badge, actions, children }) => {
  return (
    <div className="flex-1 flex flex-col max-w-md w-full mx-auto bg-slate-900 border-x border-slate-800 min-h-[calc(100vh-4rem)]">
      {/* Mobile Top App Bar */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-16 z-40">
        <div>
          <h1 className="text-lg font-bold text-slate-100">{title}</h1>
          {badge && <span className="text-xs text-blue-400 font-medium">{badge}</span>}
        </div>
        <div className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-400">
          Mobile View
        </div>
      </header>

      {/* Scrollable Content Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {children}
      </div>

      {/* Sticky Bottom Actions if provided */}
      {actions && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 sticky bottom-0 z-40">
          {actions}
        </div>
      )}
    </div>
  );
};
