import React, { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { PANEL_MIN } from '../../hooks/usePanelLayout.js';

const HANDLE_CLASS = 'panel-drag-handle';

/**
 * Drag/resize implemented directly on Pointer Events.
 *
 * react-rnd was the obvious pick, but it depends on react-draggable, which
 * still calls ReactDOM.findDOMNode — removed in React 19 — so drags never
 * start on this stack.
 *
 * Move/up are bound to `window` for the duration of a gesture rather than
 * to the panel: the cursor routinely outruns the element it grabbed, and
 * this way a drag keeps tracking (and always terminates) even when the
 * pointer ends up over the map, another panel, or outside the window.
 */

const EDGES = [
  { dir: 'n', className: 'top-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { dir: 's', className: 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { dir: 'w', className: 'left-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { dir: 'e', className: 'right-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { dir: 'nw', className: 'top-0 left-0 w-3 h-3 cursor-nwse-resize' },
  { dir: 'ne', className: 'top-0 right-0 w-3 h-3 cursor-nesw-resize' },
  { dir: 'sw', className: 'bottom-0 left-0 w-3 h-3 cursor-nesw-resize' },
  { dir: 'se', className: 'bottom-0 right-0 w-3 h-3 cursor-nwse-resize' },
];

function applyResize(dir, orig, dx, dy, stage) {
  let { x, y, width, height } = orig;

  if (dir.includes('e')) width = orig.width + dx;
  if (dir.includes('s')) height = orig.height + dy;
  if (dir.includes('w')) {
    width = orig.width - dx;
    x = orig.x + dx;
  }
  if (dir.includes('n')) {
    height = orig.height - dy;
    y = orig.y + dy;
  }

  // Honour the minimum without letting the panel walk away from its anchor.
  if (width < PANEL_MIN.width) {
    if (dir.includes('w')) x -= PANEL_MIN.width - width;
    width = PANEL_MIN.width;
  }
  if (height < PANEL_MIN.height) {
    if (dir.includes('n')) y -= PANEL_MIN.height - height;
    height = PANEL_MIN.height;
  }

  if (stage.width && stage.height) {
    x = Math.max(0, Math.min(x, stage.width - PANEL_MIN.width));
    y = Math.max(0, Math.min(y, stage.height - PANEL_MIN.height));
    width = Math.min(width, stage.width - x);
    height = Math.min(height, stage.height - y);
  }

  return { x, y, width, height };
}

export default function FloatingPanel({ id, geometry, onChange, stage = {}, children, zIndex = 500 }) {
  const [live, setLive] = useState(null);
  const [active, setActive] = useState(false);
  const gestureRef = useRef(null);
  // Mirrors `live` so the gesture can be committed synchronously. Reading it
  // out of a setState updater instead would mean calling the parent's
  // setState during render, which React rejects.
  const liveRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const current = live || geometry;

  const applyLive = useCallback((next) => {
    liveRef.current = next;
    setLive(next);
  }, []);

  const beginGesture = useCallback(
    (e, mode) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      gestureRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...geometry } };
      applyLive({ ...geometry });
      setActive(true);
    },
    [geometry, applyLive]
  );

  useEffect(() => {
    if (!active) return undefined;

    const handleMove = (e) => {
      const g = gestureRef.current;
      if (!g) return;
      const s = stageRef.current;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      if (g.mode === 'move') {
        let x = g.orig.x + dx;
        let y = g.orig.y + dy;
        if (s.width && s.height) {
          x = Math.max(0, Math.min(x, s.width - g.orig.width));
          y = Math.max(0, Math.min(y, s.height - g.orig.height));
        }
        applyLive({ ...g.orig, x, y });
      } else {
        applyLive(applyResize(g.mode, g.orig, dx, dy, s));
      }
    };

    const handleUp = () => {
      if (!gestureRef.current) return;
      gestureRef.current = null;
      const finalGeometry = liveRef.current;
      liveRef.current = null;
      setLive(null);
      setActive(false);
      // Commit once, so localStorage isn't written on every pointermove.
      if (finalGeometry) onChange(id, finalGeometry);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [active, applyLive, id, onChange]);

  return (
    <div
      className="absolute flex group/panel"
      style={{
        transform: `translate(${current.x}px, ${current.y}px)`,
        width: current.width,
        height: current.height,
        zIndex: active ? zIndex + 40 : zIndex,
        touchAction: 'none',
      }}
    >
      {/* Header strip doubles as the move handle; Panel tags it with .panel-drag-handle */}
      <div
        className="absolute inset-0 flex flex-col"
        onPointerDownCapture={(e) => {
          if (e.target.closest?.(`.${HANDLE_CLASS}`)) beginGesture(e, 'move');
        }}
      >
        {children}
      </div>

      {EDGES.map((edge) => (
        <div
          key={edge.dir}
          onPointerDown={(e) => beginGesture(e, edge.dir)}
          className={clsx('absolute z-10', edge.className)}
        />
      ))}

      <span
        className={clsx(
          'pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 transition-opacity',
          active ? 'opacity-100' : 'opacity-0 group-hover/panel:opacity-100'
        )}
      >
        <span className="absolute bottom-[2px] right-0 w-2.5 h-px bg-[var(--accent)]" />
        <span className="absolute bottom-0 right-[2px] w-px h-2.5 bg-[var(--accent)]" />
      </span>
    </div>
  );
}

export { HANDLE_CLASS };
