// 운동 기록 화면: 세트 표 · 숫자 키패드 · 휴식 타이머 · 슈퍼세트
const ACTS = {};
const ui = { tab: 'today', edit: null, calMonth: null, calSel: null, progEx: null, progMetric: 'e1rm' };
let kp = null;        // {itemId, i, f:'w'|'r', fresh}
let editLayer = null;

// 지금 편집 중인 대상: 진행 중인 운동(active) · 지난 기록 수정(edit) · 루틴(routine)
function edCtx() {
  if (ui.edit) {
    const list = ui.edit.kind === 'routine' ? S.routines : S.sessions;
    const obj = list.find((x) => x.id === ui.edit.id);
    if (obj) return { kind: ui.edit.kind, obj };
    ui.edit = null;
  }
  const a = activeSession();
  return a ? { kind: 'active', obj: a } : null;
}
const findItem = (ctx, id) => ctx && ctx.obj.items.find((x) => x.id === id);

function startSession(items) {
  if (activeSession()) { toast('진행 중인 운동이 있습니다'); goTab('today'); return; }
  const lastPlace = (doneSessions().find((x) => x.type === 'weight' && x.place) || {}).place || '';
  const s = { id: uid(), type: 'weight', date: today(), place: lastPlace, cond: null, note: '', items: items || [], swim: null, start: Date.now(), end: null };
  S.sessions.push(s);
  S.activeId = s.id;
  save();
  audioUnlock();
  wake.on();
  if (ui.edit) removeLayer(editLayer);
  goTab('today');
}
function openEdit(kind, id) {
  if (ui.edit) removeLayer(editLayer);
  ui.edit = { kind, id };
  editLayer = () => { ui.edit = null; if (kp) { kp = null; renderKeypad(); } render(); };
  pushLayer(editLayer);
  render();
  window.scrollTo(0, 0);
}

// ── 화면 그리기 ──
function renderEditor(ctx) {
  const { kind, obj } = ctx;
  let head;
  if (kind === 'active') {
    head = `<div class="grow"><div class="ttl">운동 중</div><div class="clock" id="el-clock">${fmtDur(Date.now() - obj.start)}</div></div>
      <button class="btn btn-primary btn-sm" data-act="finish">운동 완료</button>`;
  } else {
    const sub = kind === 'routine'
      ? `<button class="small muted" data-act="rt-rename">${esc(obj.name)} · 이름 바꾸기</button>`
      : '<div class="small muted">바꾼 내용은 바로 저장됩니다</div>';
    head = `<button class="more" data-act="ed-close" aria-label="뒤로">${ICON.left}</button>
      <div class="grow"><div class="ttl">${kind === 'routine' ? '루틴 편집' : '기록 수정'}</div>${sub}</div>
      <button class="btn btn-primary btn-sm" data-act="ed-close">저장</button>`;
  }
  const meta = kind === 'routine' ? '' : `<div class="meta">
      <button class="chip" data-act="meta-date">${fmtDate(obj.date)}</button>
      <button class="chip" data-act="meta-place">${obj.place ? esc(obj.place) : '장소 선택'}</button>
      <button class="cond" data-act="meta-cond">컨디션 ${[1, 2, 3, 4, 5].map((n) => `<i class="${obj.cond >= n ? 'on' : ''}"></i>`).join('')}</button>
    </div>`;

  let body = '', gi = 0;
  const items = obj.items;
  for (let k = 0; k < items.length;) {
    const it = items[k];
    let run = [it];
    if (it.g) while (k + run.length < items.length && items[k + run.length].g === it.g) run.push(items[k + run.length]);
    if (run.length > 1) {
      const L = String.fromCharCode(65 + gi++);
      body += `<div class="group"><div class="group-tag"><span class="badge">슈퍼세트 ${L}</span><span>번갈아 수행 · 마지막 종목 뒤에 휴식</span></div>
        ${run.map((x, p) => itemCard(ctx, x, `${L}${p + 1}`)).join('<div class="rope" aria-hidden="true"></div>')}</div>`;
    } else {
      body += itemCard(ctx, it, '');
    }
    k += run.length;
  }
  if (!items.length) body = `<div class="empty-state">아래 버튼으로 종목을 추가하세요.<br>지난번 무게와 세트가 자동으로 채워집니다.</div>`;

  const tail = kind === 'routine'
    ? `<button class="btn btn-danger btn-block" data-act="rt-delete">이 루틴 삭제</button>`
    : `<label class="f">메모<textarea data-input="note" placeholder="스트랩 사용, 컨디션, 수영 연계 메모 등">${esc(obj.note)}</textarea></label>
       <button class="btn btn-danger btn-block" data-act="discard">${kind === 'active' ? '이 운동 취소' : '이 기록 삭제'}</button>`;

  return `<div class="sess-top">${head}</div>
    <div class="page" style="padding-top:14px">${meta}<div class="stack" style="gap:14px">${body}</div>
    <button class="btn btn-block" data-act="addex" style="min-height:54px;border:1.5px dashed var(--s3);background:none">+ 종목 추가</button>
    ${tail}</div>`;
}

