// 🔥 FORCE NODE RUNTIME TO BYPASS CORPORATE PROXY INTERCEPTION DISCONNECTS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const chokidar = require('chokidar');
const xlsx = require('xlsx');
const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');
const { answerQuery } = require('./lib/aiRouter');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
// --- BASIC AUTH GATE ---
function basicAuthOperator(req,res,next){
  const h=req.headers.authorization||'';
  if(h.startsWith('Basic ')){
    const d=Buffer.from(h.slice(6),'base64').toString();
    const pw=d.slice(d.indexOf(':')+1);
    if(pw==='change-me') return next();
  }
  res.set('WWW-Authenticate','Basic realm="Dashboard"');
  return res.status(401).send('Auth required');
}
// app.use(basicAuthOperator); // removed 2026-08-10 — Caddy portal is the only login


// --- CONFIGURATION MATRIX ---
const CourierA_API_URL = "https://api.courier-a.example/track/shipments";

// Multiple keys are supported because the carrier rate-limits per key. The
// pool is tried in order and any key that answers 429 is parked until a
// reset. Supply them comma-separated in COURIER_API_KEYS.
const _courierAKeyList = String(process.env.COURIER_API_KEYS || process.env.COURIER_API_KEY || '')
    .split(',').map((k) => k.trim()).filter(Boolean);
let courierAKeys = _courierAKeyList.map((key, i) => ({ id: i + 1, key, status: 'OK' }));
if (courierAKeys.length === 0) courierAKeys = [{ id: 1, key: '', status: 'OK' }];
let courierAMode = "AUTO";

const COURIER_B_CLIENT_ID = process.env.COURIER_CLIENT_ID; 
const COURIER_B_CLIENT_SECRET = process.env.COURIER_CLIENT_SECRET;
const COURIER_B_API_URL = "https://apis.example-courier.com/track/v1/trackingnumbers";
const GEOCODE_API_KEY = (process.env.GEOCODE_API_KEY || ""); 

const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
// Watched-filename hints. A workbook whose name contains one of these is
// treated as a consignment manifest for the matching carrier; an asset
// export is picked up by the inventory pattern below. Everything is
// filename-driven so no operator has to tell the dashboard what it is.
const MANIFEST_PATTERNS = ['manifest', 'consignment'];
const INVENTORY_PATTERNS = ['asset_export', 'inventory'];

const NOTES_FILE_PATH = path.join(__dirname, 'notes.json');
const THREADS_BLACKLIST_FILE = path.join(__dirname, 'deleted_threads.json');
const CHAT_HISTORY_FILE = path.join(__dirname, 'chat_history.json');
const WORKSPACE_NOTEPAD_FILE = path.join(__dirname, 'workspace_notes.json');
const UPDATES_FILE_PATH = path.join(__dirname, 'updates.json');

const proxyBypassAgent = new https.Agent({ rejectUnauthorized: false });

// --- MEMORY STORAGE ---
let courierARecords = [];
let courierBRecords = [];
let platformEmailAlertsRecords = []; 
let operationalLogs = [];
let persistentNotesCache = {};
let blacklistedMailThreads = [];
let chatMessagesDatabase = []; 
let workspaceNotepadNotesArray = [{ id: 'tab-default', title: 'Main Clipboard', content: '<div><b>Console Notebook Initialized</b></div>' }];

// Long-form case journal, keyed by ticketRef: { [ticketRef]: [{ id, text, author, timestamp, timeMs }] }
// Distinct from persistentNotesCache, which holds the one-line inline note.
let consignmentUpdates = {};

// 🔥 STOCK COUNT MEMORY
let expectedInventory = [];

function appendLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    operationalLogs.push(`[${timestamp}] ${message}`);
    if (operationalLogs.length > 100) operationalLogs.shift();
    console.log(`[${timestamp}] ${message}`);
}

