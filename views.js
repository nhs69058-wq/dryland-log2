// 홈 · 기록(달력) · 기록 상세 · 수영 기록 · 분석
let postRender = null;

// 기록 삭제 = 휴지통으로 이동 (30일 보관) + 바로 되돌리기 버튼
function trashWithUndo(id, msg) {
  if (!trashSession(id)) return;
  render();
  toast(msg || `휴지통으로 옮겼습니다 (${TRASH_DAYS}일 보관)`, {
    label: '되돌리기',
    fn: () => { restoreSession(id); render(); toast('되돌렸습니다'); },
  });
}

function swimText(s) {
  const w = s.swim || {};
  return [w.dist ? `${w.dist}m` : '', w.time || '', w.detail || '', s.note].filter(Boolean).join(' · ') || '수영';
}
function sessRow(s) {
  const txt = s.type === 'swim' ? swimText(s) : (s.items.map((it) => exById(it.ex).name).join(', ') || s.note || '메모만 있음');
  const sets = s.type === 'weight' ? sessionStats(s).sets : 0;
  return `<button class="list-btn" data-act="detail" data-id="${s.id}">
    <div class="grow" style="min-width:0">
      <div class="row"><b>${fmtDate(s.date)}</b>${s.type === 'swim' ? '<span class="badge swim">수영</span>' : ''}<span class="small muted ellipsis">${esc(s.place)}</span></div>
      <div class="small ink2 ellipsis">${esc(txt)}</div>
    </div>${sets ? `<span class="num ink2" style="font-size:16px">${sets}세트</span>` : ''}</button>`;
}
function goalsHtml() {
  if (!S.goals.length) return `<button class="list-btn" data-act="goals"><span class="grow ink2">목표를 정하면 진행률을 보여줍니다 (예: Trap Bar Deadlift 145kg)</span></button>`;
  return S.goals.map((g) => {
    const p = goalProgress(g), ex = p.ex;
    const unit = ex.mode === 'time' ? '초' : 'kg';
    return `<div class="card stack" style="gap:8px">
      <div class="row"><b class="grow ellipsis">${esc(ex.name)}</b>${p.achieved ? `<span class="badge pr">달성 ${fmtDate(p.achieved)}</span>` : ''}</div>
      <div class="row small ink2"><span class="grow">목표 <b class="num" style="font-size:17px;color:var(--ink)">${fmtW(ex, g.w)}${unit} × ${g.r}${g.sets > 1 ? ` × ${g.sets}세트` : ''}</b></span>
        <span>최고 ${p.best == null ? '—' : `<b class="num" style="font-size:17px;color:var(--ink)">${fmtW(ex, p.best)}${unit}</b>`} (${g.r}회 이상)</span></div>
      <div class="meter ${p.achieved ? 'done' : ''}"><i style="width:${Math.round(p.pct * 100)}%"></i></div>
    </div>`;
  }).join('');
}

