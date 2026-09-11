// 공통 UI: 시트, 뒤로가기 처리, 알림(소리·진동), 화면 켜짐, 차트
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
};

// ── 안드로이드 뒤로가기: 열린 시트/키패드부터 닫기 ──
// 히스토리에는 '가드' 항목을 하나만 둡니다. 버튼으로 닫을 때는 history.back()을 부르지 않습니다
// (back()이 처리되기 전에 새 시트가 열리면 크롬이 한 칸 더 뒤로 가서 앱이 꺼지는 문제 방지).
const layers = [];
let armed = !!(history.state && history.state.dl);
function pushLayer(close) {
  layers.push(close);
  if (!armed) { history.pushState({ dl: 1 }, ''); armed = true; }
}
function closeTop() {
  const c = layers.pop();
  if (c) c();
}
function removeLayer(close) {
  const i = layers.lastIndexOf(close);
  if (i < 0) return;
  layers.splice(i, 1);
  close();
}
window.addEventListener('popstate', () => {
  armed = !!(history.state && history.state.dl);
  const c = layers.pop();
  if (c) c();
  if (layers.length && !armed) { history.pushState({ dl: 1 }, ''); armed = true; }
});

function openSheet(html, { tall = false, onClose } = {}) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet${tall ? ' tall' : ''}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  $('#sheets').appendChild(bg);
  let closed = false;
  const doClose = () => { if (closed) return; closed = true; bg.remove(); if (onClose) onClose(); };
  pushLayer(doClose);
  bg.addEventListener('click', (e) => { if (e.target === bg) removeLayer(doClose); });
  return { el: bg.firstElementChild, close: () => { if (!closed) removeLayer(doClose); } };
}

function menuSheet(title, items) {
  const sh = openSheet(`${title ? `<h3>${esc(title)}</h3>` : ''}<div class="menu">${items.map((it, i) =>
    `<button data-i="${i}" class="${it.danger ? 'btn-danger' : ''}">${esc(it.label)}${it.sub ? `<div class="small muted">${esc(it.sub)}</div>` : ''}</button>`).join('')}</div>`);
  sh.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    sh.close();
    items[+b.dataset.i].fn();
  });
  return sh;
}

function confirmSheet({ title, body = '', ok = '확인', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const sh = openSheet(`<h3>${esc(title)}</h3>${body ? `<p class="ink2" style="margin:0">${body}</p>` : ''}
      <div class="row"><button class="btn grow" data-a="no">취소</button><button class="btn grow ${danger ? 'btn-danger' : 'btn-primary'}" data-a="yes">${esc(ok)}</button></div>`,
      { onClose: () => { if (!answered) resolve(false); } });
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      answered = true;
      sh.close();
      resolve(b.dataset.a === 'yes');
    });
  });
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 2400);
}

function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── 소리 · 진동 · 알림 · 화면 켜짐 ──
let actx;
function audioUnlock() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* 소리 미지원 */ }
}
function beep() {
  if (!S.settings.sound || !actx) return;
  const t = actx.currentTime;
  [0, 0.28, 0.56].forEach((d, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.4, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2);
    o.connect(g).connect(actx.destination);
    o.start(t + d); o.stop(t + d + 0.22);
  });
}
function buzz(pattern) {
  if (S.settings.vibrate && navigator.vibrate) navigator.vibrate(pattern);
}
async function notifyRest(body) {
  if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
  try {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 1500))]);
    if (reg) reg.showNotification('휴식 끝', { body, tag: 'rest', renotify: true, vibrate: [300, 120, 300, 120, 500], icon: 'icons/icon-192.png' });
  } catch (e) { /* 알림 실패는 무시 */ }
}
const wake = {
  lock: null, want: false,
  async on() {
    this.want = true;
    if (!S.settings.awake || !('wakeLock' in navigator) || this.lock) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => (this.lock = null));
    } catch (e) { /* 배터리 절약 모드 등 */ }
  },
  off() {
    this.want = false;
    if (this.lock) { this.lock.release(); this.lock = null; }
  },
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wake.want) wake.on();
});

