// 운동 기록 화면의 버튼 동작 · 종목 선택 · 운동 완료
const INPUTS = {};
INPUTS.note = (el) => { const c = edCtx(); if (c) { c.obj.note = el.value; save(); } };

ACTS.cell = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (it) { audioUnlock(); selectCell(it, +b.dataset.i, b.dataset.f); }
};
ACTS.done = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (!it) return;
  audioUnlock();
  const i = +b.dataset.i;
  if (it.sets[i].done) { it.sets[i].done = false; save(); render(); }
  else completeSet(c, it, i, false);
};
ACTS.setmenu = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (!it) return;
  const i = +b.dataset.i, s = it.sets[i];
  menuSheet(`${exById(it.ex).name} · ${s.wu ? '워밍업' : '세트'}`, [
    { label: s.wu ? '일반 세트로 바꾸기' : '워밍업 세트로 표시', sub: '워밍업은 볼륨과 개인 기록 계산에서 빠집니다', fn: () => { s.wu = !s.wu; save(); render(); } },
    { label: '이 세트 복제', fn: () => { it.sets.splice(i + 1, 0, { ...s, done: c.kind === 'edit' }); save(); render(); } },
    { label: '이 세트 삭제', danger: true, fn: () => { if (kp && kp.itemId === it.id) closeKeypad(); it.sets.splice(i, 1); save(); render(); } },
  ]);
};
ACTS.addset = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (!it) return;
  const l = it.sets[it.sets.length - 1];
  it.sets.push({ w: l ? l.w : null, r: l ? l.r : null, wu: false, done: c.kind === 'edit' });
  save(); render();
};
ACTS.rmset = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (!it || !it.sets.length) return;
  if (kp && kp.itemId === it.id && kp.i === it.sets.length - 1) closeKeypad();
  it.sets.pop();
  save(); render();
};

