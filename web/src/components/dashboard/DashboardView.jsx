import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { RotateCcw, Move } from 'lucide-react';
import StatTiles from './StatTiles.jsx';
import ApiKeyHealthBar from './ApiKeyHealthBar.jsx';
import SystemLogTail from './SystemLogTail.jsx';
import CommandMap from './CommandMap.jsx';
import MapLegend from './MapLegend.jsx';
import FloatingPanel from './FloatingPanel.jsx';
import LedgerSheet from '../ledger/LedgerSheet.jsx';
import { computeDefaultLayout, clampLayout } from '../../hooks/usePanelLayout.js';

/**
 * The map is a full-bleed backdrop; every instrument on top of it is a
 * free-floating panel the operator can drag by its header and resize
 * from any edge. Geometry persists via usePanelLayout.
 */
export default function DashboardView({
  activeCount,
  apiSuccessRate,
  counts,
  statusFilter,
  onToggleStatus,
  apiSettings,
  onSetApiMode,
  lifecycleFilter,
  onSetLifecycleFilter,
  logs,
  mapRecords,
  onSelectRow,
  focusTask,
  ledgerProps,
  layout,
  onSetLayout,
  onUpdatePanel,
  onResetLayout,
}) {
  const stageRef = useRef(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // The map region shrinks and grows with the ledger sheet, so track it.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStage({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Generate defaults once we know the stage, then keep panels reachable
  // if the window or sheet resizes underneath them.
  useEffect(() => {
    if (!stage.width || !stage.height) return;
    if (!layout) {
      onSetLayout(computeDefaultLayout(stage.width, stage.height));
      return;
    }
    const clamped = clampLayout(layout, stage.width, stage.height);
    if (clamped !== layout) onSetLayout(clamped);
  }, [stage.width, stage.height, layout, onSetLayout]);

  const panelProps = (id) => ({ id, geometry: layout[id], onChange: onUpdatePanel, stage });
  const ready = Boolean(layout && stage.width);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div ref={stageRef} className="flex-1 relative min-h-0 bg-[var(--bg-void)] overflow-hidden">
        <CommandMap records={mapRecords} onSelectRow={onSelectRow} focusTask={focusTask} />

        {ready && (
          <>
            <FloatingPanel {...panelProps('status')}>
              <StatTiles
                activeCount={activeCount}
                apiSuccessRate={apiSuccessRate}
                counts={counts}
                statusFilter={statusFilter}
                onToggleStatus={onToggleStatus}
              />
            </FloatingPanel>

            <FloatingPanel {...panelProps('keys')}>
              <ApiKeyHealthBar
                apiSettings={apiSettings}
                onSetMode={onSetApiMode}
                lifecycleFilter={lifecycleFilter}
                onSetLifecycleFilter={onSetLifecycleFilter}
              />
            </FloatingPanel>

            <FloatingPanel {...panelProps('telemetry')}>
              <SystemLogTail logs={logs} />
            </FloatingPanel>

            <FloatingPanel {...panelProps('legend')}>
              <MapLegend total={mapRecords.length} />
            </FloatingPanel>
          </>
        )}

        <div className="absolute bottom-2 right-2 z-[520] flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 h-6 bg-[var(--bg-surface)]/85 border border-[var(--rule)] font-console text-[9px] uppercase tracking-[0.1em] text-[var(--text-dim)] pointer-events-none">
            <Move className="h-2.5 w-2.5" />
            Drag headers · resize edges
          </span>
          <button
            onClick={onResetLayout}
            title="Reset panel layout"
            className="flex items-center gap-1.5 px-2 h-6 bg-[var(--bg-surface)] border border-[var(--rule)] font-console text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reset Layout
          </button>
        </div>
      </div>

      <LedgerSheet {...ledgerProps} />
    </div>
  );
}
