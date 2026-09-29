import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Right-edge docked drawer shared by all three utility widgets.
 * Replaces the old bottom-left floating bubbles.
 */
export default function WidgetFrame({ title, status, onClose, children, footer }) {
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.16, ease: 'easeOut' }}
      className="fixed right-0 top-12 bottom-0 w-[360px] bg-[var(--bg-surface)] border-l border-[var(--rule-strong)] flex flex-col z-[700] shadow-[-16px_0_40px_rgba(0,0,0,0.55)]"
    >
      <div className="h-8 shrink-0 flex items-center justify-between px-2.5 bg-[var(--bg-header)] border-b border-[var(--rule)]">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3 bg-[var(--accent)]" />
          <span className="panel-label">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="panel-label text-[var(--text-muted)]">{status}</span>}
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--signal-red)] transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      {footer}
    </motion.aside>
  );
}
