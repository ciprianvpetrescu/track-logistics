import { useCallback } from 'react';
import { useLocalStorageState } from './useLocalStorageState.js';

export const PANEL_IDS = ['status', 'keys', 'telemetry', 'legend'];

export const PANEL_MIN = { width: 200, height: 88 };

const NATURAL = {
  status: { width: 292, height: 214 },
  keys: { width: 292, height: 250 },
  telemetry: { width: 292, height: 190 },
  legend: { width: 226, height: 148 },
};

const GAP = 8;

/**
 * Defaults are derived from the actual stage size rather than hardcoded,
 * because the map region shrinks as the ledger sheet grows. A fixed
 * column stacks ~680px tall and strands the lower panels off-screen on
 * anything but a very tall window.
 */
export function computeDefaultLayout(stageW, stageH) {
  const columnHeight = NATURAL.status.height + NATURAL.keys.height + NATURAL.telemetry.height + GAP * 2;
  const fitsColumn = columnHeight + GAP * 2 <= stageH;

  const legend = {
    ...NATURAL.legend,
    x: Math.max(GAP, stageW - NATURAL.legend.width - GAP),
    y: GAP,
  };

  if (fitsColumn) {
    return {
      status: { ...NATURAL.status, x: GAP, y: GAP },
      keys: { ...NATURAL.keys, x: GAP, y: GAP + NATURAL.status.height + GAP },
      telemetry: {
        ...NATURAL.telemetry,
        x: GAP,
        y: GAP + NATURAL.status.height + GAP + NATURAL.keys.height + GAP,
      },
      legend,
    };
  }

  // Short stage: lay the instruments out along the top edge instead.
  const usableH = Math.max(PANEL_MIN.height, stageH - GAP * 2);
  return {
    status: { width: NATURAL.status.width, height: Math.min(NATURAL.status.height, usableH), x: GAP, y: GAP },
    keys: {
      width: NATURAL.keys.width,
      height: Math.min(NATURAL.keys.height, usableH),
      x: GAP * 2 + NATURAL.status.width,
      y: GAP,
    },
    telemetry: {
      width: NATURAL.telemetry.width,
      height: Math.min(NATURAL.telemetry.height, usableH),
      x: GAP * 3 + NATURAL.status.width + NATURAL.keys.width,
      y: GAP,
    },
    legend: { ...legend, y: GAP },
  };
}

/** Keeps every panel reachable when the window or ledger sheet resizes. */
export function clampLayout(layout, stageW, stageH) {
  if (!layout || stageW <= 0 || stageH <= 0) return layout;
  let changed = false;
  const next = {};

  PANEL_IDS.forEach((id) => {
    const p = layout[id];
    if (!p) return;
    const width = Math.max(PANEL_MIN.width, Math.min(p.width, stageW));
    const height = Math.max(PANEL_MIN.height, Math.min(p.height, stageH));
    const x = Math.min(Math.max(0, p.x), Math.max(0, stageW - width));
    const y = Math.min(Math.max(0, p.y), Math.max(0, stageH - height));
    next[id] = { x, y, width, height };
    if (x !== p.x || y !== p.y || width !== p.width || height !== p.height) changed = true;
  });

  return changed ? next : layout;
}

export function usePanelLayout() {
  const [layout, setLayout] = useLocalStorageState('console_panel_layout_v2', null);

  const updatePanel = useCallback(
    (id, geometry) => {
      setLayout((prev) => ({ ...(prev || {}), [id]: { ...(prev?.[id] || {}), ...geometry } }));
    },
    [setLayout]
  );

  // null makes the next measured render regenerate defaults for the
  // current stage size, so "reset" adapts instead of restoring stale numbers.
  const resetLayout = useCallback(() => setLayout(null), [setLayout]);

  return { layout, setLayout, updatePanel, resetLayout };
}