function itemCard(ctx, it, tag) {
  const ex = exById(it.ex), m = MODES[ex.mode], w = hasW(ex), routine = ctx.kind === 'routine';
  const last = routine ? null : lastItemFor(it.ex, ctx.obj.id);
  const lastSets = last ? last.item.sets.filter((s) => s.done) : [];
  let rows = `<div class="hd">세트</div>${w ? `<div class="hd">${m.col}</div>` : ''}<div class="hd">${ex.mode === 'time' ? '초' : '렙'}</div>${routine ? '' : '<div class="hd">완료</div>'}`;
  let n = 0;
  it.sets.forEach((s, i) => {
    const sel = kp && kp.itemId === it.id && kp.i === i;
    rows += `<div style="display:contents" class="${s.done && !routine ? 'row-done' : ''}">
      <button class="sn ${s.wu ? 'wu' : ''}" data-act="setmenu" data-item="${it.id}" data-i="${i}" aria-label="세트 메뉴">${s.wu ? 'W' : ++n}</button>
      ${w ? cellHtml(ex, it, i, 'w', sel && kp.f === 'w') : ''}
      ${cellHtml(ex, it, i, 'r', sel && kp.f === 'r')}
      ${routine ? '' : `<button class="chk ${s.done ? 'on' : ''}" data-act="done" data-item="${it.id}" data-i="${i}" aria-label="세트 완료">${ICON.check}</button>`}
    </div>`;
  });
  return `<section class="ex" data-item="${it.id}">
    <div class="ex-h">
      <button class="nm" data-act="exmenu" data-item="${it.id}"><b>${tag ? `<span class="muted">${tag}</span> ` : ''}${esc(ex.name)}</b><span>${esc(ex.ko)} · ${m.name}</span></button>
      <button class="more" data-act="exmenu" data-item="${it.id}" aria-label="종목 메뉴">⋯</button>
    </div>
    ${it.note ? `<div class="ex-note">${esc(it.note)}</div>` : ''}
    ${lastSets.length ? `<div class="ex-last ellipsis">지난 ${fmtDate(last.session.date)} · ${lastSets.map((s) => fmtSet(ex, s)).join(' · ')}</div>` : ''}
    <div class="set-grid ${w ? '' : 'no-w'} ${routine ? 'routine' : ''}">${rows}</div>
    <div class="ex-f"><button data-act="rmset" data-item="${it.id}">− 세트 삭제</button><button data-act="addset" data-item="${it.id}">+ 세트 추가</button></div>
  </section>`;
}
function cellInner(ex, s, f) {
  const v = s[f];
  if (v == null) return '<span class="muted">–</span>';
  const txt = f === 'w' ? fmtW(ex, v) : num(v);
  const sub = f === 'w' && ex.mode === 'plates' && v ? `<small>${platesHint(v)}</small>` : '';
  return txt + sub;
}
function cellHtml(ex, it, i, f, sel) {
  return `<button class="cell ${sel ? 'sel' : ''}" data-act="cell" data-item="${it.id}" data-i="${i}" data-f="${f}">${cellInner(ex, it.sets[i], f)}</button>`;
}

// ── 키패드 ──
const kpLayer = () => { kp = null; renderKeypad(); $$('.cell.sel').forEach((c) => c.classList.remove('sel')); };
function selectCell(it, i, f) {
  const wasOpen = !!kp;
  kp = { itemId: it.id, i, f, fresh: true };
  if (!wasOpen) pushLayer(kpLayer);
  $$('.cell.sel').forEach((c) => c.classList.remove('sel'));
  const el = $(`.cell[data-item="${it.id}"][data-i="${i}"][data-f="${f}"]`);
  if (el) el.classList.add('sel');
  renderKeypad();
  if (el) requestAnimationFrame(() => {
    const r = el.getBoundingClientRect(), dockTop = window.innerHeight - $('#dock').offsetHeight;
    if (r.bottom > dockTop - 12 || r.top < 70) window.scrollBy({ top: r.top - Math.max(90, (dockTop - r.height) / 2.4), behavior: 'smooth' });
  });
}
function closeKeypad() { if (kp) removeLayer(kpLayer); }