function loadPersistentNotes() {
    try {
        if (fs.existsSync(NOTES_FILE_PATH)) persistentNotesCache = JSON.parse(fs.readFileSync(NOTES_FILE_PATH, 'utf8') || '{}');
        if (fs.existsSync(THREADS_BLACKLIST_FILE)) blacklistedMailThreads = JSON.parse(fs.readFileSync(THREADS_BLACKLIST_FILE, 'utf8') || '[]');
        if (fs.existsSync(CHAT_HISTORY_FILE)) chatMessagesDatabase = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8') || '[]');
        if (fs.existsSync(WORKSPACE_NOTEPAD_FILE)) {
            const obj = JSON.parse(fs.readFileSync(WORKSPACE_NOTEPAD_FILE, 'utf8') || '{}');
            if (Array.isArray(obj.notes)) workspaceNotepadNotesArray = obj.notes;
        }
        if (fs.existsSync(UPDATES_FILE_PATH)) consignmentUpdates = JSON.parse(fs.readFileSync(UPDATES_FILE_PATH, 'utf8') || '{}');
    } catch (err) { 
        console.error("Database initialization issue:", err); 
    }
}

app.post('/api/ai/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Empty query parameter" });
    try {
        const answer = answerQuery(message, { courierARecords, courierBRecords, expectedInventory, courierAKeys });
        res.json({ answer });
    } catch (err) {
        res.json({ answer: "⚠️ Local index retrieval timeout exception." });
    }
});

function validateTrackingNumber(value) {
    const cleanStr = String(value || '').trim().replace('.0', '');
    if (!cleanStr || cleanStr.toLowerCase() === 'nan' || !/\d/.test(cleanStr)) return '-';
    return cleanStr;
}

async function fetchCoordinatesFromGeoapify(addressText) {
    if (!addressText || addressText === '-' || addressText.startsWith('Awaiting') || addressText.trim() === "") return null;
    try {
        const response = await axios.get('https://api.geoapify.com/v1/geocode/search', { 
            params: { text: addressText, apiKey: GEOCODE_API_KEY }, 
            httpsAgent: proxyBypassAgent, 
            timeout: 6000 
        });
        if (response.data?.features?.length > 0) {
            const props = response.data.features[0].properties;
            if (props.lat && props.lon) return [parseFloat(props.lat), parseFloat(props.lon)];
        }
    } catch (err) {}
    return null;
}

async function parseManifestWorkbook(filePath, carrier) {
    try {
        const workbook = xlsx.readFile(filePath);
        const dataGrid = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const parsed = [];
        for (let idx = 0; idx < dataGrid.length; idx++) {
            const row = dataGrid[idx];
            const outbound = validateTrackingNumber(row['Tracking Number'] || row['Master Tracking Number'] || row['Tracking ID']);
            const trackingReturn = validateTrackingNumber(row['Return Tracking Number'] || row['Return Tracking ID']);
            // Resolve the ticketRef the same way the row object is built below.
            // Previously this only looked at row['Number'], so any upload whose
            // sheet used an ticketRef/Task header produced a record that could not
            // match its own previous row - and every carried-forward field
            // (status, location, coords) was silently reset on re-upload.
            const ticketRef = String(row['Number'] || row['ticketRef'] || row['Task'] || row['ticketRef'] || outbound || `IDX-${idx}`);
            const priorList = carrier === 'courierA' ? courierARecords : courierBRecords;
            const existingRow = priorList.find(r => String(r.ticketRef) === ticketRef);
            // The operator note lives in its own file keyed by ticketRef, so it is
            // re-attached here on ingest as well as on read. This is what makes
            // a note survive an upload that renames or reorders the sheet.
            const priorNote = persistentNotesCache[ticketRef];
            
            parsed.push({
                carrier: carrier, 
                ticketRef: ticketRef,
                name: String(row['Name'] || row['Assigned To'] || 'Unassigned'), 
                outboundTrk: outbound,
                outboundStatus: existingRow?.outboundStatus || (outbound === '-' ? 'No Tracking Generated' : 'Pending Manual Sync...'), 
                returnTrk: trackingReturn,
                returnStatus: existingRow?.returnStatus || (trackingReturn === '-' ? 'No Return Required' : 'Pending Manual Sync...'), 
                location: existingRow?.location || 'Awaiting Live Data...', 
                coords: existingRow?.coords || null, 
                note: priorNote !== undefined ? priorNote : '',
                rank: outbound === '-' ? 4 : 1
            });
        }
        if (carrier === 'courierA') courierARecords = parsed; 
        else courierBRecords = parsed;
        appendLog(`Ingested ${carrier.toUpperCase()} Report: Parsed ${dataGrid.length} items.`);
    } catch (err) { 
        console.error("Parse exception:", err.message); 
    }
}

