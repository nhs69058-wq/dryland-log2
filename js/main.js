// 시작 · 화면 전환 · 이벤트 연결
let deferredInstall = null;

function render() {
  const c = edCtx();
  let html;
  if (ui.edit && c) html = renderEditor(c);
  else if (ui.tab === 'today') html = c ? renderEditor(c) : renderHome();
  else if (ui.tab === 'history') html = renderHistory();
  else if (ui.tab === 'progress') html = renderProgress();
  else html = renderMore();
  $('#view').innerHTML = html;
  $$('#tabs [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#tabs [data-tab="today"]').classList.toggle('live', !!activeSession());
  if (postRender) { const f = postRender; postRender = null; f(); }
  tick();
  syncDock();
}

$('#view').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || !ACTS[b.dataset.act]) return;
  e.preventDefault();
  ACTS[b.dataset.act](b, e);
});
$('#view').addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el);
});
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (ui.edit) removeLayer(editLayer);
  ui.tab = b.dataset.tab;
  if (ui.tab === 'history') ui.calSel = null;
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (ui.tab === 'more') render();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
new ResizeObserver(syncDock).observe($('#dock'));

load();
if (S.activeId && !activeSession()) S.activeId = null;
render();
if (activeSession()) wake.on();
setInterval(() => {
  tick();
  const el = $('#el-clock'), a = activeSession();
  if (el && a && a.start) el.textContent = fmtDur(Date.now() - a.start);
}, 250);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
