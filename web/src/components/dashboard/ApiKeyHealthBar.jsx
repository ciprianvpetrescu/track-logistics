import React from 'react';
import clsx from 'clsx';
import Panel from '../ui/Panel.jsx';

export default function ApiKeyHealthBar({ apiSettings, onSetMode, lifecycleFilter, onSetLifecycleFilter }) {
  const keys = apiSettings.keys || [];
  const okCount = keys.filter((k) => k.status === 'OK').length;

  return (
    <Panel
      label="CourierA Key Cluster"
      status={`${okCount}/${keys.length} OK`}
      draggable
      className="h-full"
      bodyClass="p-2.5 space-y-2.5 overflow-auto"
    >
      {/* Key bank */}
      <div className="grid grid-cols-4 gap-1">
        {keys.map((k) => {
          const ok = k.status === 'OK';
          return (
            <div key={k.id} title={`Key ${k.id}: ${k.status}`} className="border border-[var(--rule)] bg-[var(--bg-inset)]">
              <div className={clsx('h-1.5', ok ? 'bg-[var(--signal-green)]' : 'hatch-warn blink-slow')} />
              <div className="px-1 py-1 text-center">
                <div className="font-console text-[10px] font-bold text-[var(--text-secondary)] leading-none">K{k.id}</div>
                <div
                  className={clsx('font-console text-[8px] mt-1 leading-none truncate', ok ? 'text-[var(--text-muted)]' : 'text-[var(--signal-red)]')}
                >
                  {ok ? 'OK' : 'LIM'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <label className="panel-label text-[9px] text-[var(--text-muted)] block">Routing Mode</label>
        <select
          value={apiSettings.mode}
          onChange={(e) => onSetMode(e.target.value)}
          className="w-full bg-[var(--bg-inset)] border border-[var(--rule)] text-[10px] text-[var(--text-primary)] px-2 h-7 outline-none uppercase tracking-wider"
        >
          <option value="AUTO">Auto-Fallback</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              Force Key {k.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="panel-label text-[9px] text-[var(--text-muted)] block">Lifecycle Filter</label>
        <select
          value={lifecycleFilter}
          onChange={(e) => onSetLifecycleFilter(e.target.value)}
          className="w-full bg-[var(--bg-inset)] border border-[var(--rule)] text-[10px] text-[var(--text-primary)] px-2 h-7 outline-none uppercase tracking-wider"
        >
          <option value="all">All Statuses</option>
          <option value="shipping">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="awaiting">Awaiting Collection</option>
        </select>
      </div>
    </Panel>
  );
}
