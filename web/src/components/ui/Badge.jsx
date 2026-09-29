import React from 'react';
import clsx from 'clsx';

const TONE = {
  accent: 'text-[var(--accent)] border-[var(--accent)]/50 bg-[var(--accent)]/10',
  amber: 'text-[var(--signal-amber)] border-[var(--signal-amber)]/50 bg-[var(--signal-amber)]/10',
  green: 'text-[var(--signal-green)] border-[var(--signal-green)]/50 bg-[var(--signal-green)]/10',
  red: 'text-[var(--signal-red)] border-[var(--signal-red)]/50 bg-[var(--signal-red)]/10',
  blue: 'text-[var(--signal-blue)] border-[var(--signal-blue)]/50 bg-[var(--signal-blue)]/10',
  neutral: 'text-[var(--text-secondary)] border-[var(--rule-strong)] bg-white/[0.03]',
};

const DOT = {
  accent: 'bg-[var(--accent)]',
  amber: 'bg-[var(--signal-amber)]',
  green: 'bg-[var(--signal-green)]',
  red: 'bg-[var(--signal-red)]',
  blue: 'bg-[var(--signal-blue)]',
  neutral: 'bg-[var(--text-muted)]',
};

export default function Badge({ tone = 'neutral', pulse = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 border font-console text-[10px] font-bold uppercase tracking-[0.08em] leading-none',
        TONE[tone] || TONE.neutral,
        className
      )}
    >
      {pulse && <span className={clsx('w-1.5 h-1.5 blink-slow', DOT[tone] || DOT.neutral)} />}
      {children}
    </span>
  );
}