// 🔥 ticket ALM HARDWARE PARSER (WILDCARD ENABLED)
function parseAssetExport(filePath) {
    try {
        console.log(`\n[ALM SCANNER] Found file! Attempting to ingest: ${path.basename(filePath)}`);
        const workbook = xlsx.readFile(filePath);
        const dataGrid = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const parsed = [];
        
        for (let idx = 0; idx < dataGrid.length; idx++) {
            const row = dataGrid[idx];
            const serial = String(row['Serial number'] || row['Serial Number'] || row['serial_number'] || '').trim();
            if (!serial || serial === 'undefined') continue; 
            
            parsed.push({
                serial: serial,
                category: String(row['Model category'] || row['Model catagory'] || row['Category'] || ''),
                // The ALM export calls this column "Display name"; older
                // hand-saved sheets use "Model". Accept both, or the model
                // silently imports blank.
                model: String(row['Display name'] || row['Model'] || row['Description'] || ''),
                state: String(row['State'] || row['Status'] || ''),
                substate: String(row['Substate'] || row['Sub state'] || '')
            });
        }
        expectedInventory = parsed;
        appendLog(`📦 INGEST SUCCESS: Loaded ${parsed.length} ALM Expected Items into Scanner Memory.`);
    } catch (err) { 
        console.error(`[ALM SCANNER] Failed to parse ${path.basename(filePath)}:`, err.message); 
    }
}

async function fetchCourierBTrackingStatus(trackingNum) {
    if (!trackingNum || trackingNum === '-') return { status: '-', location: '' };
    try {
        const authResponse = await axios.post('https://apis.example-courier.com/oauth/token', 
            new URLSearchParams({ grant_type: 'client_credentials', client_id: COURIER_B_CLIENT_ID, client_secret: COURIER_B_CLIENT_SECRET }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, httpsAgent: proxyBypassAgent }
        );
        const trackResponse = await axios.post(COURIER_B_API_URL, 
            { includeDetailedScans: true, trackingInfo: [{ trackingNumberInfo: { trackingNumber: trackingNum } }] }, 
            { headers: { 'Authorization': `Bearer ${authResponse.data.access_token}`, 'Content-Type': 'application/json' }, httpsAgent: proxyBypassAgent }
        );
        const trackDetails = trackResponse.data?.output?.completeTrackResults?.[0]?.trackResults?.[0];
        if (trackDetails && !trackDetails.error) {
            let statusDesc = (trackDetails.latestStatusDetail?.description || 'Active Scan').toUpperCase();
            const scanLoc = trackDetails.latestStatusDetail?.scanLocation || {};
            return { status: statusDesc, location: scanLoc.city ? `${scanLoc.city}, USA` : '' };
        }
    } catch (error) {}
    return { status: '🔴 ERROR: NOT FOUND / TIMEOUT', location: '' };
}

async function fetchCourierATrackingStatus(trackingNum, isReturn = false) {
    if (!trackingNum || trackingNum === '-') return { status: '🔴 ERROR: NO TRACKING DATA', location: '' };
    
    let keysToTry = courierAMode === "AUTO" ? courierAKeys.filter(k => k.status === "OK") : courierAKeys.filter(k => k.id === parseInt(courierAMode));
    if (keysToTry.length === 0 && courierAMode === "AUTO") {
        courierAKeys.forEach(k => k.status = "OK"); 
        keysToTry = courierAKeys;
    }
    
    for (let apiObj of keysToTry) {
        try {
            const response = await axios.get(CourierA_API_URL, { 
                headers: { 'CourierA-API-Key': apiObj.key }, 
                params: { trackingNumber: trackingNum }, 
                timeout: 8000, 
                httpsAgent: proxyBypassAgent 
            });
            if (response.status === 200 && response.data?.shipments?.length > 0) {
                const node = response.data.shipments[0].status || {};
                let humanStatus = String(node.description || 'ACTIVE SCAN').toUpperCase();
                if (isReturn) humanStatus = humanStatus.includes('DELIVERED') ? `🟢 ${humanStatus}` : humanStatus;
                return { status: humanStatus, location: node.location?.address?.addressLocality || '' };
            }
        } catch (error) {
            if (error.response?.status === 429) { 
                apiObj.status = "QUOTA_EXCEEDED"; 
                continue; 
            } else if (error.response?.status === 404) {
                return { status: '🔴 ERROR: NOT FOUND / NO SCANS', location: '' };
            }
        }
    }
    return { status: '🔴 ERROR: OFFLINE / PROXY THROTTLED', location: '' };
}

