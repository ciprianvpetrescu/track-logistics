import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

import { usePolledState } from './hooks/usePolledState.js';
import { useLocalStorageState } from './hooks/useLocalStorageState.js';
import { useCommandPalette } from './hooks/useCommandPalette.js';
import { ToastProvider, useToasts } from './hooks/useToasts.jsx';
import { api } from './lib/api.js';
import { playAudioBeep } from './lib/audio.js';
import { defaultTemplates } from './lib/templates.js';
import {
  isAwaitingCollection,
  isRowCompletedLifecycle,
  isRowCompletedOutboundOnly,
  isShippingInTransit,
  getRowSortRank,
  getOutboundState,
  countByOutboundState,
} from './lib/priority.js';
import { buildCommands } from './lib/commands.js';
import { usePanelLayout } from './hooks/usePanelLayout.js';
import { normaliseSerial } from './lib/manifest.js';
import { exportScannedSerialsCsv, exportStockCountTemplate } from './lib/exporters.js';

import TopBar from './components/layout/TopBar.jsx';
import DashboardView from './components/dashboard/DashboardView.jsx';
import StockScannerView from './components/scanner/StockScannerView.jsx';
import FastReplyPanel from './components/fastreply/FastReplyPanel.jsx';
import WidgetDock from './components/widgets/WidgetDock.jsx';
import AssistantWidget from './components/widgets/AssistantWidget.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ProfileModal from './components/modals/ProfileModal.jsx';
import SettingsModal from './components/modals/SettingsModal.jsx';
import ToastStack from './components/ui/ToastStack.jsx';

// Records whose combined text contains any of these terms are considered
// internal-only and are filtered out of every view.
const INTERNAL_FILTER_TERMS = ['INTERNAL-ONLY'];