// ── 홈 ──
function renderHome() {
  const last = doneSessions().find((s) => s.type === 'weight' && s.items.length);
  const ev = nextEvent();
  const bd = S.settings.lastBackup ? Math.floor((Date.now() - S.settings.lastBackup) / 86400000) : null;
  const recent = doneSessions().slice(0, 3);
  return `<div class="top"><div class="wordmark">DRYLAND<small>수영을 위한 웨이트 기록</small></div><div class="ink2">${fmtDate(today())}</div></div>
  <div class="page">
    ${(bd == null || bd >= 14) && S.sessions.length ? `<div class="banner"><span class="grow">기록은 이 폰에만 저장됩니다. 마지막 백업: ${bd == null ? '없음' : bd + '일 전'}</span><button class="btn btn-sm" data-act="backup">백업</button></div>` : ''}
    <div class="stack">
      <button class="btn btn-primary btn-block" data-act="start-empty" style="min-height:58px;font-size:17px">운동 시작</button>
      <div class="row">
        <button class="btn grow" data-act="repeat" ${last ? '' : 'disabled'} style="flex-direction:column;gap:0;min-height:58px"><span>지난 운동 반복</span><span class="small muted" style="font-weight:400">${last ? fmtDate(last.date) + ' · ' + last.items.length + '종목' : '기록 없음'}</span></button>
        <button class="btn grow" data-act="swim-new" style="flex-direction:column;gap:0;min-height:58px"><span>수영 기록</span><span class="small muted" style="font-weight:400">거리 · 시간 · 세트</span></button>
      </div>
    </div>
    ${ev ? `<button class="list-btn" data-act="events"><span class="num" style="font-size:34px;font-weight:700;line-height:1;color:var(--clock)">D-${daysUntil(ev.date) || 'DAY'}</span>
      <span class="grow"><b>${esc(ev.name)}</b><div class="small muted">${fmtDate(ev.date, true)}</div></span></button>`
    : `<button class="list-btn" data-act="events"><span class="grow ink2">다가오는 대회가 없습니다</span><span class="small" style="color:var(--acc)">대회 일정 추가</span></button>`}
    <section><div class="sec-h"><h2>루틴</h2><button data-act="routines">관리</button></div>
      <div class="stack">${S.routines.length ? S.routines.map((r) => `<div class="list-btn" style="padding:0">
        <button class="grow" data-act="rt-start" data-id="${r.id}" style="text-align:left;padding:14px;min-width:0"><b>${esc(r.name)}</b>
          <div class="small ink2 ellipsis">${r.items.map((it) => exById(it.ex).name).join(', ')}</div></button>
        <button class="btn btn-sm" data-act="rt-edit" data-id="${r.id}" style="margin-right:10px">편집</button></div>`).join('')
      : '<div class="card small ink2">운동을 마친 뒤 기록 상세에서 “루틴으로 저장”을 누르면 여기에 생깁니다.</div>'}</div>
    </section>
    <section><div class="sec-h"><h2>목표</h2><button data-act="goals">편집</button></div><div class="stack">${goalsHtml()}</div></section>
    <section><div class="sec-h"><h2>최근 기록</h2><button data-act="tab-history">전체 보기</button></div>
      <div class="stack">${recent.map(sessRow).join('') || '<div class="empty-state">아직 기록이 없습니다</div>'}</div></section>
  </div>`;
}
ACTS['start-empty'] = () => startSession([]);
ACTS.repeat = () => {
  const last = doneSessions().find((s) => s.type === 'weight' && s.items.length);
  if (last) startSession(copyItems(last.items, false));
};
ACTS['swim-new'] = () => swimSheet(null);
ACTS['rt-start'] = (b) => { const r = S.routines.find((x) => x.id === b.dataset.id); if (r) startSession(fromRoutine(r)); };
ACTS['rt-edit'] = (b) => openEdit('routine', b.dataset.id);
ACTS.detail = (b) => sessionDetail(b.dataset.id);
ACTS['tab-history'] = () => { ui.calSel = null; goTab('history'); };

