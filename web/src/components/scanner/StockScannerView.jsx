import React, { useState } from 'react';
import clsx from 'clsx';
import Panel from '../ui/Panel.jsx';
import ScanInput from './ScanInput.jsx';
import ScanLedgerTable from './ScanLedgerTable.jsx';
import ManifestImport from './ManifestImport.jsx';
import ScreenshotPad from './ScreenshotPad.jsx';

export default function StockScannerView({
  scannerValue,
  onChangeScannerValue,
  onSubmitScan,
  feedback,
  manifest,
  manifestSource,
  onImportManifest,
  onClearManifest,
  scannedItems,
  onRemoveScan,
  onExportCsv,
  onExportTemplate,
  exporting,
  screenshots,
  onChangeScreenshots,
}) {
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);

  const scannedSerials = new Set(scannedItems.filter((s) => s.matchStatus === 'TRUE').map((s) => s.serialFromticket));
  const visible = showOutstandingOnly ? manifest.filter((i) => !scannedSerials.has(i.serial)) : manifest;
  const reconciled = manifest.filter((i) => scannedSerials.has(i.serial)).length;
  const outstanding = manifest.length - reconciled;
  const pct = manifest.length > 0 ? Math.round((reconciled / manifest.length) * 100) : 0;

  return (
    <div className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0 bg-[var(--bg-void)]">
      <div className="w-[330px] shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto">
        <ManifestImport
          source={manifestSource}
          itemCount={manifest.length}
          onImported={onImportManifest}
          onClear={onClearManifest}
        />

        <ScanInput value={scannerValue} onChange={onChangeScannerValue} onSubmit={onSubmitScan} feedback={feedback} />

        <Panel label="Reconciliation" status={`${pct}%`} bodyClass="p-2.5" className="shrink-0">
          <div className="h-2 w-full bg-[var(--bg-inset)] border border-[var(--rule)] flex">
            <div className="h-full bg-[var(--signal-green)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 font-console text-[10px] uppercase tracking-[0.08em]">
            <span className="text-[var(--text-muted)]">
              Outstanding <span className="text-[var(--signal-amber)] font-bold">{outstanding}</span>
            </span>
            <span className="text-[var(--text-muted)]">
              Expected <span className="text-[var(--text-primary)] font-bold">{manifest.length}</span>
            </span>
          </div>
        </Panel>

        <Panel
          label="ALM Manifest"
          status={`${visible.length} SHOWN`}
          className="min-h-[180px] flex-1"
          bodyClass="flex flex-col min-h-0"
          headerRight={
            <button
              onClick={() => setShowOutstandingOnly((v) => !v)}
              className={clsx(
                'px-1.5 h-5 border font-console text-[9px] font-bold uppercase tracking-[0.08em] transition-colors',
                showOutstandingOnly
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-[var(--rule-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              Outstanding
            </button>
          }
        >
          <div className="flex-1 overflow-y-auto bg-[var(--bg-inset)] divide-y divide-[var(--rule)]">
            {visible.map((item, idx) => {
              const isScanned = scannedSerials.has(item.serial);
              return (
                <div key={`${item.serial}-${idx}`} className="flex items-center gap-2 px-2 py-1.5">
                  <span className={clsx('w-1 h-4 shrink-0', isScanned ? 'bg-[var(--signal-green)]' : 'bg-[var(--rule-strong)]')} />
                  <span
                    className={clsx(
                      'font-console text-[10px] w-[104px] shrink-0 truncate',
                      isScanned ? 'text-[var(--signal-green)]' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {item.serial}
                  </span>
                  <span className="text-[10px] text-[var(--text-dim)] truncate flex-1 text-right" title={`${item.model} · ${item.substate}`}>
                    {item.substate || item.model}
                  </span>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="text-center py-8 font-console text-[10px] text-[var(--text-dim)] uppercase tracking-[0.1em]">
                {manifest.length === 0
                  ? 'Import a stock export to begin'
                  : showOutstandingOnly
                  ? 'All items reconciled'
                  : 'No manifest loaded'}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <ScanLedgerTable
        items={scannedItems}
        onRemove={onRemoveScan}
        onExportCsv={onExportCsv}
        onExportTemplate={onExportTemplate}
        exporting={exporting}
      />

      <div className="w-[300px] shrink-0 min-h-0 flex">
        <ScreenshotPad screenshots={screenshots} onChange={onChangeScreenshots} />
      </div>
    </div>
  );
}
