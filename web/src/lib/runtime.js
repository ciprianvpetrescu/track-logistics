/**
 * The embedded Web Desk relies on Electron's <webview> tag, which only
 * works when the app is launched through `npm run desktop` (main.js sets
 * webviewTag: true). In a plain browser tab the element is inert and the
 * pane just renders blank, so surfaces depending on it must detect it.
 *
 * Do NOT sniff the user agent: any Electron-hosted browser (Claude
 * Desktop, VS Code's simple browser, Slack, etc.) reports "Electron" in
 * navigator.userAgent while still having webviewTag disabled. Likewise
 * `constructor !== HTMLUnknownElement` is useless — Chrome returns a
 * plain HTMLElement for unrecognised tags without a hyphen.
 *
 * Instead, feature-detect the capability itself: Electron upgrades
 * <webview> into a custom element exposing loadURL/getWebContentsId.
 */
export function supportsWebview() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    if (window.customElements?.get('webview')) return true;
    const el = document.createElement('webview');
    return typeof el.loadURL === 'function' || typeof el.getWebContentsId === 'function';
  } catch {
    return false;
  }
}