// ── 종목 메뉴: 메모 · 슈퍼세트 · 순서 · 교체 · 삭제 ──
function fixGroups(items) {
  const cnt = {};
  items.forEach((x) => { if (x.g) cnt[x.g] = (cnt[x.g] || 0) + 1; });
  items.forEach((x) => { if (x.g && cnt[x.g] < 2) x.g = null; });
}
function blocks(items) {
  const out = [];
  for (const it of items) {
    const b = out[out.length - 1];
    if (b && it.g && b[0].g === it.g) b.push(it); else out.push([it]);
  }
  return out;
}
function moveBlock(items, it, dir) {
  const bl = blocks(items), k = bl.findIndex((b) => b.includes(it)), b = bl[k];
  const p = b.indexOf(it), q = p + dir;
  if (b.length > 1 && q >= 0 && q < b.length) [b[p], b[q]] = [b[q], b[p]];
  else {
    const j = k + dir;
    if (j < 0 || j >= bl.length) return;
    [bl[k], bl[j]] = [bl[j], bl[k]];
  }
  items.splice(0, items.length, ...bl.flat());
  save(); render();
}
function ungroup(items, it) {
  const run = items.filter((x) => x.g === it.g), last = run[run.length - 1];
  it.g = null;
  if (last !== it) { items.splice(items.indexOf(it), 1); items.splice(items.indexOf(last) + 1, 0, it); }
  fixGroups(items);
  save(); render();
}
ACTS.exmenu = (b) => {
  const c = edCtx(), it = findItem(c, b.dataset.item);
  if (!it) return;
  const ex = exById(it.ex), items = c.obj.items, next = items[items.indexOf(it) + 1];
  const opts = [{ label: it.note ? '메모 수정' : '메모 추가', sub: '스트랩, 그립, 속도, 체감 난이도 등', fn: () => noteSheet(it) }];
  if (it.g) opts.push({ label: '슈퍼세트에서 빼기', fn: () => ungroup(items, it) });
  else if (next) opts.push({ label: '아래 종목과 슈퍼세트로 묶기', sub: `${ex.name} + ${exById(next.ex).name}`, fn: () => { it.g = next.g || uid(); next.g = it.g; save(); render(); } });
  opts.push({ label: '위로 이동', fn: () => moveBlock(items, it, -1) }, { label: '아래로 이동', fn: () => moveBlock(items, it, 1) });
  if (c.kind !== 'routine') opts.push({ label: '지난 기록 · 그래프 보기', fn: () => {
    if (kp) closeKeypad();
    if (ui.edit) removeLayer(editLayer);
    ui.progEx = it.ex;
    goTab('progress');
  } });
  opts.push({ label: '다른 종목으로 바꾸기', fn: () => pickExercises((ids) => { if (ids[0]) { it.ex = ids[0]; save(); render(); } }, true) });
  opts.push({ label: '종목 설정 (기록 방식 · 휴식 시간)', fn: () => editExercise(ex, null, () => render()) });
  opts.push({ label: '이 종목 삭제', danger: true, fn: async () => {
    if (it.sets.some((s) => s.done) && !(await confirmSheet({ title: '이 종목을 삭제할까요?', body: '완료한 세트 기록도 함께 지워집니다.', ok: '삭제', danger: true }))) return;
    if (kp && kp.itemId === it.id) closeKeypad();
    items.splice(items.indexOf(it), 1);
    fixGroups(items);
    save(); render();
  } });
  menuSheet(ex.name, opts);
};
function noteSheet(it) {
  const tags = ['스트랩 사용', '빠르게 (speed)', 'Easy', 'Hard', '오버그립', '언더그립', '뉴트럴 그립', '점프와 함께'];
  const sh = openSheet(`<h3>메모 · ${esc(exById(it.ex).name)}</h3>
    <div class="chips" style="flex-wrap:wrap">${tags.map((t) => `<button class="chip" data-t="${t}">${t}</button>`).join('')}</div>
    <textarea rows="3">${esc(it.note)}</textarea>
    <div class="row"><button class="btn grow" data-a="x">취소</button><button class="btn btn-primary grow" data-a="ok">저장</button></div>`);
  const ta = sh.el.querySelector('textarea');
  sh.el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]');
    if (t) { ta.value = ta.value.trim() ? ta.value.trim() + ' · ' + t.dataset.t : t.dataset.t; return; }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    if (a.dataset.a === 'ok') { it.note = ta.value.trim(); save(); render(); }
    sh.close();
  });
}