const downloadsWatcher = chokidar.watch(DOWNLOADS_DIR, { ignored: () => true, persistent: false, ignoreInitial: true, depth: 0 });
downloadsWatcher.on('all', (event, filePath) => {
    if (event === 'add' || event === 'change') {
        const base = path.basename(filePath).toLowerCase();
        if (base.endsWith('.crdownload') || base.endsWith('.tmp') || base.endsWith('.part')) return;
        
        let retries = 0;
        const tryParseFile = () => {
            try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                    if ((MANIFEST_PATTERNS.some(p => base.includes(p)) || base.includes('manifest'))) {
                        parseManifestWorkbook(filePath, 'courierA');
                    } else if (base.includes('courierb') || base.includes('courier-b')) {
                        parseManifestWorkbook(filePath, 'courierB');
                    } else if (INVENTORY_PATTERNS.some(p => base.includes(p))) {
                        // 🔥 Trigger the ALM hardware ingest dynamically
                        parseAssetExport(filePath);
                    }
                }
            } catch (err) {
                if (err.code === 'EBUSY' && retries < 4) { 
                    retries++; 
                    setTimeout(tryParseFile, 1500); 
                }
            }
        };
        setTimeout(tryParseFile, 1500);
    }
});

// --- API ENDPOINTS ---
app.post('/api/set-api-mode', (req, res) => {
    const { mode } = req.body;
    if (mode) { 
        courierAMode = mode; 
        if (mode === "AUTO") courierAKeys.forEach(k => k.status = "OK"); 
    }
    res.json({ success: true, mode: courierAMode });
});

app.post('/api/refresh-single', async (req, res) => {
    const { ticketRef, carrier } = req.body;
    const recordsTarget = carrier === 'courierB' ? courierBRecords : courierARecords;
    let record = recordsTarget.find(r => r.ticketRef === ticketRef);
    if (!record) return res.status(404).json({ error: "Context target missing" });
    
    if (record.outboundTrk !== '-') {
        const outRes = record.carrier === 'courierA' ? await fetchCourierATrackingStatus(record.outboundTrk, false) : await fetchCourierBTrackingStatus(record.outboundTrk);
        record.outboundStatus = outRes?.status || '🔴 ERROR: NOT FOUND / NO SCANS';
        if (outRes?.location) { 
            record.location = outRes.location; 
            let geoCoords = await fetchCoordinatesFromGeoapify(record.location); 
            if (geoCoords) record.coords = geoCoords; 
        }
    }
    if (record.returnTrk !== '-') { 
        const retRes = record.carrier === 'courierA' ? await fetchCourierATrackingStatus(record.returnTrk, true) : await fetchCourierBTrackingStatus(record.returnTrk);
        record.returnStatus = retRes?.status || '🔴 ERROR: NOT FOUND / NO SCANS'; 
    }
    res.json({ success: true, record });
});

app.post('/api/workspace-note/save', (req, res) => {
    const { notes } = req.body;
    if (Array.isArray(notes)) { 
        workspaceNotepadNotesArray = notes; 
        try { fs.writeFileSync(WORKSPACE_NOTEPAD_FILE, JSON.stringify({ notes: workspaceNotepadNotesArray }, null, 2), 'utf8'); } catch (e) {} 
    }
    res.json({ success: true });
});

app.post('/api/chat/send', (req, res) => {
    const { sender, text } = req.body;
    if (!sender) return res.status(400).json({ error: "Sender missing" });
    chatMessagesDatabase.push({ 
        id: `MSG-${Date.now()}`, 
        sender: String(sender).trim(), 
        text: text ? String(text).trim() : "", 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        timeMs: Date.now() 
    });
    try { fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatMessagesDatabase, null, 2), 'utf8'); } catch (e) {}
    res.json({ success: true });
});

app.post('/api/chat/wipe', (req, res) => { 
    chatMessagesDatabase = []; 
    try { fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatMessagesDatabase, null, 2), 'utf8'); } catch (e) {}
    res.json({ success: true }); 
});

app.post('/api/delete-thread', (req, res) => { 
    const { threadId } = req.body; 
    if (threadId && !blacklistedMailThreads.includes(threadId)) { 
        blacklistedMailThreads.push(threadId); 
        try { fs.writeFileSync(THREADS_BLACKLIST_FILE, JSON.stringify(blacklistedMailThreads, null, 2), 'utf8'); } catch (e) {} 
    } 
    res.json({ success: true }); 
});

