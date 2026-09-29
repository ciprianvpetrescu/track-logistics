import React from 'react';
import Panel from '../ui/Panel.jsx';
import { OUTBOUND_STATE_META } from '../../lib/priority.js';

const VECTORS = [
  { label: 'Outbound', color: 'var(--accent)' },
  { label: 'Return leg', color: 'var(--signal-blue)' },
  { label: 'Faulted', color: OUTBOUND_STATE_META.fault.color },
];

export default function MapLegend({ total }) {
  return (
    <Panel label="Vector Key" status={`${total} NODES`} draggable className="h-full">
      <div className="p-2.5 space-y-1.5 overflow-auto h-full">
        {VECTORS.map((e) => (
          <div key={e.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 border border-[var(--bg-void)] shrink-0" style={{ background: e.color }} />
            <span className="font-console text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.08em]">{e.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1.5 mt-1.5 border-t border-[var(--rule)]">
          <span className="w-2.5 h-2.5 shrink-0 relative">
            <span className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--accent)] -translate-x-1/2" />
            <span className="absolute top-1/2 left-0 right-0 h-px bg-[var(--accent)] -translate-y-1/2" />
          </span>
          <span className="font-console text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.08em]">Origin · Swords</span>
        </div>
      </div>
    </Panel>
  );
}
