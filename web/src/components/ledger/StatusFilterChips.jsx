import React from 'react';
import clsx from 'clsx';
import { OUTBOUND_STATES, OUTBOUND_STATE_META } from '../../lib/priority.js';

/**
 * Multi-select colour filters for the outbound leg. An empty selection
 * means "show everything" rather than "show nothing", which matches how
 * people expect a set of toggles to behave.
 */
export default function StatusFilterChips({ selected, onChange, counts }) {
  const toggle = (state) => {
    const next = new Set(selected);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    onChange(next);
  };

  const isAll = selected.size === 0;

  return (
    <div className="flex items-stretch">
      <button
        onClick={() => onChange(new Set())}
        title="Clear status filters"
        className={clsx(
          'px-2.5 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
          isAll ? 'text-[var(--accent)] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        )}
      >
        All
      </button>

      {OUTBOUND_STATES.map((state) => {
        const meta = OUTBOUND_STATE_META[state];
        const active = selected.has(state);
        return (
          <button
            key={state}
            onClick={() => toggle(state)}
            title={`${meta.label} — click to ${active ? 'remove' : 'add'} filter`}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
              active ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <span
              className={clsx('w-2 h-2 shrink-0 transition-opacity', !active && 'opacity-45')}
              style={{ background: meta.color }}
            />
            {meta.short}
            {counts && <span className="text-[var(--text-dim)]">{String(counts[state] ?? 0).padStart(2, '0')}</span>}
          </button>
        );
      })}
    </div>
  );
}
