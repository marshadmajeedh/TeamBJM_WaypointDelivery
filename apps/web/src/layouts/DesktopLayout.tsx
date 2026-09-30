import React from 'react';

interface DesktopLayoutProps {
  title: string;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ title, sidebar, children }) => {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar for Desktop navigation/controls */}
      {sidebar && (
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 hidden md:flex flex-col">
          {sidebar}
        </aside>
      )}

      {/* Main Workspace */}
      <section className="flex-1 flex flex-col overflow-y-auto p-6">
        <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h1>
          <div className="text-xs text-slate-500 font-mono">Desktop-First Environment</div>
        </div>
        <div className="flex-1">{children}</div>
      </section>
    </div>
  );
};