// ── 종목 선택 시트 (여러 개 선택 · 슈퍼세트로 묶어서 추가) ──
function pickExercises(onDone, single) {
  let q = '', cat = Object.keys(exUsage()).length ? 'recent' : 'all';
  const sel = [], usage = exUsage();
  const cats = [['recent', '자주 한'], ['all', '전체'], ...Object.entries(CAT)];
  const sh = openSheet(`<div class="row"><h3 class="grow">${single ? '종목 바꾸기' : '종목 추가'}</h3><button class="btn btn-sm" data-a="new">+ 새 종목</button></div>
    <input type="search" placeholder="검색 (영어 또는 한글)" data-a="q" autocomplete="off">
    <div class="chips">${cats.map(([k, v]) => `<button class="chip ${k === cat ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('')}</div>
    <div class="list"></div>
    ${single ? '' : `<div class="foot"><button class="btn grow" data-a="group" disabled>슈퍼세트로 추가</button><button class="btn btn-primary grow" data-a="add" disabled>추가</button></div>`}`, { tall: true });
  const el = sh.el, input = el.querySelector('input');
  const list = () => {
    let arr = S.exercises.slice();
    const k = q.toLowerCase().replace(/\s/g, '');
    if (k) arr = arr.filter((e) => (e.name + e.ko).toLowerCase().replace(/\s/g, '').includes(k));
    else if (cat === 'recent') arr = arr.filter((e) => usage[e.id]).sort((a, b) => usage[b.id] - usage[a.id]);
    else if (cat !== 'all') arr = arr.filter((e) => e.cat === cat);
    el.querySelector('.list').innerHTML = arr.length ? arr.map((e) => {
      const on = sel.includes(e.id), last = lastItemFor(e.id);
      const ls = last ? last.item.sets.filter((s) => s.done) : [];
      const lt = ls.length ? ` · ${fmtDate(last.session.date)} ${fmtSet(e, ls[ls.length - 1])}` : '';
      return `<button class="pick ${on ? 'on' : ''}" data-id="${e.id}"><span class="box">${on ? ICON.check : ''}</span>
        <span class="grow" style="min-width:0"><b style="display:block">${esc(e.name)}</b><span class="small muted">${esc(e.ko)} · ${MODES[e.mode].name}${lt}</span></span>
        ${on && !single ? `<span class="badge">${sel.indexOf(e.id) + 1}</span>` : ''}</button>`;
    }).join('') : `<div class="empty-state">"${esc(q)}" 종목이 없습니다.<br><button class="btn btn-sm" data-a="new" style="margin-top:10px">새 종목으로 만들기</button></div>`;
    if (!single) {
      el.querySelector('[data-a="add"]').disabled = !sel.length;
      el.querySelector('[data-a="add"]').textContent = sel.length ? `${sel.length}개 추가` : '추가';
      el.querySelector('[data-a="group"]').disabled = sel.length < 2;
    }
  };
  input.addEventListener('input', () => { q = input.value; list(); });
  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) { cat = c.dataset.cat; $$('[data-cat]', el).forEach((x) => x.classList.toggle('on', x === c)); q = ''; input.value = ''; list(); return; }
    const p = e.target.closest('[data-id]');
    if (p) {
      if (single) { sh.close(); onDone([p.dataset.id]); return; }
      const i = sel.indexOf(p.dataset.id);
      if (i < 0) sel.push(p.dataset.id); else sel.splice(i, 1);
      list();
      return;
    }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    if (a.dataset.a === 'new') {
      editExercise(null, { name: q }, (ex) => {
        if (single) { sh.close(); onDone([ex.id]); return; }
        sel.push(ex.id); q = ''; input.value = ''; cat = 'all'; list();
      });
    } else if (a.dataset.a === 'add' || a.dataset.a === 'group') {
      sh.close();
      onDone(sel.slice(), a.dataset.a === 'group');
    }
  });
  list();
}
function addItems(c, ids, grouped) {
  const g = grouped && ids.length > 1 ? uid() : null;
  for (const id of ids) {
    const last = lastItemFor(id, c.obj.id);
    let sets = last ? last.item.sets.filter((s) => s.done).map((s) => ({ w: s.w, r: s.r, wu: s.wu, done: c.kind === 'edit' })) : [];
    if (!sets.length) sets = [0, 1, 2].map(() => ({ w: null, r: null, wu: false, done: false }));
    c.obj.items.push({ id: uid(), ex: id, g, note: '', sets });
  }
}
ACTS.addex = () => {
  const c = edCtx();
  if (!c) return;
  if (kp) closeKeypad();
  pickExercises((ids, grouped) => {
    const n = c.obj.items.length;
    addItems(c, ids, grouped);
    save(); render();
    const first = c.obj.items[n];
    requestAnimationFrame(() => { const el = first && $(`.ex[data-item="${first.id}"]`); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  });
};
// 루틴으로 시작: 루틴의 세트 수는 유지하고, 무게·횟수는 지난번 기록으로 채움
function fromRoutine(r) {
  const items = copyItems(r.items, false);
  for (const it of items) {
    const last = lastItemFor(it.ex);
    if (!last) continue;
    const work = last.item.sets.filter((s) => s.done && !s.wu), warm = last.item.sets.filter((s) => s.done && s.wu);
    let wi = 0, ki = 0;
    for (const s of it.sets) {
      const src = s.wu ? warm[Math.min(ki++, warm.length - 1)] : work[Math.min(wi++, work.length - 1)];
      if (src) { s.w = src.w; s.r = src.r; }
    }
  }
  return items;
}

// ── 날짜 · 장소 · 컨디션 ──
function placeSheet(cur, cb) {
  const sh = openSheet(`<h3>장소</h3>
    <div class="chips" style="flex-wrap:wrap">${places().map((p) => `<button class="chip ${p === cur ? 'on' : ''}" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <input placeholder="새 장소 입력 (예: 에너메카)">
    <div class="row"><button class="btn grow" data-p="">비우기</button><button class="btn btn-primary grow" data-a="ok">입력한 장소로</button></div>`);
  sh.el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]');
    if (p) { cb(p.dataset.p); sh.close(); return; }
    if (!e.target.closest('[data-a]')) return;
    const v = sh.el.querySelector('input').value.trim();
    if (v) cb(v);
    sh.close();
  });
}
function condSheet(cur, cb) {
  const L = ['', '나쁨', '별로', '보통', '좋음', '최고'];
  const sh = openSheet(`<h3>컨디션</h3><div class="seg">${[1, 2, 3, 4, 5].map((n) =>
    `<button class="${cur === n ? 'on' : ''}" data-n="${n}" style="height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="num" style="font-size:22px">${n}</span><span style="font-size:11px">${L[n]}</span></button>`).join('')}</div>
    <button class="btn btn-block" data-n="0">선택 안 함</button>`);
  sh.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    cb(+b.dataset.n || null);
    sh.close();
  });
}
function textSheet(title, val, cb) {
  const sh = openSheet(`<h3>${esc(title)}</h3><input value="${esc(val)}"><button class="btn btn-primary btn-block" data-a="ok">저장</button>`);
  sh.el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-a]')) return;
    const v = sh.el.querySelector('input').value.trim();
    if (v) cb(v);
    sh.close();
  });
}
ACTS['meta-date'] = () => {
  const c = edCtx();
  const sh = openSheet(`<h3>날짜</h3><input type="date" value="${c.obj.date}"><button class="btn btn-primary btn-block" data-a="ok">확인</button>`);
  sh.el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-a]')) return;
    const v = sh.el.querySelector('input').value;
    if (v) { c.obj.date = v; save(); render(); }
    sh.close();
  });
};
ACTS['meta-place'] = () => { const c = edCtx(); placeSheet(c.obj.place, (v) => { c.obj.place = v; save(); render(); }); };
ACTS['meta-cond'] = () => { const c = edCtx(); condSheet(c.obj.cond, (v) => { c.obj.cond = v; save(); render(); }); };
ACTS['ed-close'] = () => { if (kp) closeKeypad(); if (ui.edit) removeLayer(editLayer); };
ACTS['rt-rename'] = () => { const c = edCtx(); textSheet('루틴 이름', c.obj.name, (v) => { c.obj.name = v; save(); render(); }); };
ACTS['rt-delete'] = async () => {
  const c = edCtx();
  if (!(await confirmSheet({ title: `'${c.obj.name}' 루틴을 삭제할까요?`, body: '지난 운동 기록은 그대로 남습니다.', ok: '삭제', danger: true }))) return;
  S.routines = S.routines.filter((r) => r.id !== c.obj.id);
  save();
  ACTS['ed-close']();
  toast('루틴을 삭제했습니다');
};
ACTS.discard = async () => {
  const c = edCtx();
  const active = c.kind === 'active';
  const hasData = !!c.obj.note || c.obj.items.some((it) => it.sets.some((s) => s.done));
  if (active && hasData && !(await confirmSheet({ title: '이 운동을 취소할까요?', body: `완료한 세트가 있어서 휴지통에 ${TRASH_DAYS}일 동안 보관합니다.`, ok: '운동 취소', danger: true }))) return;
  if (kp) closeKeypad();
  if (ui.edit) removeLayer(editLayer);
  if (active) wake.off();
  if (!hasData) {
    S.sessions = S.sessions.filter((s) => s.id !== c.obj.id);
    if (active) { S.activeId = null; S.timer = null; }
    save(); render();
    toast(active ? '운동을 취소했습니다' : '빈 기록을 삭제했습니다');
    return;
  }
  if (active) {
    c.obj.end = Date.now();
    c.obj.items.forEach((it) => (it.sets = it.sets.filter((s) => s.done)));
    c.obj.items = c.obj.items.filter((it) => it.sets.length || it.note);
  }
  trashWithUndo(c.obj.id, active ? '운동을 취소하고 휴지통에 보관했습니다' : null);
};

// ── 운동 완료 ──
ACTS.finish = () => {
  if (kp) closeKeypad();
  const s = activeSession();
  if (!s) return;
  const st = sessionStats(s), prs = prsIn(s);
  const undone = s.items.reduce((n, it) => n + it.sets.filter((x) => !x.done && (x.w != null || x.r != null)).length, 0);
  let keep = 'drop', cond = s.cond;
  const sh = openSheet(`<h3>운동 완료</h3>
    <div class="tiles">
      <div class="tile"><div class="l">시간</div><div class="v">${fmtDur(Date.now() - s.start)}</div></div>
      <div class="tile"><div class="l">완료 세트</div><div class="v">${st.sets}</div><div class="d">${st.ex}종목</div></div>
      <div class="tile"><div class="l">볼륨</div><div class="v">${st.vol.toLocaleString()}</div><div class="d">kg · 워밍업 제외</div></div>
    </div>
    ${prs.length ? `<div class="card stack" style="gap:8px;background:var(--s2)"><b>새 개인 기록</b>${prs.map((p) => `<div class="row"><span class="badge pr">PR</span><span class="grow ellipsis">${esc(p.ex.name)}</span><span class="small ink2">${p.kind} <b class="num" style="font-size:18px;color:var(--ink)">${p.val}</b></span></div>`).join('')}</div>` : ''}
    ${undone ? `<div class="stack" style="gap:6px"><div class="small ink2">완료 체크를 안 한 세트가 ${undone}개 있습니다</div>
      <div class="seg" data-g="keep"><button class="on" data-v="drop">저장 안 함</button><button data-v="done">완료로 저장</button></div></div>` : ''}
    <div class="stack" style="gap:6px"><div class="small ink2">컨디션 (1 나쁨 ~ 5 최고)</div>
      <div class="seg" data-g="cond">${[1, 2, 3, 4, 5].map((n) => `<button class="${cond === n ? 'on' : ''}" data-v="${n}">${n}</button>`).join('')}</div></div>
    <label class="f">메모<textarea placeholder="오늘 느낀 점, 수영과의 연계 등">${esc(s.note)}</textarea></label>
    <div class="row"><button class="btn grow" data-a="cancel">계속 운동</button><button class="btn btn-primary grow" data-a="save">저장하고 끝내기</button></div>`);
  sh.el.addEventListener('click', (e) => {
    const sb = e.target.closest('.seg button');
    if (sb) {
      $$('button', sb.parentElement).forEach((x) => x.classList.toggle('on', x === sb));
      if (sb.parentElement.dataset.g === 'keep') keep = sb.dataset.v; else cond = +sb.dataset.v;
      return;
    }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    if (a.dataset.a === 'cancel') { sh.close(); return; }
    s.note = sh.el.querySelector('textarea').value.trim();
    s.cond = cond;
    for (const it of s.items) {
      it.sets = it.sets.filter((x) => x.done || (keep === 'done' && (x.w != null || x.r != null)));
      it.sets.forEach((x) => (x.done = true));
    }
    s.items = s.items.filter((it) => it.sets.length || it.note);
    fixGroups(s.items);
    s.end = Date.now();
    S.activeId = null;
    S.timer = null;
    save();
    wake.off();
    sh.close();
    ui.calMonth = s.date.slice(0, 7);
    ui.calSel = null;
    goTab('history');
    toast(prs.length ? `저장했습니다 · 개인 기록 ${prs.length}개` : '저장했습니다');
    setTimeout(() => sessionDetail(s.id), 80);
  });
};
