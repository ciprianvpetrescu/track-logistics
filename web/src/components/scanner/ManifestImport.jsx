import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Upload, FileSpreadsheet, X, AlertTriangle, HardDriveDownload } from 'lucide-react';
import Panel from '../ui/Panel.jsx';
import { parseManifestFile } from '../../lib/manifest.js';

const ACCEPT = '.xlsx,.xls,.csv';

export default function ManifestImport({ source, itemCount, onImported, onClear }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  // dragenter/dragleave fire per child element; count them so the highlight
  // doesn't flicker as the pointer crosses the zone's contents.
  const dragDepth = useRef(0);

  const ingest = useCallback(
    async (file) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      setWarnings([]);
      try {
        const { items, warnings: w } = await parseManifestFile(file);
        if (items.length === 0) {
          setError(w[0] || 'No usable rows found in that file.');
          return;
        }
        setWarnings(w);
        onImported(items, file.name);
      } catch (e) {
        console.error(e);
        setError(`Could not read "${file.name}". Is it a valid Excel or CSV file?`);
      } finally {
        setBusy(false);
      }
    },
    [onImported]
  );

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    ingest(e.dataTransfer?.files?.[0]);
  };

  return (
    <Panel
      label="Stock Manifest"
      accent
      status={source ? `${itemCount} ITEMS` : 'NO FILE'}
      headerRight={
        source ? (
          <button
            onClick={onClear}
            title="Clear imported manifest"
            className="px-1.5 h-5 border border-[var(--rule-strong)] font-console text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--signal-red)] hover:border-[var(--signal-red)] transition-colors"
          >
            Clear
          </button>
        ) : null
      }
      bodyClass="p-2.5 space-y-2"
    >
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border border-dashed flex flex-col items-center justify-center gap-1.5 py-4 px-3 cursor-pointer transition-colors text-center',
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--rule-strong)] bg-[var(--bg-inset)] hover:border-[var(--accent)]/60'
        )}
      >
        <Upload className={clsx('h-4 w-4', dragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')} />
        <span className="font-console text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          {busy ? 'Reading…' : dragging ? 'Release to import' : 'Drop export here'}
        </span>
        <span className="font-console text-[9px] text-[var(--text-dim)]">or click to browse · .xlsx .xls .csv</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            ingest(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {source && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-inset)] border border-[var(--rule)]">
          {source.auto ? (
            <HardDriveDownload className="h-3 w-3 text-[var(--signal-blue)] shrink-0" />
          ) : (
            <FileSpreadsheet className="h-3 w-3 text-[var(--signal-green)] shrink-0" />
          )}
          <span className="font-console text-[10px] text-[var(--text-secondary)] truncate flex-1" title={source.name}>
            {source.name}
          </span>
          <span className="font-console text-[9px] text-[var(--text-dim)] shrink-0">
            {source.auto ? 'AUTO' : 'MANUAL'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-2 py-1.5 border border-[var(--signal-red)]/50 bg-[var(--signal-red)]/10">
          <X className="h-3 w-3 text-[var(--signal-red)] shrink-0 mt-0.5" />
          <span className="text-[10px] leading-snug text-[var(--signal-red)]">{error}</span>
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-1.5 border border-[var(--signal-amber)]/40 bg-[var(--signal-amber)]/10">
          <AlertTriangle className="h-3 w-3 text-[var(--signal-amber)] shrink-0 mt-0.5" />
          <span className="text-[10px] leading-snug text-[var(--signal-amber)]">{w}</span>
        </div>
      ))}
    </Panel>
  );
}