app.get('/api/notes', (req, res) => { res.json({ hints: persistentNotesCache }); });

app.post('/api/save-note', (req, res) => { 
    const { ticketRef, note } = req.body; 
    if (ticketRef) { 
        persistentNotesCache[ticketRef] = String(note || '').trim(); 
        try { fs.writeFileSync(NOTES_FILE_PATH, JSON.stringify(persistentNotesCache, null, 2), 'utf8'); } catch (e) {} 
    } 
    res.json({ success: true }); 
});


const RECORDS_CACHE = path.join(__dirname, 'records_cache.json');
function persistRecords(){ try{ fs.writeFileSync(RECORDS_CACHE, JSON.stringify({courierARecords, courierBRecords, expectedInventory})); }catch(e){} }
function loadRecordsCache(){ try{ if(fs.existsSync(RECORDS_CACHE)){ const j=JSON.parse(fs.readFileSync(RECORDS_CACHE,'utf8')||'{}'); if(Array.isArray(j.courierARecords)) courierARecords=j.courierARecords; if(Array.isArray(j.courierBRecords)) courierBRecords=j.courierBRecords; if(Array.isArray(j.expectedInventory)) expectedInventory=j.expectedInventory; } }catch(e){} }
loadRecordsCache();
function persistUpdates() {
    try {
        fs.writeFileSync(UPDATES_FILE_PATH, JSON.stringify(consignmentUpdates, null, 2), 'utf8');
    } catch (e) {
        console.error("Failed to persist updates:", e.message);
    }
}

