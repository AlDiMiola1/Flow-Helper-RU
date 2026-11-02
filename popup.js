const toggle = document.getElementById('toggle');
const state = document.getElementById('state');
const dot = document.getElementById('dot');
let enabled = true;
function render() {
  state.textContent = enabled ? 'Помощник включён' : 'Помощник выключен';
  dot.classList.toggle('on', enabled);
  toggle.textContent = enabled ? 'Выключить' : 'Включить';
}
(async () => {
  const data = await chrome.storage.local.get('enabled');
  enabled = data.enabled !== false;
  render();
})();
toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  const next = !enabled;
  const result = await chrome.runtime.sendMessage({ type: 'toggle', enabled: next });
  if (result?.ok) {
    enabled = next;
    render();
    const tabs = await chrome.tabs.query({ url: 'https://flow.google.com/*' });
    for (const tab of tabs) if (tab.id) chrome.tabs.reload(tab.id);
  } else {
    state.textContent = 'Ошибка: ' + (result?.error || 'не удалось изменить состояние');
  }
  toggle.disabled = false;
});
document.getElementById('open').addEventListener('click', () => chrome.tabs.create({ url: 'https://flow.google.com/' }));
