import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';
import { X, Plus } from 'lucide-react';
import WidgetFrame from './WidgetFrame.jsx';
import { api } from '../../lib/api.js';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback.js';

export default function NotepadWidget({ onClose, notes, activeTabId, onSetActiveTabId, onSetNotes, isEditingRef }) {
  const editableRef = useRef(null);

  useEffect(() => {
    const note = notes.find((n) => n.id === activeTabId);
    if (editableRef.current && document.activeElement !== editableRef.current) {
      editableRef.current.innerHTML = note ? note.content : '';
    }
  }, [activeTabId, notes]);

  const persist = useDebouncedCallback((next) => {
    api.saveWorkspaceNotes(next).catch(console.error);
  }, 500);

  const pushNotes = (next) => {
    onSetNotes(next);
    persist(next);
  };

  const switchTab = (id) => {
    onSetActiveTabId(id);
    const note = notes.find((n) => n.id === id);
    if (editableRef.current) editableRef.current.innerHTML = note?.content || '';
  };

  const renameTab = (id, title) => pushNotes(notes.map((n) => (n.id === id ? { ...n, title } : n)));

  const deleteTab = (id, e) => {
    e.stopPropagation();
    const next = notes.filter((n) => n.id !== id);
    pushNotes(next);
    if (activeTabId === id) onSetActiveTabId(next[0]?.id || '');
  };

  const createTab = () => {
    const id = `tab-${Date.now()}`;
    const next = [...notes, { id, title: 'NEW', content: '' }];
    pushNotes(next);
    switchTab(id);
  };

  const saveContent = () => {
    if (!editableRef.current || !activeTabId) return;
    const content = editableRef.current.innerHTML;
    pushNotes(notes.map((n) => (n.id === activeTabId ? { ...n, content } : n)));
  };

  return (
    <WidgetFrame title="Scratch Notes" status={`${notes.length} TAB`} onClose={onClose}>
      <div className="shrink-0 flex items-stretch bg-[var(--bg-header)] border-b border-[var(--rule)] overflow-x-auto">
        {notes.map((note) => {
          const isActive = note.id === activeTabId;
          return (
            <div
              key={note.id}
              onClick={() => switchTab(note.id)}
              className={clsx(
                'relative group flex items-center gap-1 px-2 h-7 border-r border-[var(--rule)] cursor-pointer shrink-0',
                isActive ? 'bg-[var(--bg-surface)]' : 'hover:bg-white/[0.02]'
              )}
            >
              {isActive && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />}
              <input
                type="text"
                value={note.title || ''}
                onChange={(e) => renameTab(note.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={clsx(
                  'bg-transparent outline-none w-16 font-console text-[10px] font-bold uppercase tracking-[0.08em]',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                )}
              />
              {notes.length > 1 && (
                <button
                  onClick={(e) => deleteTab(note.id, e)}
                  className="text-[var(--text-dim)] hover:text-[var(--signal-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={createTab}
          className="px-2 h-7 shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          title="New tab"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-[var(--bg-inset)] p-3">
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onBlur={() => {
            isEditingRef.current = false;
            saveContent();
          }}
          onInput={saveContent}
          className="w-full min-h-full outline-none text-[var(--text-secondary)] text-[11px] leading-relaxed font-console"
        />
      </div>
    </WidgetFrame>
  );
}