// 수영장 페이스 클락 모양 다이얼: 남은 시간 호 + 60초마다 한 바퀴 도는 빨간 초침
function dialSVG(frac, elapsedSec) {
  const R = 20, C = 2 * Math.PI * R;
  const a = ((elapsedSec % 60) / 60) * 2 * Math.PI;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const t = (i / 12) * 2 * Math.PI, r1 = i % 3 ? 14.5 : 13, r2 = 16.5;
    return `<line x1="${24 + r1 * Math.sin(t)}" y1="${24 - r1 * Math.cos(t)}" x2="${24 + r2 * Math.sin(t)}" y2="${24 - r2 * Math.cos(t)}" stroke="#6F848E" stroke-width="${i % 3 ? 1 : 1.8}"/>`;
  }).join('');
  return `<svg class="dial" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="${R}" fill="none" stroke="#243540" stroke-width="3.5"/>
    <circle cx="24" cy="24" r="${R}" fill="none" stroke="#3BB4E6" stroke-width="3.5" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(1, frac)))}" transform="rotate(-90 24 24)"/>
    ${ticks}
    <line x1="24" y1="24" x2="${24 + 13 * Math.sin(a)}" y2="${24 - 13 * Math.cos(a)}" stroke="#FF5B4F" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2.4" fill="#FF5B4F"/>
  </svg>`;
}

// ── 선 차트 (한 종목 · 한 지표) ──
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw)), e = raw / mag;
  const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
// points: [{date, y, tip}]
function mountChart(box, points, fmtY) {
  if (!points.length) { box.innerHTML = '<div class="empty-state">아직 기록이 없습니다</div>'; return; }
  const W = Math.max(280, box.clientWidth - 16), H = 200, L = 38, Rp = 60, T = 14, B = 26;
  const xs = points.map((p) => parseISO(p.date).getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ticks = niceTicks(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (t) => (x1 === x0 ? L + (W - L - Rp) / 2 : L + ((t - x0) / (x1 - x0)) * (W - L - Rp));
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const pts = points.map((p, i) => ({ ...p, px: X(xs[i]), py: Y(p.y) }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join('');
  const area = `${line}L${pts[pts.length - 1].px.toFixed(1)},${H - B}L${pts[0].px.toFixed(1)},${H - B}Z`;
  const last = pts[pts.length - 1];
  const md = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - Rp + 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#22313A" stroke-width="1"/>
      <text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#6F848E" font-family="Barlow Condensed, sans-serif">${num(v)}</text>`).join('')}
    <path d="${area}" fill="#2A9BD0" fill-opacity=".1"/>
    <path d="${line}" fill="none" stroke="#2A9BD0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.length <= 40 ? pts.map((p) => `<circle cx="${p.px}" cy="${p.py}" r="4" fill="#2A9BD0" stroke="#131D23" stroke-width="2"/>`).join('') : ''}
    <circle cx="${last.px}" cy="${last.py}" r="5" fill="#2A9BD0" stroke="#131D23" stroke-width="2"/>
    <text x="${last.px + 9}" y="${last.py + 5}" font-size="15" font-weight="600" fill="#E6EEF1" font-family="Barlow Condensed, sans-serif">${fmtY(last.y)}</text>
    <text x="${L}" y="${H - 6}" font-size="11" fill="#6F848E">${md(x0)}</text>
    ${x1 !== x0 ? `<text x="${W - Rp}" y="${H - 6}" text-anchor="end" font-size="11" fill="#6F848E">${md(x1)}</text>` : ''}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#A9BAC2" stroke-width="1" visibility="hidden"/>
    <circle class="xd" r="6" fill="#2A9BD0" stroke="#E6EEF1" stroke-width="2" visibility="hidden"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" style="touch-action:pan-y"/>
  </svg><div class="tip" hidden></div>`;
  const svg = box.querySelector('svg'), tip = box.querySelector('.tip');
  const xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd');
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const mx = ((ev.clientX - r.left) / r.width) * W;
    let p = pts[0];
    for (const q of pts) if (Math.abs(q.px - mx) < Math.abs(p.px - mx)) p = q;
    xh.setAttribute('x1', p.px); xh.setAttribute('x2', p.px); xh.setAttribute('visibility', 'visible');
    xd.setAttribute('cx', p.px); xd.setAttribute('cy', p.py); xd.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<span class="muted">${fmtDate(p.date)}</span> <b>${fmtY(p.y)}</b><div class="ink2">${esc(p.tip)}</div>`;
    const left = (p.px / W) * r.width + 8;
    tip.style.left = Math.max(70, Math.min(r.width - 60, left)) + 'px';
  };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) show(e); });
  svg.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); xd.setAttribute('visibility', 'hidden'); tip.hidden = true; });
}
