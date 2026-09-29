import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Trash2, ChevronRight, Mail, MessageSquarePlus, Clock } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { getOutboundState, OUTBOUND_STATE_META } from '../../lib/priority.js';

function UpdateComposer({ ticketRef, operatorName, onAddUpdate }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAddUpdate(ticketRef, trimmed, operatorName);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
        }}
        rows={3}
        placeholder="Log what's happening with this delivery or user…"
        className="w-full bg-[var(--bg-surface)] border border-[var(--rule)] p-2 text-[11px] leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-y placeholder:text-[var(--text-dim)]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="panel-label text-[9px] text-[var(--text-dim)]">Ctrl+Enter to log</span>
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 h-7 border font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
            !text.trim() || busy
              ? 'border-[var(--rule)] text-[var(--text-dim)] cursor-not-allowed'
              : 'bg-[var(--accent)] border-[var(--accent)] text-black hover:bg-[#ff8442]'
          )}
        >
          <MessageSquarePlus className="h-3 w-3" />
          {busy ? 'Logging…' : 'Log Update'}
        </button>
      </div>
    </form>
  );
}

function Journal({ ticketRef, entries, operatorName, onAddUpdate, onDeleteUpdate }) {
  const ordered = [...entries].sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-3 bg-[var(--bg-inset)] border-l-2 border-[var(--accent)]">
      <div className="min-w-0">
        <div className="panel-label text-[9px] text-[var(--text-muted)] mb-2">
          Case Journal · {ordered.length} {ordered.length === 1 ? 'entry' : 'entries'}
        </div>
        {ordered.length === 0 ? (
          <div className="font-console text-[10px] text-[var(--text-dim)] uppercase tracking-[0.1em] py-4">
            No updates logged yet
          </div>
        ) : (
          <ol className="space-y-0 border-l border-[var(--rule)] ml-1">
            {ordered.map((entry) => (
              <li key={entry.id} className="relative pl-4 pb-3 group">
                <span className="absolute left-0 top-[5px] w-2 h-2 -translate-x-1/2 bg-[var(--accent)]" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-console text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {entry.author}
                  </span>
                  <span className="flex items-center gap-1 font-console text-[9px] text-[var(--text-dim)]">
                    <Clock className="h-2.5 w-2.5" />
                    {entry.timestamp}
                  </span>
                  <button
                    onClick={() => onDeleteUpdate(ticketRef, entry.id)}
                    title="Delete entry"
                    className="ml-auto text-[var(--text-dim)] hover:text-[var(--signal-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
                  {entry.text}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="min-w-0">
        <div className="panel-label text-[9px] text-[var(--text-muted)] mb-2">Add Update</div>
        <UpdateComposer ticketRef={ticketRef} operatorName={operatorName} onAddUpdate={onAddUpdate} />
      </div>
    </div>
  );
}

export default function FollowUpsTab({
  alerts,
  rows,
  selectedTask,
  onSelectTicketRef,
  onDeleteThread,
  updates,
  operatorName,
  onAddUpdate,
  onDeleteUpdate,
}) {
  const [expanded, setExpanded] = useState(selectedTask || null);
  const [onlyWithUpdates, setOnlyWithUpdates] = useState(false);

  const alertsByTicketRef = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      if (a.ticketRef) map[a.ticketRef] = a;
    });
    return map;
  }, [alerts]);

  const visibleRows = useMemo(() => {
    const withCount = rows.map((row) => ({ row, entries: updates[row.ticketRef] || [] }));
    const filtered = onlyWithUpdates ? withCount.filter((r) => r.entries.length > 0) : withCount;
    // Most recently updated first, then everything else in ledger order.
    return filtered.sort((a, b) => {
      const aTime = a.entries.length ? Math.max(...a.entries.map((e) => e.timeMs || 0)) : 0;
      const bTime = b.entries.length ? Math.max(...b.entries.map((e) => e.timeMs || 0)) : 0;
      return bTime - aTime;
    });
  }, [rows, updates, onlyWithUpdates]);

  const totalLogged = useMemo(() => Object.values(updates).reduce((n, arr) => n + arr.length, 0), [updates]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-7 shrink-0 flex items-center gap-3 px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <span className="panel-label text-[var(--text-muted)]">
          {totalLogged} update{totalLogged === 1 ? '' : 's'} across {Object.keys(updates).length} consignment
          {Object.keys(updates).length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => setOnlyWithUpdates((v) => !v)}
          className={clsx(
            'px-1.5 h-5 border font-console text-[9px] font-bold uppercase tracking-[0.08em] transition-colors',
            onlyWithUpdates
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--rule-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          With updates only
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--bg-header)]">
              {['', 'Task', 'Consignee', 'Outbound', 'Latest Update', 'Entries', ''].map((c, i) => (
                <th key={i} className="panel-label text-left py-1.5 pr-3 first:pl-2 border-b border-[var(--rule)] whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, entries }) => {
              const isOpen = expanded === row.ticketRef;
              const meta = OUTBOUND_STATE_META[getOutboundState(row)];
              const latest = entries.length
                ? [...entries].sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0))[0]
                : null;
              const alert = alertsByTicketRef[row.ticketRef];

              return (
                <React.Fragment key={row.ticketRef}>
                  <tr
                    className={clsx(
                      'border-b border-[var(--rule)] cursor-pointer transition-colors',
                      isOpen ? 'bg-[var(--accent)]/10' : 'hover:bg-white/[0.025]'
                    )}
                    onClick={() => {
                      setExpanded(isOpen ? null : row.ticketRef);
                      onSelectTicketRef(row.ticketRef);
                    }}
                  >
                    <td className="py-2 pl-2 w-[20px]">
                      <ChevronRight className={clsx('h-3 w-3 text-[var(--text-dim)] transition-transform', isOpen && 'rotate-90')} />
                    </td>
                    <td className="py-2 pr-3 font-console text-[11px] font-bold text-[var(--text-primary)] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {row.ticketRef}
                        {alert && <Mail className="h-3 w-3 text-[var(--signal-amber)]" title="Has email follow-up" />}
                      </span>
                    </td>
                    <td className="py-2 pr-3 truncate max-w-[180px] text-[11px] text-[var(--text-secondary)]">{row.name}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-4 shrink-0" style={{ background: meta.color }} />
                        <span className="font-console text-[10px] uppercase tracking-[0.04em]" style={{ color: meta.color }}>
                          {meta.short}
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 truncate max-w-[340px] text-[11px] text-[var(--text-muted)]">
                      {latest ? latest.text : <span className="italic text-[var(--text-dim)]">—</span>}
                    </td>
                    <td className="py-2 pr-3">
                      {entries.length > 0 ? (
                        <Badge tone="accent">{entries.length}</Badge>
                      ) : (
                        <span className="font-console text-[10px] text-[var(--text-dim)]">0</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {alert && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(alert.threadId, e);
                          }}
                          title="Dismiss email thread"
                          className="text-[var(--text-dim)] hover:text-[var(--signal-red)] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-[var(--rule)]">
                        {alert?.lastSentBody && (
                          <div className="bg-[var(--bg-surface)] border-l-2 border-[var(--signal-amber)] px-4 py-2.5">
                            <div className="panel-label text-[9px] text-[var(--signal-amber)] mb-1.5">Last Email Sent</div>
                            <div className="font-console text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                              {alert.lastSentBody}
                            </div>
                          </div>
                        )}
                        <Journal
                          ticketRef={row.ticketRef}
                          entries={entries}
                          operatorName={operatorName}
                          onAddUpdate={onAddUpdate}
                          onDeleteUpdate={onDeleteUpdate}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 font-console text-[11px] text-[var(--text-dim)] uppercase tracking-[0.1em]">
                  {onlyWithUpdates ? 'No consignments have updates yet' : 'No consignments match current filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
