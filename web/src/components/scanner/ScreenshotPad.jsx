import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { ClipboardPaste, X, ImageOff, Upload } from 'lucide-react';
import Panel from '../ui/Panel.jsx';

const MAX_SHOTS = 6;

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Capture area for the dashboard screenshots that get pasted alongside the
 * stock count. Focus the pad and hit Ctrl+V; images are held as data URLs
 * and embedded into the template export.
 */
export default function ScreenshotPad({ screenshots, onChange }) {
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const padRef = useRef(null);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    async (files) => {
      const images = [...files].filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) {
        setError('That clipboard/drop had no image in it.');
        return;
      }
      setError(null);
      const room = MAX_SHOTS - screenshots.length;
      const accepted = images.slice(0, Math.max(0, room));
      if (accepted.length === 0) {
        setError(`Limit is ${MAX_SHOTS} screenshots — remove one first.`);
        return;
      }
      const parsed = await Promise.all(accepted.map(readImageFile));
      onChange([
        ...screenshots,
        ...parsed.map((p, i) => ({ id: `shot-${Date.now()}-${i}`, ...p })),
      ]);
    },
    [screenshots, onChange]
  );

  // Paste works when the pad is focused, or anywhere while it is "armed".
  useEffect(() => {
    const handler = (e) => {
      const withinPad = padRef.current?.contains(document.activeElement) || armed;
      if (!withinPad) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [...items].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
      if (files.length === 0) return;
      e.preventDefault();
      addFiles(files);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [armed, addFiles]);

  const remove = (id) => onChange(screenshots.filter((s) => s.id !== id));

  return (
    <Panel
      label="Screenshot Pad"
      status={`${screenshots.length}/${MAX_SHOTS}`}
      className="h-full"
      bodyClass="flex flex-col min-h-0"
      headerRight={
        screenshots.length > 0 ? (
          <button
            onClick={() => onChange([])}
            className="px-1.5 h-5 border border-[var(--rule-strong)] font-console text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--signal-red)] hover:border-[var(--signal-red)] transition-colors"
          >
            Clear
          </button>
        ) : null
      }
    >
      <div
        ref={padRef}
        tabIndex={0}
        onFocus={() => setArmed(true)}
        onBlur={() => setArmed(false)}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer?.files || []);
        }}
        className={clsx(
          'm-2.5 border border-dashed flex flex-col items-center justify-center gap-1 py-3 outline-none transition-colors cursor-pointer text-center shrink-0',
          dragging || armed
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--rule-strong)] bg-[var(--bg-inset)] hover:border-[var(--accent)]/60'
        )}
        onClick={() => {
          padRef.current?.focus();
          inputRef.current?.click();
        }}
      >
        <ClipboardPaste className={clsx('h-4 w-4', armed || dragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')} />
        <span className="font-console text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          {dragging ? 'Release to add' : armed ? 'Ready — press Ctrl+V' : 'Click, then Ctrl+V'}
        </span>
        <span className="font-console text-[9px] text-[var(--text-dim)] flex items-center gap-1">
          <Upload className="h-2.5 w-2.5" /> or drop / browse an image
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files || []);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="mx-2.5 mb-2 flex items-start gap-2 px-2 py-1.5 border border-[var(--signal-amber)]/40 bg-[var(--signal-amber)]/10">
          <ImageOff className="h-3 w-3 text-[var(--signal-amber)] shrink-0 mt-0.5" />
          <span className="text-[10px] leading-snug text-[var(--signal-amber)]">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2 min-h-0">
        {screenshots.map((shot, i) => (
          <div key={shot.id} className="relative group border border-[var(--rule)] bg-[var(--bg-inset)]">
            <img src={shot.dataUrl} alt={`Screenshot ${i + 1}`} className="w-full block" />
            <div className="absolute top-0 left-0 px-1.5 py-0.5 bg-[var(--bg-void)]/85 font-console text-[9px] text-[var(--text-secondary)] tracking-[0.08em]">
              {shot.width}×{shot.height}
            </div>
            <button
              onClick={() => remove(shot.id)}
              title="Remove screenshot"
              className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-[var(--bg-void)]/85 text-[var(--text-muted)] hover:text-[var(--signal-red)] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {screenshots.length === 0 && (
          <div className="text-center py-4 font-console text-[10px] text-[var(--text-dim)] uppercase tracking-[0.1em]">
            No screenshots attached
          </div>
        )}
      </div>
    </Panel>
  );
}
