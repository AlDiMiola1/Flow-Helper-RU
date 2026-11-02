'use strict';
const SCRIPT_ID = 'flow-helper-ru-main-hook';
const KEY = 'enabled';
const descriptor = {
  id: SCRIPT_ID,
  matches: ['https://flow.google.com/*'],
  js: ['hook.js'],
  runAt: 'document_start',
  world: 'MAIN',
  persistAcrossSessions: true
};

async function apply(enabled) {
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (enabled && !registered.length) await chrome.scripting.registerContentScripts([descriptor]);
  if (!enabled && registered.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  await chrome.storage.local.set({ [KEY]: enabled });
  return { ok: true, enabled };
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(KEY);
  await apply(data[KEY] ?? true);
});
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(KEY);
  await apply(data[KEY] ?? true);
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.tab || msg?.type !== 'toggle') return;
  apply(Boolean(msg.enabled)).then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
  return true;
});
(async () => {
  const data = await chrome.storage.local.get(KEY);
  await apply(data[KEY] ?? true);
})().catch(() => {});