app.post('/api/updates/add', (req, res) => {
    const { ticketRef, text, author } = req.body;
    if (!ticketRef || !String(text || '').trim()) {
        return res.status(400).json({ error: "ticketRef and text are required" });
    }
    const entry = {
        id: `UPD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: String(text).trim(),
        author: String(author || 'Operator').trim(),
        timestamp: new Date().toLocaleString(),
        timeMs: Date.now()
    };
    if (!Array.isArray(consignmentUpdates[ticketRef])) consignmentUpdates[ticketRef] = [];
    consignmentUpdates[ticketRef].push(entry);
    persistUpdates();
    appendLog(`Journal entry added to ${ticketRef} by ${entry.author}`);
    res.json({ success: true, entry });
});

app.post('/api/updates/delete', (req, res) => {
    const { ticketRef, id } = req.body;
    if (!ticketRef || !id) return res.status(400).json({ error: "ticketRef and id are required" });
    if (Array.isArray(consignmentUpdates[ticketRef])) {
        consignmentUpdates[ticketRef] = consignmentUpdates[ticketRef].filter(u => u.id !== id);
        if (consignmentUpdates[ticketRef].length === 0) delete consignmentUpdates[ticketRef];
        persistUpdates();
    }
    res.json({ success: true });
});

function loadBootFiles() {
    try {
        if (!fs.existsSync(DOWNLOADS_DIR)) return;
        const downloadsFiles = fs.readdirSync(DOWNLOADS_DIR);
        
        const courierALatest = downloadsFiles.filter(f => { const low = f.toLowerCase(); return MANIFEST_PATTERNS.some(p => low.includes(p)) && !low.includes('.tmp'); })
            .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime.getTime() })).sort((a, b) => b.time - a.time)[0];
        if (courierALatest) parseManifestWorkbook(path.join(DOWNLOADS_DIR, courierALatest.name), 'courierA');

        // 🔥 BOOT CHECK FOR ALM HARDWARE FILES
        const assetLatest = downloadsFiles.filter(f => { const low = f.toLowerCase(); return INVENTORY_PATTERNS.some(p => low.includes(p)) && !low.includes('.tmp'); })
            .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime.getTime() })).sort((a, b) => b.time - a.time)[0];
        if (assetLatest) parseAssetExport(path.join(DOWNLOADS_DIR, assetLatest.name));

    } catch (e) { 
        console.error("Boot loader failure:", e.message); 
    }
}

app.get('/api/state', (req, res) => {
    res.json({ 
        records: [...courierARecords, ...courierBRecords].map(rec => ({ ...rec, note: persistentNotesCache[rec.ticketRef] !== undefined ? persistentNotesCache[rec.ticketRef] : (rec.note || '') })), 
        logs: operationalLogs, 
        newEmailTasks: platformEmailAlertsRecords, 
        chatMessages: chatMessagesDatabase, 
        workspaceNotes: workspaceNotepadNotesArray,
        apiSettings: { keys: courierAKeys, mode: courierAMode },
        stockExpected: expectedInventory, // 🔥 Exposing expected stock to frontend
        updates: consignmentUpdates
    });
});

/* ---- email templates: persisted server-side so they survive hostname changes ---- */
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

app.get('/api/templates', (req, res) => {
    try {
        if (fs.existsSync(TEMPLATES_FILE)) {
            const list = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8') || '[]');
            return res.json({ ok: true, templates: Array.isArray(list) ? list : [] });
        }
        return res.json({ ok: true, templates: [] });
    } catch (e) {
        return res.json({ ok: false, error: String(e.message || e) });
    }
});

// Template Studio: dedicated persistent template editor page
app.get('/templates', (req, res) => res.sendFile(path.join(__dirname, 'templates-editor.html')));

app.post('/api/templates', (req, res) => {
    try {
        const list = Array.isArray(req.body) ? req.body : (req.body && req.body.templates);
        if (!Array.isArray(list)) return res.status(400).json({ ok: false, error: 'templates must be an array' });
        const clean = list.map((t) => ({
            id: String((t && t.id) || 'tpl-' + Date.now()).slice(0, 60),
            title: String((t && t.title) || 'Untitled').slice(0, 120),
            subject: String((t && t.subject) || '').slice(0, 200),
            body: String((t && t.body) || '').slice(0, 20000),
        }));
        // keep a timestamped backup before overwriting — templates never vanish
        try {
            if (fs.existsSync(TEMPLATES_FILE)) {
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                const bak = path.join(__dirname, 'templates.backup-' + stamp + '.json');
                fs.copyFileSync(TEMPLATES_FILE, bak);
                const olds = fs.readdirSync(__dirname).filter((f) => f.startsWith('templates.backup-')).sort();
                while (olds.length > 10) fs.unlinkSync(path.join(__dirname, olds.shift()));
            }
        } catch (e) { /* backup is best-effort */ }
        fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(clean, null, 2));
        return res.json({ ok: true, templates: clean });
    } catch (e) {
        return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
});


app.post('/api/upload', express.raw({type:'*/*', limit:'80mb'}), (req,res)=>{
  try{
    const kind=String(req.query.type||'courierA').toLowerCase();
    const tmp=path.join(os.tmpdir(),'assist_upload_'+Date.now()+'.xlsx');
    fs.writeFileSync(tmp, req.body);
    if(kind==='asset') parseAssetExport(tmp);
    else parseManifestWorkbook(tmp, kind==='courierB'?'courierB':'courierA');
    fs.unlinkSync(tmp);
    persistRecords();
    appendLog('Manual upload ingested: '+kind);
    res.json({ok:true,type:kind});
  }catch(e){ res.status(500).json({ok:false,error:e.message}); }
});

// The assistant's model key is read from COURIER_CLIENT_SECRET-free env only.
const ASSISTANT_KEY = String(process.env.ASSISTANT_API_KEY || '');
async function callAssistantModel(prompt, retries = 2) {
  const url = 'https://assistant.example-model.com/v1/models/default:generate?key=' + ASSISTANT_KEY;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.post(url, { contents: [{ role: 'user', parts: [{ text: prompt }] }] }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000, httpsAgent: proxyBypassAgent });
    } catch (e) {
      lastErr = e;
      const st = e.response && e.response.status;
      if (i < retries && (st === 429 || st === 500 || st === 503 || st === 529)) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
app.post('/api/chat', async (req,res)=>{
  try{
    const msg=String((req.body&&req.body.message)||'');
    const ctx={courierA:courierARecords.slice(0,150),courierB:courierBRecords.slice(0,150),stock:expectedInventory.slice(0,100),notes:persistentNotesCache,updates:consignmentUpdates,logs:operationalLogs.slice(-30)};
    const prompt='You are a concise operator assistant inside a shipment tracking dashboard. Answer briefly using this JSON data. You CAN add a follow-up note to the Follow-ups tab: to do it, end your reply with a line exactly like ADDUPDATE|ticketRef1234567|note text here. Use the ticketRef number of the matching record. Only do this when the user asks for a note, update or follow-up. DATA: '+JSON.stringify(ctx).slice(0,120000)+' QUESTION: '+msg;
    const r=await callAssistantModel(prompt);
    let out=r.data.candidates[0].content.parts[0].text;
    const mm=out.match(/ADDUPDATE\|(ticketRef[0-9]+)\|([^\n]+)/);
    if(mm){
      const entry={id:'UPD-'+Date.now()+'-auto',text:mm[2].trim(),author:'Operator',timestamp:new Date().toLocaleString(),timeMs:Date.now()};
      if(!Array.isArray(consignmentUpdates[mm[1]])) consignmentUpdates[mm[1]]=[];
      consignmentUpdates[mm[1]].push(entry); persistUpdates();
      appendLog('Operator added journal entry to '+mm[1]);
      out=out.replace(mm[0],'').trim()+' (note added to '+mm[1]+')';
    }
    res.json({reply:out});
  }catch(e){ res.status(500).json({reply:'Operator error: '+e.message}); }
});

const SPEECH_KEY = String(process.env.SPEECH_API_KEY || '');
app.post('/api/tts', async (req,res)=>{
  try{
    const text=String((req.body&&req.body.text)||'').slice(0,600);
    const r=await axios.post(`${process.env.SPEECH_ENDPOINT}/text-to-speech/${process.env.SPEECH_VOICE_ID}?output_format=mp3_22050_32`,{text:text,model_id:'speech-v2'},{headers:{'xi-api-key':SPEECH_KEY,'Content-Type':'application/json'},responseType:'arraybuffer',httpsAgent:proxyBypassAgent,timeout:30000});
    res.set('Content-Type','audio/mpeg').send(Buffer.from(r.data));
  }catch(e){ res.status(500).send('tts fail'); }
});
app.get('/api/changes', (req,res)=>{ const since=Number(req.query.since||0); res.json({now:Date.now(), changes:statusChanges.filter(c=>c.at>since)}); });
app.get('/api/sweep', async (req,res)=>{ await statusSweep(); res.json({changes:statusChanges.slice(-10)}); });
app.use(express.static(path.join(__dirname, 'frontend', 'dist'), {
    setHeaders(res, p) {
        // Never let browsers pin an old index.html referencing deleted hashed bundles
        if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    },
}));
app.use((req,res)=>res.sendFile(path.join(__dirname,'frontend','dist','index.html')));

// --- LOW-QUOTA BACKGROUND WATCHER ---
let statusChanges=[]; let sweepIdx=0;
async function statusSweep(){
  try{
    const all=courierARecords.concat(courierBRecords);
    if(!all.length) return;
    if(sweepIdx>=all.length) sweepIdx=0;
    const rec=all[sweepIdx++];
    appendLog('sweep checking '+(rec&&rec.ticketRef));
    if(!rec) return;
    const before={o:rec.outboundStatus,r:rec.returnStatus};
    if(rec.outboundTrk && rec.outboundTrk!=='-' && String(before.o).toUpperCase().indexOf('DELIVERED')<0){
      const res=await fetchCourierATrackingStatus(rec.outboundTrk,false);
      if(res&&res.status) rec.outboundStatus=res.status;
      if(res&&res.location) rec.location=res.location;
    } else if(rec.returnTrk && rec.returnTrk!=='-'){
      const res2=await fetchCourierATrackingStatus(rec.returnTrk,true);
      if(res2&&res2.status) rec.returnStatus=res2.status;
    }
    if(rec.outboundStatus!==before.o) statusChanges.push({ticketRef:rec.ticketRef,name:rec.name,leg:'outbound',from:before.o,to:rec.outboundStatus,at:Date.now()});
    if(rec.returnStatus!==before.r) statusChanges.push({ticketRef:rec.ticketRef,name:rec.name,leg:'return',from:before.r,to:rec.returnStatus,at:Date.now()});
    if(statusChanges.length>50) statusChanges=statusChanges.slice(-50);
    persistRecords();
  }catch(e){}
}
setInterval(statusSweep, 3*60*1000); setTimeout(statusSweep, 15000);
setInterval(persistRecords, 30000);
app.listen(Number(process.env.PORT) || 5000, () => { 
    console.log("\n==================================================");
    console.log("🚀 LOGISTICS INGEST ENGINE — STARTING");
    console.log("==================================================\n");
    loadPersistentNotes(); 
    loadBootFiles(); 
});