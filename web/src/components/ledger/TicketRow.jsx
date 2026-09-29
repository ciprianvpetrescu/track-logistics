import React from 'react';
import clsx from 'clsx';
import { RefreshCw, ExternalLink } from 'lucide-react';
import NoteFieldCell from './NoteFieldCell.jsx';
import { getOutboundState, getReturnTone, OUTBOUND_STATE_META } from '../../lib/priority.js';

function StatusCell({ tracking, status, carrier, tone }) {
  const href =
    carrier === 'courierA'
      ? `https://tracking.example-courier.com/ie/en/tracking.html#/results?id=${tracking}`
      : `https://www.example-courier.com/track?num=${tracking}`;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={clsx('w-1.5 h-6 shrink-0', tone.blink && 'blink-slow')} style={{ background: tone.color }} />
      <div className="min-w-0 leading-tight">
        {tracking && tracking !== '-' ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-console text-[11px] text-[var(--text-primary)] hover:text-[var(--accent)] inline-flex items-center gap-1"
          >
            {tracking}
            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
          </a>
        ) : (
          <span className="font-console text-[11px] text-[var(--text-dim)]">—</span>
        )}
        <div className="font-console text-[10px] truncate max-w-[230px] uppercase tracking-[0.04em]" style={{ color: tone.color }}>
          {status}
        </div>
      </div>
    </div>
  );
}

export default function TicketRow({ row, isSelected, isRefreshing, onSelect, onForceRefresh }) {
  const outMeta = OUTBOUND_STATE_META[getOutboundState(row)];
  const outTone = { color: outMeta.color, blink: outMeta.blink };
  const retTone = getReturnTone(row.returnStatus);

  return (
    <tr
      id={`row-${row.ticketRef}`}
      onClick={() => onSelect(row)}
      className={clsx(
        'border-b border-[var(--rule)] cursor-pointer select-text transition-colors',
        isSelected ? 'bg-[var(--accent)]/12' : 'hover:bg-white/[0.025]'
      )}
    >
      <td className="py-1.5 pl-2 w-[10px]">
        <span className={clsx('block w-[3px] h-8', isSelected ? 'bg-[var(--accent)]' : 'bg-transparent')} />
      </td>
      <td className="py-1.5 pr-3">
        <div className="flex items-center gap-2">
          <a
            href={`https://ticket-queue.example.com/now/nav/ui/search/0f8b85d0c7922010099a308dc7c2606a/params/search-term/${row.ticketRef}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-console text-[11px] font-bold text-[var(--text-primary)] hover:text-[var(--accent)]"
          >
            {row.ticketRef}
          </a>
          <button
            onClick={(e) => onForceRefresh(e, row.ticketRef, row.carrier)}
            title="Re-poll carrier"
            className="text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
          >
            <RefreshCw className={clsx('h-3 w-3', isRefreshing && 'animate-spin text-[var(--accent)]')} />
          </button>
        </div>
        <div className="font-console text-[9px] text-[var(--text-dim)] uppercase tracking-[0.1em] mt-0.5">{row.carrier}</div>
      </td>
      <td className="py-1.5 pr-3 truncate max-w-[160px] text-[11px] text-[var(--text-secondary)]" title={row.name}>
        {row.name}
      </td>
      <td className="py-1.5 pr-3">
        <StatusCell tracking={row.outboundTrk} status={row.outboundStatus} carrier={row.carrier} tone={outTone} />
      </td>
      <td className="py-1.5 pr-3">
        <StatusCell tracking={row.returnTrk} status={row.returnStatus} carrier={row.carrier} tone={retTone} />
      </td>
      <td className="py-1.5 pr-2 w-[180px]">
        <NoteFieldCell ticketRef={row.ticketRef} initialNote={row.note} />
      </td>
    </tr>
  );
}