function renderKeypad() {
  const el = $('#keypad'), ctx = edCtx(), it = kp && findItem(ctx, kp.itemId);
  if (!it || !it.sets[kp.i]) {
    kp = null;
    el.hidden = true;
    document.body.classList.remove('kp-open');
    syncDock();
    return;
  }
  const ex = exById(it.ex), s = it.sets[kp.i], m = MODES[ex.mode], isW = kp.f === 'w';
  const t = ex.mode === 'time';
  const st = isW ? [m.s1, m.s2, m.l1, m.l2] : [t ? 5 : 1, t ? 15 : 5, t ? '5' : '1', t ? '15' : '5'];
  const setNo = s.wu ? '워밍업' : `${it.sets.slice(0, kp.i + 1).filter((x) => !x.wu).length}세트`;
  const field = isW ? (ex.mode === 'added' ? '추가 중량' : ex.mode === 'plates' ? '원판 합계' : '무게') : (t ? '시간(초)' : '횟수');
  const hint = isW && ex.mode === 'plates' && s.w ? ` · ${platesHint(s.w)}` : '';
  const last = ctx.kind === 'routine' ? null : lastItemFor(it.ex, ctx.obj.id);
  const seen = new Set();
  const quick = (last ? last.item.sets.filter((x) => x.done) : []).filter((x) => {
    const k = `${x.w}|${x.r}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
  const okLabel = ctx.kind === 'routine' ? '다음' : ctx.kind === 'edit' ? '완료 표시' : '세트 완료';
  el.innerHTML = `<div class="kp-head"><div class="what ellipsis"><b>${esc(ex.name)}</b> · ${setNo} · ${field}<span id="kp-hint">${hint}</span></div>
      <button class="close" data-k="close" aria-label="키패드 닫기">${ICON.down}</button></div>
    ${quick.length ? `<div class="chips kp-quick">${quick.map((x) => `<button class="chip" data-q="${x.w ?? ''}|${x.r ?? ''}">${fmtSet(ex, x).replace('kg', '').replace(' × ', '×')}</button>`).join('')}</div>` : ''}
    <div class="kp-grid">
      <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
      <button class="fn" data-k="prev" aria-label="이전 칸">${ICON.left}</button><button class="fn" data-k="next" aria-label="다음 칸">${ICON.right}</button>
      <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
      <button class="fn" data-step="${-st[0]}">−${st[2]}</button><button class="fn" data-step="${st[0]}">+${st[2]}</button>
      <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
      <button class="fn" data-step="${-st[1]}">−${st[3]}</button><button class="fn" data-step="${st[1]}">+${st[3]}</button>
      <button data-k=".">.</button><button data-k="0">0</button><button class="fn" data-k="bs" aria-label="지우기">⌫</button>
      <button class="ok" data-k="ok">${okLabel}</button>
    </div>`;
  el.hidden = false;
  document.body.classList.add('kp-open');
  syncDock();
}

function setValue(ctx, it, i, f, v) {
  it.sets[i][f] = v;
  const ex = exById(it.ex);
  const cell = $(`.cell[data-item="${it.id}"][data-i="${i}"][data-f="${f}"]`);
  if (cell) cell.innerHTML = cellInner(ex, it.sets[i], f);
  const h = $('#kp-hint');
  if (h && f === 'w' && ex.mode === 'plates') h.textContent = v ? ` · ${platesHint(v)}` : '';
  save();
}
function cellOrder(ctx) {
  const out = [];
  for (const it of ctx.obj.items) {
    const w = hasW(exById(it.ex));
    it.sets.forEach((_, i) => { if (w) out.push([it, i, 'w']); out.push([it, i, 'r']); });
  }
  return out;
}
function moveCell(ctx, dir) {
  const order = cellOrder(ctx);
  const k = order.findIndex(([it, i, f]) => it.id === kp.itemId && i === kp.i && f === kp.f);
  const nx = order[k + dir];
  if (nx) selectCell(...nx);
}

$('#keypad').addEventListener('click', (e) => {
  const ctx = edCtx();
  const it = kp && findItem(ctx, kp.itemId);
  if (!it) return;
  const s = it.sets[kp.i];
  const b = e.target.closest('button');
  if (!b) return;
  audioUnlock();
  if (b.dataset.q != null) {
    const [w, r] = b.dataset.q.split('|');
    if (hasW(exById(it.ex))) setValue(ctx, it, kp.i, 'w', w === '' ? null : +w);
    setValue(ctx, it, kp.i, 'r', r === '' ? null : +r);
    kp.fresh = true;
    return;
  }
  if (b.dataset.step) {
    const v = Math.max(0, Math.round(((s[kp.f] ?? 0) + +b.dataset.step) * 100) / 100);
    setValue(ctx, it, kp.i, kp.f, v);
    kp.fresh = true;
    return;
  }
  const k = b.dataset.k;
  if (k === 'close') return closeKeypad();
  if (k === 'prev' || k === 'next') return moveCell(ctx, k === 'next' ? 1 : -1);
  if (k === 'ok') return completeSet(ctx, it, kp.i, true);
  let buf = kp.fresh ? '' : (s[kp.f] == null ? '' : kp.buf ?? String(s[kp.f]));
  if (k === 'bs') buf = buf.slice(0, -1);
  else if (k === '.') { if (!buf.includes('.')) buf = (buf || '0') + '.'; }
  else if (buf.length < 6) buf = buf === '0' ? k : buf + k;
  kp.fresh = false;
  kp.buf = buf;
  setValue(ctx, it, kp.i, kp.f, buf === '' || buf === '.' ? null : parseFloat(buf));
});

// ── 세트 완료 → 다음 칸 이동 · 휴식 시작 ──
const firstOpen = (it) => it.sets.findIndex((s) => !s.done);
function completeSet(ctx, it, i, fromKeypad) {
  if (ctx.kind === 'routine') {
    const order = cellOrder(ctx);
    const k = order.findIndex(([x, j, f]) => x.id === it.id && j === i && f === kp.f);
    const nx = order.slice(k + 1).find(([x, j]) => x.id !== it.id || j !== i);
    return nx ? selectCell(...nx) : closeKeypad();
  }
  const s = it.sets[i];
  const prev = it.sets[i - 1];
  if (prev) { if (s.w == null) s.w = prev.w; if (s.r == null) s.r = prev.r; }
  s.done = true;
  save();
  buzz(25);
  const items = ctx.obj.items;
  const grp = it.g ? items.filter((x) => x.g === it.g) : [it];
  let target = null, rest = true;
  for (let p = grp.indexOf(it) + 1; p < grp.length; p++) {
    const j = firstOpen(grp[p]);
    if (j >= 0) { target = [grp[p], j]; rest = false; break; }
  }
  if (!target) for (const g of grp) { const j = firstOpen(g); if (j >= 0) { target = [g, j]; break; } }
  if (!target) {
    for (let k = items.indexOf(grp[grp.length - 1]) + 1; k < items.length; k++) {
      const j = firstOpen(items[k]);
      if (j >= 0) { target = [items[k], j]; break; }
    }
  }
  if (ctx.kind === 'active' && target && rest) {
    startRest(Math.max(...grp.map((g) => exById(g.ex).rest || S.settings.rest)));
  }
  render();
  if (fromKeypad || kp) {
    if (target) selectCell(target[0], target[1], hasW(exById(target[0].ex)) ? 'w' : 'r');
    else { closeKeypad(); if (ctx.kind === 'active') toast('모든 세트를 완료했습니다'); }
  }
}

// ── 휴식 타이머 ──
function startRest(sec) {
  S.timer = { end: Date.now() + sec * 1000, total: sec, fired: false };
  save();
  tick();
}
function tick() {
  const rb = $('#restbar'), t = S.timer;
  if (!t || !activeSession()) {
    if (!rb.hidden) { rb.hidden = true; syncDock(); }
    return;
  }
  const remain = t.end - Date.now();
  if (remain <= 0 && !t.fired) {
    t.fired = true;
    save();
    beep();
    buzz([300, 120, 300, 120, 500]);
    if (document.hidden) notifyRest('다음 세트를 시작하세요');
  }
  if (!rb.firstChild) {
    rb.innerHTML = `<span class="dialbox"></span><div><div class="t"></div><div class="lbl"></div></div>
      <div class="ctl"><button data-rt="-10">−10</button><button data-rt="10">+10</button><button data-rt="skip"></button></div>`;
  }
  const over = remain <= 0;
  rb.hidden = false;
  rb.classList.toggle('over', over);
  rb.querySelector('.dialbox').innerHTML = dialSVG(remain / (t.total * 1000), (t.total * 1000 - remain) / 1000);
  rb.querySelector('.t').textContent = over ? '+' + fmtDur(-remain) : fmtDur(remain + 999);
  rb.querySelector('.lbl').textContent = over ? '휴식 끝 · 다음 세트' : `휴식 ${fmtDur(t.total * 1000)}`;
  rb.querySelector('[data-rt="skip"]').textContent = over ? '닫기' : '건너뛰기';
  syncDock();
}
$('#restbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rt]');
  if (!b || !S.timer) return;
  const v = b.dataset.rt;
  if (v === 'skip') S.timer = null;
  else {
    S.timer.end = Math.max(Date.now(), S.timer.end) + +v * 1000;
    S.timer.total = Math.max(10, S.timer.total + +v);
    if (S.timer.end > Date.now()) S.timer.fired = false;
  }
  save();
  tick();
});
let dockH = -1;
function syncDock() {
  const h = $('#dock').offsetHeight;
  if (h !== dockH) { dockH = h; document.documentElement.style.setProperty('--dock-h', h + 'px'); }
}
