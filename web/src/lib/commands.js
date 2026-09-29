import { LayoutDashboard, Barcode, MessageSquare, StickyNote, Cpu, RefreshCw, Trash2, Settings, User, Truck, ServerCog, MessageCircle, Video, RotateCcw } from 'lucide-react';
import { QUICK_NAV } from '../components/ledger/WebTab.jsx';

/**
 * Builds the command palette's action registry. Takes an object of
 * callbacks/setters from App.jsx so each command stays a thin
 * dispatch into existing app actions rather than duplicating logic.
 */
export function buildCommands(actions) {
  return [
    {
      group: 'Navigate',
      items: [
        { id: 'nav-dashboard', label: 'Go to Logistics Dashboard', icon: LayoutDashboard, run: () => actions.selectModule('dashboard') },
        { id: 'nav-scanner', label: 'Go to Stock Scanner', icon: Barcode, run: () => actions.selectModule('scanner') },
      ],
    },
    {
      group: 'Widgets',
      items: [
        { id: 'widget-chat', label: 'Open Chat Hub', icon: MessageSquare, run: () => actions.toggleWidget('chat') },
        { id: 'widget-notepad', label: 'Open Scratchpad', icon: StickyNote, run: () => actions.toggleWidget('notepad') },
        { id: 'widget-ai', label: 'Open AI Copilot', icon: Cpu, run: () => actions.toggleWidget('ai') },
      ],
    },
    {
      group: 'Actions',
      items: [
        { id: 'action-refresh', label: 'Refresh Visible Trackings', icon: RefreshCw, run: () => actions.refreshAllVisible() },
        { id: 'action-reset-layout', label: 'Reset Panel Layout', icon: RotateCcw, run: () => actions.resetLayout() },
        { id: 'action-wipe-chat', label: 'Wipe Global Chat History', icon: Trash2, run: () => actions.wipeChat() },
        { id: 'action-settings', label: 'Open Settings', icon: Settings, run: () => actions.openSettings() },
        { id: 'action-profile', label: 'Open Operator Profile', icon: User, run: () => actions.openProfile() },
      ],
    },
    {
      group: 'Quick Nav (Web tab)',
      items: QUICK_NAV.map((entry) => ({
        id: `nav-web-${entry.id}`,
        label: `Open ${entry.label}`,
        icon: entry.id === 'slack' ? MessageCircle : entry.id === 'webex' ? Video : entry.id === 'scknow' ? ServerCog : Truck,
        run: () => actions.openWebTab(entry.id, entry.url),
      })),
    },
  ];
}
