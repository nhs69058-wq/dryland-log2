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
  if (b.dataset.tab === 'history') ui.calSel = null;
  goTab(b.dataset.tab);
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

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // 백그라운드에서 다시 열 때도 새 버전이 있는지 확인 (10분에 한 번)
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || Date.now() - lastCheck < 10 * 60000) return;
      lastCheck = Date.now();
      reg.update().catch(() => {});
    });
  }).catch(() => {});
  // 새 버전이 설치되면 바로 적용: 운동 중이거나 창이 열려 있으면 버튼으로 물어봄
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (!activeSession() && !layers.length) location.reload();
    else toast('새 버전이 준비됐습니다', { label: '지금 적용', fn: () => location.reload() });
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
