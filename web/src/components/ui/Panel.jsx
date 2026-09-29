import React from 'react';
import clsx from 'clsx';

/**
 * The core surface of the Mission Control theme: a flat charcoal box
 * with a hairline rule and a labelled header strip. Replaces the old
 * glass/glow card — no blur, no shadow bloom, no rounding.
 */
export default function Panel({
  as: Tag = 'div',
  label,
  status,
  accent = false,
  ticks = false,
  sweep = false,
  headerRight,
  bodyClass,
  className,
  draggable = false,
  children,
  ...rest
}) {
  return (
    <Tag
      className={clsx(
        'relative flex flex-col bg-[var(--bg-surface)] border border-[var(--rule)]',
        ticks && 'corner-ticks',
        className
      )}
      {...rest}
    >
      {label && (
        <div
          className={clsx(
            'flex items-center justify-between gap-2 px-2.5 h-7 shrink-0 bg-[var(--bg-header)] border-b border-[var(--rule)]',
            sweep && 'header-sweep',
            draggable && 'panel-drag-handle cursor-grab active:cursor-grabbing select-none'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {accent && <span className="w-1 h-3 bg-[var(--accent)] shrink-0" />}
            <span className="panel-label truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status && <span className="panel-label text-[var(--text-muted)]">{status}</span>}
            {headerRight}
          </div>
        </div>
      )}
      <div className={clsx('flex-1 min-h-0', bodyClass)}>{children}</div>
    </Tag>
  );
}
