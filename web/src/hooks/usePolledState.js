import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 5000; // 1.2s was hammering the cloudflare tunnel; 5s is plenty for a command deck

/**
 * Single source of truth for everything served by GET /api/state.
 * Polls on an interval and exposes the raw state plus a couple of
 * imperative actions. Components derive their own filtered/sorted
 * views from `records` etc. rather than duplicating fetch logic.
 */
export function usePolledState() {
  const [records, setRecords] = useState([]);
  const [newEmailTasks, setNewEmailTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [workspaceNotes, setWorkspaceNotes] = useState(null);
  const [apiSettings, setApiSettings] = useState({ keys: [], mode: 'AUTO' });
  const [stockExpected, setStockExpected] = useState([]);
  const [updates, setUpdates] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  const prevKeyStatusRef = useRef({});
  const prevEmailIdsRef = useRef(new Set());
  const eventListenersRef = useRef([]);

  const onEvent = useCallback((fn) => {
    eventListenersRef.current.push(fn);
    return () => {
      eventListenersRef.current = eventListenersRef.current.filter((f) => f !== fn);
    };
  }, []);

  const emit = useCallback((event) => {
    eventListenersRef.current.forEach((fn) => fn(event));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getState();
        if (cancelled) return;

        setRecords(data.records || []);
        setLogs(data.logs || []);
        setChatMessages(data.chatMessages || []);
        if (data.apiSettings) setApiSettings(data.apiSettings);
        if (data.stockExpected) setStockExpected(data.stockExpected);
        if (data.updates) setUpdates(data.updates);
        if (data.workspaceNotes !== undefined) setWorkspaceNotes(data.workspaceNotes);

        const incomingEmails = data.newEmailTasks || [];
        const incomingIds = new Set(incomingEmails.map((t) => t.threadId));
        incomingEmails.forEach((t) => {
          if (!prevEmailIdsRef.current.has(t.threadId) && prevEmailIdsRef.current.size > 0) {
            emit({ type: 'new-email', payload: t });
          }
        });
        prevEmailIdsRef.current = incomingIds;
        setNewEmailTasks(incomingEmails);

        (data.apiSettings?.keys || []).forEach((k) => {
          const prevStatus = prevKeyStatusRef.current[k.id];
          if (prevStatus === 'OK' && k.status !== 'OK') {
            emit({ type: 'key-throttled', payload: k });
          }
          prevKeyStatusRef.current[k.id] = k.status;
        });

        setConnectionStatus('Live');
      } catch {
        if (!cancelled) {
          setConnectionStatus('Disconnected');
          emit({ type: 'connection-error' });
        }
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [emit]);

  return {
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
  };
}
