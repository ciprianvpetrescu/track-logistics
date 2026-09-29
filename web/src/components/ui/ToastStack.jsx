import React from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToasts } from '../../hooks/useToasts.jsx';

const TONE = {
  green: { bar: 'bg-[var(--signal-green)]', text: 'text-[var(--signal-green)]', tag: 'OK' },
  amber: { bar: 'bg-[var(--signal-amber)]', text: 'text-[var(--signal-amber)]', tag: 'WARN' },
  red: { bar: 'bg-[var(--signal-red)]', text: 'text-[var(--signal-red)]', tag: 'FAULT' },
  accent: { bar: 'bg-[var(--accent)]', text: 'text-[var(--accent)]', tag: 'INFO' },
};

export default function ToastStack() {
  const { toasts, dismiss } = useToasts();

  return (
    <div className="fixed bottom-3 left-3 z-[980] flex flex-col gap-1.5 w-[340px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone] || TONE.accent;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.1 } }}
              transition={{ type: 'tween', duration: 0.14 }}
              className="pointer-events-auto flex bg-[var(--bg-surface)] border border-[var(--rule-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            >
              <span className={clsx('w-1 shrink-0', tone.bar)} />
              <div className="flex-1 min-w-0 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <span className={clsx('font-console text-[9px] font-bold tracking-[0.12em]', tone.text)}>{tone.tag}</span>
                  {toast.title && (
                    <span className="font-console text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)] truncate">
                      {toast.title}
                    </span>
                  )}
                </div>
                {toast.message && <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-snug">{toast.message}</p>}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="px-2 shrink-0 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