// ── 기록 (달력) ──
function renderHistory() {
  const ym = ui.calMonth || today().slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m, 0).getDate();
  const by = {};
  for (const s of doneSessions()) (by[s.date] ||= []).push(s);
  const evBy = {};
  for (const e of S.events) evBy[e.date] = e;
  const n = Math.ceil((off + days) / 7) * 7, t = today();
  let cells = ['월', '화', '수', '목', '금', '토', '일'].map((d) => `<div class="dw">${d}</div>`).join('');
  for (let k = 0; k < n; k++) {
    const d = new Date(y, m - 1, 1 - off + k), ds = iso(d), list = by[ds] || [];
    const dots = [
      list.some((s) => s.type === 'weight') ? '<i></i>' : '',
      list.some((s) => s.type === 'swim') ? '<i class="sw"></i>' : '',
      evBy[ds] ? '<i class="ev"></i>' : '',
    ].join('');
    cells += `<button class="${d.getMonth() !== m - 1 ? 'other' : ''} ${ds === t ? 'today' : ''} ${ds === ui.calSel ? 'sel' : ''}" data-act="cal-day" data-d="${ds}">${d.getDate()}<span class="dots">${dots}</span></button>`;
  }
  const monthList = doneSessions().filter((s) => s.date.startsWith(ym));
  const list = ui.calSel ? doneSessions().filter((s) => s.date === ui.calSel) : monthList;
  const wN = monthList.filter((s) => s.type === 'weight').length, sN = monthList.length - wN;
  const selEv = ui.calSel && evBy[ui.calSel];
  return `<div class="top"><h1 style="font-size:22px">기록</h1><button class="btn btn-sm" data-act="swim-new">+ 수영 기록</button></div>
  <div class="page">
    <div class="card">
      <div class="row" style="margin-bottom:8px">
        <button class="btn btn-sm" data-act="cal-prev" aria-label="이전 달">${ICON.left}</button>
        <b class="grow" style="text-align:center;font-size:16px">${y}년 ${m}월</b>
        <button class="btn btn-sm" data-act="cal-next" aria-label="다음 달">${ICON.right}</button>
      </div>
      <div class="cal">${cells}</div>
      <div class="row small muted" style="margin-top:10px;gap:14px;justify-content:center">
        <span class="row" style="gap:5px"><i style="width:14px;height:4px;border-radius:2px;background:var(--acc)"></i>웨이트 ${wN}회</span>
        <span class="row" style="gap:5px"><i style="width:14px;height:4px;border-radius:2px;background:#E6EEF1;opacity:.55"></i>수영 ${sN}회</span>
        <span class="row" style="gap:5px"><i style="width:5px;height:4px;border-radius:2px;background:var(--clock)"></i>대회</span>
      </div>
    </div>
    <section><div class="sec-h"><h2>${ui.calSel ? fmtDate(ui.calSel) : `${m}월 기록`}</h2>${ui.calSel ? '<button data-act="cal-all">이 달 전체</button>' : ''}</div>
      <div class="stack">
        ${selEv ? `<div class="card row"><span class="badge" style="background:rgba(255,91,79,.18);color:#FF9A91">대회</span><b>${esc(selEv.name)}</b></div>` : ''}
        ${list.map(sessRow).join('') || `<div class="empty-state">기록이 없습니다${ui.calSel ? `<br><button class="btn btn-sm" data-act="log-past" data-d="${ui.calSel}" style="margin-top:10px">이 날짜에 웨이트 기록 추가</button>` : ''}</div>`}
      </div></section>
  </div>`;
}
const shiftMonth = (d) => {
  const [y, m] = (ui.calMonth || today().slice(0, 7)).split('-').map(Number);
  ui.calMonth = iso(new Date(y, m - 1 + d, 1)).slice(0, 7);
  ui.calSel = null;
  render();
};
ACTS['cal-prev'] = () => shiftMonth(-1);
ACTS['cal-next'] = () => shiftMonth(1);
ACTS['cal-day'] = (b) => {
  const d = b.dataset.d;
  if (d.slice(0, 7) !== (ui.calMonth || today().slice(0, 7))) ui.calMonth = d.slice(0, 7);
  ui.calSel = ui.calSel === d ? null : d;
  render();
};
ACTS['cal-all'] = () => { ui.calSel = null; render(); };
ACTS['log-past'] = (b) => {
  const s = { id: uid(), type: 'weight', date: b.dataset.d, place: '', cond: null, note: '', items: [], swim: null, start: null, end: Date.now() };
  S.sessions.push(s);
  save();
  openEdit('edit', s.id);
};

