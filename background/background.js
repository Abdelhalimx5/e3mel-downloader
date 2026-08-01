const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function resetDockToPopup() {
  try {
    if (browserAPI.action && browserAPI.action.setPopup) {
      browserAPI.action.setPopup({ popup: browserAPI.runtime.getURL('popup/popup.html') });
    }
    if (browserAPI.sidePanel && browserAPI.sidePanel.setPanelBehavior) {
      browserAPI.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
    if (browserAPI.sidePanel && browserAPI.sidePanel.setOptions) {
      browserAPI.sidePanel.setOptions({ enabled: false });
    }
  } catch (e) {}
}

browserAPI.runtime.onInstalled.addListener(resetDockToPopup);
browserAPI.runtime.onStartup.addListener(resetDockToPopup);

const EMBED_TIMEOUT = (typeof EMBED_TIMEOUT_MS !== 'undefined' ? EMBED_TIMEOUT_MS : 12000);
const ALLOWED_EMBED_HOSTS = new Set([
  'www.e3melbusiness.com',
  'e3melbusiness.com',
  'videos.sproutvideo.com',
  '127.0.0.1',
  'localhost'
]);

function isAllowedEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      ALLOWED_EMBED_HOSTS.has(parsed.hostname);
  } catch (e) {
    return false;
  }
}

function fetchEmbed(url, sendResponse) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT);
  fetch(url, { credentials: 'include', redirect: 'follow', signal: controller.signal })
    .then(resp => (resp.ok ? resp.text() : ''))
    .then(html => { clearTimeout(timer); sendResponse({ html }); })
    .catch(() => { clearTimeout(timer); sendResponse({ html: '' }); });
}

browserAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'fetchEmbed') {
    if (sender && sender.id && sender.id !== browserAPI.runtime.id) {
      sendResponse({ html: '' });
      return;
    }
    const url = String(msg.url || '');
    if (!isAllowedEmbedUrl(url)) {
      sendResponse({ html: '' });
      return;
    }
    fetchEmbed(url, sendResponse);
    return true;
  }
});