function AppShell() {
  const {
    records,
    newEmailTasks,
    logs,
    chatMessages,
    workspaceNotes,
    apiSettings,
    stockExpected,
    updates,
    connectionStatus,
    onEvent,
  } = usePolledState();
  const { push: pushToast } = useToasts();
  const { layout, setLayout, updatePanel, resetLayout } = usePanelLayout();

  // --- connection status -> one toast per drop, not one per failed poll ---
  const prevConnRef = useRef('Live');
  useEffect(() => {
    if (connectionStatus === 'Disconnected' && prevConnRef.current !== 'Disconnected') {
      pushToast({ tone: 'red', title: 'Link lost', message: 'Backend unreachable on :5000', duration: 3000 });
    }
    prevConnRef.current = connectionStatus;
  }, [connectionStatus, pushToast]);

  // --- view / widget routing ---
  const [activeModule, setActiveModule] = useState('dashboard');
  const [activeWidget, setActiveWidget] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const lastChatMessageIdRef = useRef(null);

  const toggleWidget = useCallback((id) => {
    setActiveWidget((prev) => (prev === id ? null : id));
    if (id === 'chat') setChatUnreadCount(0);
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const latest = chatMessages[chatMessages.length - 1];
    if (latest.id !== lastChatMessageIdRef.current) {
      if (activeWidget !== 'chat' && lastChatMessageIdRef.current !== null) {
        setChatUnreadCount((prev) => prev + 1);
      }
      lastChatMessageIdRef.current = latest.id;
    }
  }, [chatMessages, activeWidget]);

  // --- profile ---
  const [profileName, setProfileName] = useLocalStorageState('it_hub_name', 'Operator');
  const [profilePic, setProfilePic] = useLocalStorageState('it_hub_pic', '');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const avatarUrl =
    profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=ff6b1a&color=000`;

  // --- settings / templates ---
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [templates, setTemplates] = useLocalStorageState('it_hub_templates', defaultTemplates);

  // Templates persist server-side (templates.json) so they survive tunnel
  // hostname changes / cleared localStorage. Server wins on load; localStorage
  // is only an offline cache; saves go to the server.
  useEffect(() => {
    fetch('/api/templates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.templates) && d.templates.length) setTemplates(d.templates);
      })
      .catch(() => {});
  }, []);
  const handleSaveTemplates = useCallback(
    (next) => {
      setTemplates(next);
      fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
    },
    [setTemplates]
  );

  // --- ledger ---
  const [searchQuery, setSearchQuery] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(() => new Set());
  const [ledgerTab, setLedgerTab] = useState('courier');
  const [sheetSize, setSheetSize] = useState('normal');
  const [selectedTask, setSelectedTask] = useState(null);
  const [refreshingTasks, setRefreshingTasks] = useState({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // --- web desk ---
  const [webTab, setWebTab] = useState('courierA');
  const [webUrl, setWebUrl] = useState('https://tracking.example-courier.com');

  // --- fast reply ---
  const [isFastReplyOpen, setIsFastReplyOpen] = useState(false);
  const [fastReplyValues, setFastReplyValues] = useState({
    deliveryDate: '',
    pickupDate: '',
    serialNumber: '',
    timeRange: '',
  });

  const { open: paletteOpen, close: closePalette, setOpen: setPaletteOpen } = useCommandPalette();

  // --- notepad ---
  const [notepadNotes, setNotepadNotes] = useState([]);
  const [activeNotepadTabId, setActiveNotepadTabId] = useState('');
  const isEditingNotepadRef = useRef(false);

  useEffect(() => {
    if (workspaceNotes && !isEditingNotepadRef.current) {
      setNotepadNotes(workspaceNotes);
      if (!activeNotepadTabId && workspaceNotes.length > 0) setActiveNotepadTabId(workspaceNotes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceNotes]);

  // --- scanner ---
  const [scannerValue, setScannerValue] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [scannerFeedback, setScannerFeedback] = useState(null);
  const [importedManifest, setImportedManifest] = useState(null);
  const [manifestFileName, setManifestFileName] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  const [exporting, setExporting] = useState(false);

  // A manually imported export wins over whatever the Downloads watcher found.
  const manifest = importedManifest || stockExpected;
  const manifestSource = importedManifest
    ? { name: manifestFileName, auto: false }
    : stockExpected.length > 0
    ? { name: 'Auto-ingested from Downloads', auto: true }
    : null;

  const manifestIndex = useMemo(() => {
    const map = new Map();
    manifest.forEach((item) => map.set(normaliseSerial(item.serial), item));
    return map;
  }, [manifest]);

  const handleImportManifest = useCallback(
    (items, fileName) => {
      setImportedManifest(items);
      setManifestFileName(fileName);
      pushToast({ tone: 'green', title: 'Manifest imported', message: `${items.length} items from ${fileName}` });
    },
    [pushToast]
  );

  const handleClearManifest = useCallback(() => {
    setImportedManifest(null);
    setManifestFileName('');
  }, []);

  // --- background event -> toast wiring ---
  useEffect(
    () =>
      onEvent((event) => {
        if (event.type === 'new-email') {
          pushToast({
            tone: 'accent',
            title: 'Follow-up received',
            message: `${event.payload.ticketRef || ''} · ${event.payload.subject || ''}`,
          });
        } else if (event.type === 'key-throttled') {
          pushToast({ tone: 'amber', title: 'CourierA key limited', message: `Key ${event.payload.id} → ${event.payload.status}` });
        }
      }),
    [onEvent, pushToast]
  );

  // --- derived data ---
  // Internal-only rows (any record whose text contains an entry from the
  // INTERNAL_FILTER_TERMS list) are dropped before anything is rendered.
  const visibleRecords = useMemo(
    () =>
      records.filter((row) => {
        const blob = `${row.ticketRef} ${row.name} ${row.outboundTrk} ${row.note || ''}`.toUpperCase();
        return !INTERNAL_FILTER_TERMS.some((term) => blob.includes(term));
      }),
    [records]
  );

  const displayedRecords = useMemo(
    () =>
      visibleRecords
        .filter((row) => {
          const q = searchQuery.toLowerCase();
          const matchesSearch =
            q === '' ||
            row.ticketRef.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q) ||
            row.outboundTrk.toLowerCase().includes(q);
          if (!matchesSearch) return false;
          if (lifecycleFilter === 'delivered' && !isRowCompletedLifecycle(row) && !isRowCompletedOutboundOnly(row)) return false;
          if (lifecycleFilter === 'shipping' && !isShippingInTransit(row)) return false;
          if (lifecycleFilter === 'awaiting' && !isAwaitingCollection(row)) return false;
          // Empty selection means "no colour filter", not "hide everything".
          if (statusFilter.size > 0 && !statusFilter.has(getOutboundState(row))) return false;
          return true;
        })
        .sort((a, b) => getRowSortRank(a) - getRowSortRank(b)),
    [visibleRecords, searchQuery, lifecycleFilter, statusFilter]
  );

  // Counts come from the search/lifecycle-filtered set but ignore the colour
  // filter, so the chips keep showing what you'd get by toggling them on.
  const statusCounts = useMemo(() => {
    const base = visibleRecords.filter((row) => {
      const q = searchQuery.toLowerCase();
      return (
        q === '' ||
        row.ticketRef.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.outboundTrk.toLowerCase().includes(q)
      );
    });
    return countByOutboundState(base);
  }, [visibleRecords, searchQuery]);

  const toggleStatusFilter = useCallback((state) => {
    setStatusFilter((prev) => {
      if (state === null) return new Set();
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }, []);

  const displayedEmailAlerts = useMemo(
    () =>
      newEmailTasks.filter(
        (row) =>
          searchQuery === '' ||
          (row.recipient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (row.ticketRef || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [newEmailTasks, searchQuery]
  );

  const totalThrottled = useMemo(
    () =>
      visibleRecords.filter((row) => {
        const s = String(row.returnStatus || '').toUpperCase();
        return s.includes('THROTTLED') || s.includes('OFFLINE') || s.includes('QUOTA_EXCEEDED');
      }).length,
    [visibleRecords]
  );
  const apiSuccessRate =
    visibleRecords.length > 0 ? Math.round(((visibleRecords.length - totalThrottled) / visibleRecords.length) * 100) : 100;

  const activeRowData = useMemo(() => records.find((r) => r.ticketRef === selectedTask) || {}, [records, selectedTask]);

  // --- actions ---
  const handleSelectRow = useCallback((row) => setSelectedTask(row.ticketRef), []);

  const handleSetApiMode = (mode) => api.setApiMode(mode).catch(console.error);

  const handleForceSingleRefresh = async (e, ticketRef, carrier) => {
    e.stopPropagation();
    setRefreshingTasks((prev) => ({ ...prev, [ticketRef]: true }));
    try {
      await api.refreshSingle(ticketRef, carrier);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRefreshingTasks((prev) => ({ ...prev, [ticketRef]: false })), 1000);
    }
  };

  const handleRefreshAllVisible = useCallback(async () => {
    if (displayedRecords.length === 0 || isRefreshingAll) return;
    setIsRefreshingAll(true);
    for (const row of displayedRecords) {
      setRefreshingTasks((prev) => ({ ...prev, [row.ticketRef]: true }));
      try {
        await api.refreshSingle(row.ticketRef, row.carrier);
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setRefreshingTasks((prev) => ({ ...prev, [row.ticketRef]: false })), 1000);
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setIsRefreshingAll(false);
    pushToast({ tone: 'green', title: 'Poll complete', message: `${displayedRecords.length} consignment(s) refreshed.` });
  }, [displayedRecords, isRefreshingAll, pushToast]);

  const handleDeleteThread = (threadId) => api.deleteThread(threadId).catch(console.error);

  const handleAddUpdate = useCallback(
    async (ticketRef, text, author) => {
      try {
        await api.addUpdate(ticketRef, text, author);
        pushToast({ tone: 'green', title: 'Update logged', message: ticketRef, duration: 2000 });
      } catch (e) {
        console.error(e);
        pushToast({ tone: 'red', title: 'Could not log update', message: 'Backend unreachable.' });
      }
    },
    [pushToast]
  );

  const handleDeleteUpdate = useCallback(async (ticketRef, id) => {
    try {
      await api.deleteUpdate(ticketRef, id);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleWipeChat = () => api.wipeChat().catch(console.error);
  const handleClearAiCache = () => localStorage.removeItem('isolated_console_ai_history');
  const handleHardReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- scanner logic ---
  const handleScannerSubmit = () => {
    const rawScan = scannerValue.trim();
    if (!rawScan) return;
    const key = normaliseSerial(rawScan);
    const timestamp = new Date().toLocaleString();

    const alreadyScanned = scannedItems.some((item) => normaliseSerial(item.scannedSn) === key);
    const expectedMatch = manifestIndex.get(key);

    if (alreadyScanned) {
      playAudioBeep('error');
      setScannerFeedback({ type: 'error', msg: `DUPLICATE · ${rawScan}` });
      setScannedItems((prev) => [
        {
          serialFromticket: expectedMatch ? expectedMatch.serial : '',
          category: expectedMatch?.category || '',
          model: expectedMatch?.model || 'ALREADY SCANNED',
          state: expectedMatch?.state || '',
          substate: expectedMatch?.substate || '',
          scannedSn: rawScan,
          matchStatus: 'DUPLICATE',
          timestamp,
        },
        ...prev,
      ]);
    } else if (expectedMatch) {
      playAudioBeep('success');
      setScannerFeedback({
        type: 'success',
        msg: `MATCH · ${expectedMatch.substate || expectedMatch.state || expectedMatch.model}`,
      });
      setScannedItems((prev) => [
        {
          serialFromticket: expectedMatch.serial,
          category: expectedMatch.category,
          model: expectedMatch.model,
          state: expectedMatch.state,
          substate: expectedMatch.substate,
          scannedSn: rawScan,
          matchStatus: 'TRUE',
          timestamp,
        },
        ...prev,
      ]);
    } else {
      playAudioBeep('error');
      setScannerFeedback({
        type: 'error',
        msg: manifest.length === 0 ? `NO MANIFEST LOADED · ${rawScan}` : `NOT IN STOCK LIST · ${rawScan}`,
      });
      setScannedItems((prev) => [
        {
          serialFromticket: '',
          category: '',
          model: 'NOT IN STOCK LIST',
          state: '',
          substate: '',
          scannedSn: rawScan,
          matchStatus: 'FALSE',
          timestamp,
        },
        ...prev,
      ]);
    }

    setScannerValue('');
    setTimeout(() => setScannerFeedback(null), 3000);
  };

  const handleRemoveScan = (index) => setScannedItems((prev) => prev.filter((_, i) => i !== index));

  const handleExportCsv = useCallback(() => {
    if (scannedItems.length === 0) return;
    const count = exportScannedSerialsCsv(scannedItems);
    pushToast({ tone: 'green', title: 'Serials exported', message: `${count} serial numbers written to .csv` });
  }, [scannedItems, pushToast]);

  const handleExportTemplate = useCallback(async () => {
    if (scannedItems.length === 0 || exporting) return;
    setExporting(true);
    try {
      const result = await exportStockCountTemplate(scannedItems, screenshots, { operatorName: profileName });
      pushToast({
        tone: 'green',
        title: 'Template exported',
        message: `${result.rows} rows · ${result.matched} matched · ${result.images} screenshot(s)`,
      });
      playAudioBeep('success');
    } catch (e) {
      console.error(e);
      pushToast({ tone: 'red', title: 'Export failed', message: e.message || 'Could not build the workbook.' });
    } finally {
      setExporting(false);
    }
  }, [scannedItems, screenshots, profileName, exporting, pushToast]);

  // --- command palette ---
  const commandGroups = useMemo(
    () =>
      buildCommands({
        selectModule: setActiveModule,
        toggleWidget,
        refreshAllVisible: handleRefreshAllVisible,
        resetLayout,
        wipeChat: handleWipeChat,
        openSettings: () => setIsSettingsModalOpen(true),
        openProfile: () => setIsProfileModalOpen(true),
        openWebTab: (id, url) => {
          setActiveModule('dashboard');
          setLedgerTab('webView');
          setSheetSize('tall');
          setWebTab(id);
          setWebUrl(url);
        },
      }),
    [toggleWidget, handleRefreshAllVisible]
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden select-none">
      <TopBar
        activeModule={activeModule}
        onSelectModule={(id) => {
          setActiveModule(id);
          setActiveWidget(null);
        }}
        activeWidget={activeWidget}
        onToggleWidget={toggleWidget}
        chatUnreadCount={chatUnreadCount}
        connectionStatus={connectionStatus}
        profileName={profileName}
        avatarUrl={avatarUrl}
        onOpenSettings={() => {
          setSettingsTab('general');
          setIsSettingsModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {activeModule === 'dashboard' ? (
        <DashboardView
          activeCount={displayedRecords.length}
          apiSuccessRate={apiSuccessRate}
          counts={statusCounts}
          statusFilter={statusFilter}
          onToggleStatus={toggleStatusFilter}
          layout={layout}
          onSetLayout={setLayout}
          onUpdatePanel={updatePanel}
          onResetLayout={resetLayout}
          apiSettings={apiSettings}
          onSetApiMode={handleSetApiMode}
          lifecycleFilter={lifecycleFilter}
          onSetLifecycleFilter={setLifecycleFilter}
          logs={logs}
          mapRecords={visibleRecords}
          onSelectRow={handleSelectRow}
          focusTask={selectedTask}
          ledgerProps={{
            tab: ledgerTab,
            onSetTab: setLedgerTab,
            searchQuery,
            onSetSearchQuery: setSearchQuery,
            displayedRecords,
            displayedEmailAlerts,
            selectedTask,
            refreshingTasks,
            isRefreshingAll,
            onSelectRow: handleSelectRow,
            onForceRefresh: handleForceSingleRefresh,
            onRefreshAllVisible: handleRefreshAllVisible,
            onDeleteThread: handleDeleteThread,
            onOpenFastReply: () => setIsFastReplyOpen(true),
            webState: { activeTab: webTab, urlInput: webUrl, onSetTab: setWebTab, onSetUrl: setWebUrl },
            sheetSize,
            onSetSheetSize: setSheetSize,
            statusFilter,
            onSetStatusFilter: setStatusFilter,
            statusCounts,
            journalProps: {
              updates,
              operatorName: profileName,
              onAddUpdate: handleAddUpdate,
              onDeleteUpdate: handleDeleteUpdate,
            },
          }}
        />
      ) : (
        <StockScannerView
          scannerValue={scannerValue}
          onChangeScannerValue={setScannerValue}
          onSubmitScan={handleScannerSubmit}
          feedback={scannerFeedback}
          manifest={manifest}
          manifestSource={manifestSource}
          onImportManifest={handleImportManifest}
          onClearManifest={handleClearManifest}
          scannedItems={scannedItems}
          onRemoveScan={handleRemoveScan}
          onExportCsv={handleExportCsv}
          onExportTemplate={handleExportTemplate}
          exporting={exporting}
          screenshots={screenshots}
          onChangeScreenshots={setScreenshots}
        />
      )}

      <WidgetDock
        activeWidget={activeWidget}
        onClose={() => setActiveWidget(null)}
        chatMessages={chatMessages}
        profileName={profileName}
        notepadProps={{
          notes: notepadNotes,
          activeTabId: activeNotepadTabId,
          onSetActiveTabId: setActiveNotepadTabId,
          onSetNotes: setNotepadNotes,
          isEditingRef: isEditingNotepadRef,
        }}
      />

      <FastReplyPanel
        open={isFastReplyOpen}
        onClose={() => setIsFastReplyOpen(false)}
        selectedTask={selectedTask}
        activeRow={activeRowData}
        values={fastReplyValues}
        onChangeValues={setFastReplyValues}
        templates={templates}
        onManageTemplates={() => {
          setSettingsTab('templates');
          setIsSettingsModalOpen(true);
          setIsFastReplyOpen(false);
        }}
        onCopied={() => pushToast({ tone: 'accent', title: 'Copied', message: 'Template on clipboard.', duration: 2000 })}
      />

      <ProfileModal
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profileName={profileName}
        profilePic={profilePic}
        onSave={(name, pic) => {
          setProfileName(name);
          setProfilePic(pic);
          setIsProfileModalOpen(false);
        }}
      />

      <SettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        templates={templates}
        onSaveTemplates={handleSaveTemplates}
        onWipeChat={handleWipeChat}
        onClearAiCache={handleClearAiCache}
        onHardReset={handleHardReset}
        initialTab={settingsTab}
      />

      <CommandPalette open={paletteOpen} onClose={closePalette} groups={commandGroups} />
      <AssistantWidget profileName={profileName} />
      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
