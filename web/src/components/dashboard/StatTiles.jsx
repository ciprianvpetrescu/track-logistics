import React from 'react';
import clsx from 'clsx';
import Panel from '../ui/Panel.jsx';
import { OUTBOUND_STATES, OUTBOUND_STATE_META } from '../../lib/priority.js';

function Readout({ label, value, unit, tone = 'var(--text-primary)', sub }) {
  return (
    <div className="flex-1 px-3 py-2.5 min-w-0">
      <div className="panel-label text-[9px] text-[var(--text-muted)] truncate">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-console text-[26px] font-bold leading-none" style={{ color: tone }}>
          {value}
        </span>
        {unit && <span className="font-console text-[12px] font-bold" style={{ color: tone }}>{unit}</span>}
      </div>
      {sub && <div className="font-console text-[9px] text-[var(--text-muted)] mt-1 truncate">{sub}</div>}
    </div>
  );
}

export default function StatTiles({ activeCount, apiSuccessRate, counts, statusFilter, onToggleStatus }) {
  const apiTone =
    apiSuccessRate >= 95 ? 'var(--signal-green)' : apiSuccessRate >= 75 ? 'var(--signal-amber)' : 'var(--signal-red)';

  return (
    <Panel
      label="Tracking · Status"
      accent
      ticks
      sweep
      status={apiSuccessRate >= 95 ? 'NOMINAL' : 'DEGRADED'}
      draggable
      className="h-full"
      bodyClass="overflow-auto"
    >
      <div className="flex divide-x divide-[var(--rule)]">
        <Readout label="Active" value={activeCount} sub="in current view" />
        <Readout label="API Health" value={apiSuccessRate} unit="%" tone={apiTone} sub="courier A cluster" />
      </div>

      <div className="border-t border-[var(--rule)] grid grid-cols-4 divide-x divide-[var(--rule)]">
        {OUTBOUND_STATES.map((state) => {
          const meta = OUTBOUND_STATE_META[state];
          const active = statusFilter.has(state);
          return (
            <button
              key={state}
              onClick={() => onToggleStatus(state)}
              title={`${meta.label} — click to filter`}
              className={clsx(
                'px-2 py-2 text-left transition-colors',
                active ? 'bg-[var(--accent)]/12' : 'hover:bg-white/[0.03]'
              )}
            >
              <div className="panel-label text-[9px] text-[var(--text-muted)] truncate">{meta.short}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className={clsx('w-1.5 h-4 shrink-0 transition-opacity', !active && statusFilter.size > 0 && 'opacity-40')}
                  style={{ background: meta.color }}
                />
                <span className="font-console text-[15px] font-bold leading-none" style={{ color: meta.color }}>
                  {String(counts[state] ?? 0).padStart(2, '0')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {statusFilter.size > 0 && (
        <div className="border-t border-[var(--rule)] px-2.5 py-1.5 flex items-center justify-between gap-2 bg-[var(--bg-inset)]">
          <span className="panel-label text-[9px] text-[var(--accent)] truncate">
            Filtering · {[...statusFilter].map((s) => OUTBOUND_STATE_META[s].short).join(' + ')}
          </span>
          <button
            onClick={() => onToggleStatus(null)}
            className="panel-label text-[9px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
          >
            Clear
          </button>
        </div>
      )}
    </Panel>
  );
}