// ── 기록 상세 (참고 화면처럼 종목별 세트를 두 줄로) ──
function sessionDetail(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  if (s.type === 'swim') return swimSheet(s);
  const st = sessionStats(s), prs = prsIn(s);
  const dur = s.start && s.end ? fmtDur(s.end - s.start) : null;
  const sh = openSheet(`<div><h3>${fmtDate(s.date, true)}</h3><div class="small muted">${esc(s.place || '장소 없음')}${s.cond ? ` · 컨디션 ${s.cond}/5` : ''}</div></div>
    <div class="tiles">
      <div class="tile"><div class="l">완료 세트</div><div class="v">${st.sets}</div><div class="d">${st.ex}종목</div></div>
      <div class="tile"><div class="l">볼륨</div><div class="v">${st.vol.toLocaleString()}</div><div class="d">kg</div></div>
      <div class="tile"><div class="l">${dur ? '운동 시간' : '개인 기록'}</div><div class="v">${dur || prs.length}</div><div class="d">${dur ? '' : '개'}</div></div>
    </div>
    ${prs.length ? `<div class="row wrap">${prs.map((p) => `<span class="badge pr">PR ${esc(p.ex.name)} ${p.val}</span>`).join('')}</div>` : ''}
    ${s.note ? `<div class="ex-note" style="margin:0">${esc(s.note)}</div>` : ''}
    <div>${s.items.map((it) => {
      const ex = exById(it.ex);
      return `<div class="detail-ex"><div><b>${esc(ex.name)}</b> ${it.g ? '<span class="badge">슈퍼세트</span>' : ''}<div class="small muted">${esc(ex.ko)}</div></div>
        ${it.note ? `<div class="small ink2">${esc(it.note)}</div>` : ''}
        ${it.sets.length ? `<div class="detail-sets">${it.sets.map((x) => `<span class="${x.wu ? 'wu' : ''}">${x.wu ? 'W ' : ''}${fmtSet(ex, x)}</span>`).join('')}</div>` : ''}</div>`;
    }).join('') || '<div class="empty-state">종목 기록이 없습니다</div>'}</div>
    <div class="stack" style="gap:8px">
      <div class="row"><button class="btn grow" data-a="edit">수정</button><button class="btn btn-primary grow" data-a="again">이 운동 다시 하기</button></div>
      <div class="row"><button class="btn grow" data-a="routine">루틴으로 저장</button><button class="btn grow btn-danger" data-a="del">삭제</button></div>
    </div>`, { tall: s.items.length > 3 });
  sh.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    const act = a.dataset.a;
    sh.close();
    if (act === 'edit') openEdit('edit', s.id);
    else if (act === 'again') startSession(copyItems(s.items, false));
    else if (act === 'routine') textSheet('루틴 이름', `${fmtDate(s.date)} 루틴`, (name) => {
      S.routines.push({ id: uid(), name, items: copyItems(s.items, false) });
      save(); render(); toast('루틴으로 저장했습니다');
    });
    else if (act === 'del') trashWithUndo(s.id);
  });
}

