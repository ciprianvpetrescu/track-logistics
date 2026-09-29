/**
 * Tiny JSON-file store.
 *
 * The dashboard keeps a few small collections that must survive a restart
 * (operator notes, the record cache, follow-up journal, templates). They are
 * all the same shape of problem, so they share one loader/saver with an
 * atomic write: a crash mid-save cannot leave a half-written file behind,
 * which matters because the watcher re-reads these on boot.
 */

const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] could not read ${path.basename(file)}: ${err.message}`);
    return fallback;
  }
}

function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    console.error(`[store] could not write ${path.basename(file)}: ${err.message}`);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
    return false;
  }
}

function debounce(fn, ms) {
  let handle = null;
  return (...args) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => { handle = null; fn(...args); }, ms);
  };
}

module.exports = { readJson, writeJson, debounce };
