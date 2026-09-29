import React from 'react';
import clsx from 'clsx';

const TONE = {
  accent: 'bg-[var(--accent)] text-black border-[var(--accent)] hover:bg-[#ff8442]',
  outline: 'bg-transparent text-[var(--accent)] border-[var(--accent)]/60 hover:bg-[var(--accent)]/12 hover:border-[var(--accent)]',
  ghost: 'bg-white/[0.02] text-[var(--text-secondary)] border-[var(--rule)] hover:text-[var(--text-primary)] hover:border-[var(--rule-strong)] hover:bg-white/[0.05]',
  danger: 'bg-transparent text-[var(--signal-red)] border-[var(--signal-red)]/50 hover:bg-[var(--signal-red)]/12',
  green: 'bg-[var(--signal-green)]/15 text-[var(--signal-green)] border-[var(--signal-green)]/50 hover:bg-[var(--signal-green)]/25',
};

export default function Button({ tone = 'ghost', className, disabled, children, ...rest }) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 border font-console text-[10px] font-bold uppercase tracking-[0.1em] leading-none h-7 transition-colors duration-100',
        disabled ? 'opacity-35 cursor-not-allowed border-[var(--rule)] text-[var(--text-muted)] bg-transparent' : TONE[tone] || TONE.ghost,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