// ── 수영 기록 ──
function swimSheet(s) {
  const isNew = !s;
  const d = s || { date: ui.calSel || today(), place: (doneSessions().find((x) => x.type === 'swim' && x.place) || {}).place || '', cond: null, note: '', swim: {} };
  const w = d.swim || {};
  let cond = d.cond, place = d.place;
  const sh = openSheet(`<h3>${isNew ? '수영 기록' : '수영 기록 수정'}</h3>
    <div class="row"><label class="f grow">날짜<input type="date" name="date" value="${d.date}"></label>
      <label class="f grow">장소<button class="btn" data-a="place" style="justify-content:flex-start;font-weight:500">${esc(place || '장소 선택')}</button></label></div>
    <div class="row"><label class="f grow">거리 (m)<input name="dist" inputmode="numeric" value="${w.dist ?? ''}" placeholder="1500"></label>
      <label class="f grow">시간<input name="time" value="${esc(w.time || '')}" placeholder="33:00"></label></div>
    <label class="f">세트 내용<textarea name="detail" rows="2" placeholder="예: 25m @1:00 × 8 / 6, Submarine 3">${esc(w.detail || '')}</textarea></label>
    <div class="stack" style="gap:6px"><div class="small ink2">컨디션 (1 나쁨 ~ 5 최고)</div>
      <div class="seg">${[1, 2, 3, 4, 5].map((n) => `<button class="${cond === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>
    <label class="f">메모<textarea name="note" rows="2">${esc(d.note)}</textarea></label>
    <div class="row">${isNew ? '<button class="btn grow" data-a="x">취소</button>' : '<button class="btn grow btn-danger" data-a="del">삭제</button>'}
      <button class="btn btn-primary grow" data-a="ok">저장</button></div>`);
  const f = (n) => sh.el.querySelector(`[name="${n}"]`).value.trim();
  sh.el.addEventListener('click', async (e) => {
    const nb = e.target.closest('[data-n]');
    if (nb) { const v = +nb.dataset.n; cond = cond === v ? null : v; $$('[data-n]', sh.el).forEach((x) => x.classList.toggle('on', +x.dataset.n === cond)); return; }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    if (a.dataset.a === 'place') return placeSheet(place, (v) => { place = v; a.textContent = v || '장소 선택'; });
    if (a.dataset.a === 'x') return sh.close();
    if (a.dataset.a === 'del') { sh.close(); trashWithUndo(s.id); return; }
    const rec = isNew ? { id: uid(), type: 'swim', items: [], start: null, end: Date.now() } : s;
    Object.assign(rec, { date: f('date') || today(), place, cond, note: f('note'), swim: { dist: f('dist') ? +f('dist') : null, time: f('time'), detail: f('detail') } });
    if (isNew) S.sessions.push(rec);
    save(); sh.close(); render(); toast('수영 기록을 저장했습니다');
  });
}

// ── 분석 ──
function renderProgress() {
  const usage = exUsage(), ids = Object.keys(usage).sort((a, b) => usage[b] - usage[a]);
  if (!ui.progEx || !S.exercises.some((e) => e.id === ui.progEx)) ui.progEx = ids[0] || null;
  const head = '<div class="top"><h1 style="font-size:22px">분석</h1></div>';
  if (!ui.progEx) return `${head}<div class="page"><div class="empty-state">운동을 기록하면 종목별 성장 그래프가 생깁니다</div></div>`;
  const ex = exById(ui.progEx), hist = exHistory(ex.id), w = hasW(ex);
  const metrics = w ? [['e1rm', '추정 1RM'], ['max', '최고 무게'], ['vol', '볼륨']] : [['reps', '최다 횟수'], ['total', '총 횟수']];
  if (!metrics.some(([k]) => k === ui.progMetric)) ui.progMetric = metrics[0][0];
  const M = ui.progMetric, unitR = ex.mode === 'time' ? '초' : '회';
  const points = [];
  let bestW = null, bestE = null, bestR = null;
  for (const h of hist) {
    const work = h.sets.filter((x) => !x.wu);
    const sets = work.length ? work : h.sets;
    const es = sets.map((x) => e1rm(ex, x)).filter((v) => v != null);
    const ws = sets.map((x) => x.w).filter((v) => v != null);
    const rs = sets.map((x) => x.r).filter((v) => v != null);
    const vol = sets.reduce((a, x) => a + (x.w != null && x.r ? (ex.mode === 'added' ? (S.settings.bw || 0) + x.w : x.w) * x.r : 0), 0);
    const val = { e1rm: es.length ? Math.max(...es) : null, max: ws.length ? Math.max(...ws) : null, vol: vol || null, reps: rs.length ? Math.max(...rs) : null, total: rs.length ? rs.reduce((a, b) => a + b, 0) : null }[M];
    if (ws.length && (bestW == null || Math.max(...ws) > bestW.v)) bestW = { v: Math.max(...ws), d: h.date };
    if (es.length && (bestE == null || Math.max(...es) > bestE.v)) bestE = { v: Math.max(...es), d: h.date };
    if (rs.length && (bestR == null || Math.max(...rs) > bestR.v)) bestR = { v: Math.max(...rs), d: h.date };
    if (val != null) points.push({ date: h.date, y: Math.round(val * 10) / 10, tip: sets.map((x) => fmtSet(ex, x)).join(' · ') });
  }
  const fmtY = (v) => (M === 'vol' || M === 'total' ? Math.round(v).toLocaleString() + (M === 'vol' ? 'kg' : unitR) : M === 'reps' ? num(v) + unitR : fmtW(ex, v) + 'kg');
  postRender = () => mountChart($('#chart'), points, fmtY);
  const chips = ids.slice(0, 8).map((id) => `<button class="chip ${id === ex.id ? 'on' : ''}" data-act="prog-ex" data-id="${id}">${esc(exById(id).name)}</button>`).join('');
  const tile = (l, b, fmt) => `<div class="tile"><div class="l">${l}</div><div class="v">${b ? fmt(b.v) : '—'}</div><div class="d">${b ? fmtDate(b.d) : ''}</div></div>`;
  const tiles = w
    ? tile('최고 무게', bestW, (v) => fmtW(ex, v)) + tile('추정 1RM', bestE, (v) => fmtW(ex, Math.round(v * 10) / 10)) + `<div class="tile"><div class="l">기록한 날</div><div class="v">${hist.length}</div><div class="d">회</div></div>`
    : tile(`최다 ${unitR === '초' ? '시간' : '횟수'}`, bestR, num) + `<div class="tile"><div class="l">기록한 날</div><div class="v">${hist.length}</div><div class="d">회</div></div><div class="tile"><div class="l">마지막</div><div class="v" style="font-size:20px">${hist.length ? fmtDate(hist[hist.length - 1].date) : '—'}</div></div>`;
  return `${head}<div class="page">
    <div class="stack" style="gap:8px"><div class="chips">${chips}</div>
      <button class="btn btn-block" data-act="prog-pick" style="justify-content:space-between"><span class="ellipsis"><b>${esc(ex.name)}</b> <span class="small muted">${esc(ex.ko)}</span></span>${ICON.down}</button></div>
    ${ex.mode === 'added' && !S.settings.bw ? '<button class="banner" data-act="set-bw" style="text-align:left;color:var(--ink)"><span class="grow">몸무게를 입력하면 추가 중량 종목의 추정 1RM을 몸무게까지 포함해 계산합니다</span><b>입력</b></button>' : ''}
    <div class="seg">${metrics.map(([k, l]) => `<button class="${k === M ? 'on' : ''}" data-act="prog-metric" data-m="${k}">${l}</button>`).join('')}</div>
    <div class="chart" id="chart"></div>
    <div class="tiles">${tiles}</div>
    <section><div class="sec-h"><h2>세션별 기록</h2></div><div class="stack">
      ${hist.slice().reverse().map((h) => `<button class="list-btn" data-act="detail" data-id="${h.sid}" style="align-items:flex-start">
        <b style="min-width:72px">${fmtDate(h.date)}</b><span class="grow small ink2" style="line-height:1.6">${h.sets.map((x) => `${x.wu ? '<span style="color:var(--warn)">W</span> ' : ''}${fmtSet(ex, x)}`).join(' · ')}</span></button>`).join('')}
    </div></section>
    <section><div class="sec-h"><h2>목표</h2><button data-act="goals">편집</button></div><div class="stack">${goalsHtml()}</div></section>
  </div>`;
}
ACTS['prog-ex'] = (b) => { ui.progEx = b.dataset.id; render(); };
ACTS['prog-metric'] = (b) => { ui.progMetric = b.dataset.m; render(); };
ACTS['prog-pick'] = () => pickExercises((ids) => { if (ids[0]) { ui.progEx = ids[0]; render(); } }, true);
