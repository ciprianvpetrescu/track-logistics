import React, { useState, useEffect } from 'react';
import ModalShell from './ModalShell.jsx';
import Button from '../ui/Button.jsx';

const FIELD =
  'w-full bg-[var(--bg-inset)] border border-[var(--rule)] px-2 h-8 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]';

export default function ProfileModal({ open, onClose, profileName, profilePic, onSave }) {
  const [tempName, setTempName] = useState(profileName);
  const [tempPic, setTempPic] = useState(profilePic);

  useEffect(() => {
    if (open) {
      setTempName(profileName);
      setTempPic(profilePic);
    }
  }, [open, profileName, profilePic]);

  return (
    <ModalShell open={open} onClose={onClose} title="Operator Profile" widthClass="w-[400px]">
      <div className="p-4 flex flex-col gap-3.5">
        <div>
          <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1.5">Callsign / Display Name</label>
          <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className={FIELD} placeholder="e.g. J. DOE" />
        </div>
        <div>
          <label className="panel-label text-[9px] text-[var(--text-muted)] block mb-1.5">Avatar URL (optional)</label>
          <input type="text" value={tempPic} onChange={(e) => setTempPic(e.target.value)} className={FIELD} placeholder="https://…" />
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-[var(--rule)] mt-1">
          <Button tone="ghost" onClick={onClose} className="mt-3">Cancel</Button>
          <Button tone="accent" onClick={() => onSave(tempName, tempPic)} className="mt-3">Commit</Button>
        </div>
      </div>
    </ModalShell>
  );
}
