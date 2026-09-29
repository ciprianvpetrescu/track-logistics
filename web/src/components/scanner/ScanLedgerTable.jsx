import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { X, FileSpreadsheet, FileText, Search } from 'lucide-react';
import Panel from '../ui/Panel.jsx';

const COLS = ['', 'Time', 'Scanned SN', 'Serial from ticket', 'Model', 'State', 'Substate', 'Check', ''];

const VERDICTS = [
  { id: 'TRUE', label: 'Match', color: 'var(--signal-green)' },
  { id: 'FALSE', label: 'No Match', color: 'var(--signal-red)' },
  { id: 'DUPLICATE', label: 'Duplicate', color: 'var(--signal-amber)' },
];

const verdictMeta = (status) => VERDICTS.find((v) => v.id === status) || VERDICTS[1];

export default function ScanLedgerTable({ items, onRemove, onExportCsv, onExportTemplate, exporting }) {
  const [filter, setFilter] = useState(new Set());
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c = { TRUE: 0, FALSE: 0, DUPLICATE: 0 };
    items.forEach((i) => {
      c[i.matchStatus] = (c[i.matchStatus] || 0) + 1;
    });
    return c;
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter.size > 0 && !filter.has(item.matchStatus)) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return `${item.scannedSn} ${item.model} ${item.substate}`.toLowerCase().includes(q);
      }),
    [items, filter, query]
  );

  const toggle = (id) =>
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Panel
      label="Scan Ledger"
      status={`${counts.TRUE}/${items.length} MATCHED`}
      className="flex-1 min-h-0"
      bodyClass="flex flex-col min-h-0"
      headerRight={
        <div className="flex items-center gap-1">
          <button
            onClick={onExportCsv}
            disabled={items.length === 0 || exporting}
            title="Export scanned serial numbers only (.csv)"
            className={clsx(
              'flex items-center gap-1 px-2 h-5 border font-console text-[9px] font-bold uppercase tracking-[0.08em] transition-colors',
              items.length === 0 || exporting
                ? 'border-[var(--rule)] text-[var(--text-dim)] cursor-not-allowed'
                : 'border-[var(--rule-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
            )}
          >
            <FileText className="h-2.5 w-2.5" /> Serials CSV
          </button>
          <button
            onClick={onExportTemplate}
            disabled={items.length === 0 || exporting}
            title="Export the full stock-count template (.xlsx) with summary and screenshots"
            className={clsx(
              'flex items-center gap-1 px-2 h-5 border font-console text-[9px] font-bold uppercase tracking-[0.08em] transition-colors',
              items.length === 0 || exporting
                ? 'border-[var(--rule)] text-[var(--text-dim)] cursor-not-allowed'
                : 'bg-[var(--accent)] border-[var(--accent)] text-black hover:bg-[#ff8442]'
            )}
          >
            <FileSpreadsheet className="h-2.5 w-2.5" /> {exporting ? 'Building…' : 'Full Template'}
          </button>
        </div>
      }
    >
      <div className="h-7 shrink-0 flex items-stretch bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <button
          onClick={() => setFilter(new Set())}
          className={clsx(
            'px-2.5 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
            filter.size === 0 ? 'text-[var(--accent)] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          All
        </button>
        {VERDICTS.map((v) => (
          <button
            key={v.id}
            onClick={() => toggle(v.id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 border-r border-[var(--rule)] font-console text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
              filter.has(v.id) ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <span className={clsx('w-2 h-2 shrink-0', !filter.has(v.id) && 'opacity-45')} style={{ background: v.color }} />
            {v.label}
            <span className="text-[var(--text-dim)]">{String(counts[v.id] || 0).padStart(2, '0')}</span>
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2 border-l border-[var(--rule)]">
          <Search className="h-3 w-3 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER…"
            className="bg-transparent border-0 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] w-28 outline-none tracking-[0.08em] uppercase"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--bg-header)]">
              {COLS.map((c, i) => (
                <th key={i} className="panel-label text-left py-1.5 pr-3 first:pl-2 border-b border-[var(--rule)] whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => {
              const meta = verdictMeta(item.matchStatus);
              const ok = item.matchStatus === 'TRUE';
              return (
                <tr key={`${item.scannedSn}-${i}`} className="border-b border-[var(--rule)] hover:bg-white/[0.025] transition-colors">
                  <td className="py-1.5 pl-2 w-[10px]">
                    <span className="block w-[3px] h-6" style={{ background: meta.color }} />
                  </td>
                  <td className="py-1.5 pr-3 font-console text-[10px] text-[var(--text-dim)] whitespace-nowrap">
                    {String(item.timestamp).split(', ')[1] || item.timestamp}
                  </td>
                  <td className="py-1.5 pr-3 font-console text-[11px] font-bold" style={{ color: ok ? 'var(--accent)' : meta.color }}>
                    {item.scannedSn}
                  </td>
                  <td className="py-1.5 pr-3 font-console text-[11px] text-[var(--text-muted)]">{item.serialFromticket}</td>
                  <td className="py-1.5 pr-3 text-[11px] text-[var(--text-secondary)] truncate max-w-[240px]" title={item.model}>
                    {item.model}
                  </td>
                  <td className="py-1.5 pr-3 text-[11px] text-[var(--text-muted)] whitespace-nowrap">{item.state}</td>
                  <td className="py-1.5 pr-3 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">{item.substate}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className="font-console text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <button
                      onClick={() => onRemove(items.indexOf(item))}
                      title="Remove scan"
                      className="text-[var(--text-dim)] hover:text-[var(--signal-red)] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="text-center py-12 font-console text-[11px] text-[var(--text-dim)] uppercase tracking-[0.1em]">
                  {items.length === 0 ? 'No scans recorded' : 'No scans match current filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
