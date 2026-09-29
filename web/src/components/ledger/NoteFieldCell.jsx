import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';

export default function NoteFieldCell({ ticketRef, initialNote }) {
  const [noteVal, setNoteVal] = useState(initialNote || '');
  const focusedRef = useRef(false);
  const lastSavedRef = useRef(initialNote || '');

  // Only adopt a server-side value when the user is not editing this cell and
  // the incoming value is genuinely different from what we last saved. The
  // record list is rebuilt on every poll, so a naive reset-on-prop-change
  // wiped half-typed notes and reverted rows whose note the user had just
  // typed but not yet blurred.
  useEffect(() => {
    if (focusedRef.current) return;
    const incoming = initialNote || '';
    if (incoming === lastSavedRef.current) return;
    lastSavedRef.current = incoming;
    setNoteVal(incoming);
  }, [initialNote]);

  const push = () => {
    focusedRef.current = false;
    if (noteVal.trim() === lastSavedRef.current.trim()) return;
    lastSavedRef.current = noteVal;
    api.saveNote(ticketRef, noteVal).catch((e) => console.error(e));
  };

  return (
    <input
      type="text"
      value={noteVal}
      onChange={(e) => setNoteVal(e.target.value)}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={push}
      onKeyDown={(e) => {
        if (e.key === 'Enter') push();
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-[var(--bg-inset)] border border-[var(--rule)] text-[var(--text-secondary)] text-[10px] px-1.5 h-6 outline-none focus:border-[var(--accent)] focus:text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
      placeholder="—"
    />
  );
}
