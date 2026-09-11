// 더보기: 설정 · 종목/루틴/목표/대회 관리 · 백업
const MODE_DESC = {
  kg: '바벨, 머신, 덤벨 등 전체 무게',
  added: '중량 풀업·친업·딥스 (맨몸이면 0)',
  plates: '트랩바·레그프레스: 원판 무게만 기록, 한쪽 장수 표시',
  reps: 'CMJ, 점프, 맨몸 운동',
  time: '플랭크, 매달리기',
};

function renderMore() {
  const st = S.settings;
  const row = (label, value, act) => `<button class="list-btn" data-act="${act}"><span class="grow">${label}</span><span class="ink2">${value}</span>${ICON.right}</button>`;
  const tog = (label, k, sub) => `<label class="list-btn" style="cursor:pointer"><span class="grow">${label}${sub ? `<div class="small muted">${sub}</div>` : ''}</span>
    <input type="checkbox" data-input="toggle" data-k="${k}" ${st[k] ? 'checked' : ''} style="width:24px;height:24px;padding:0;accent-color:var(--acc);flex:none"></label>`;
  const bd = st.lastBackup ? `${fmtDate(iso(new Date(st.lastBackup)))} 백업` : '백업한 적 없음';
  return `<div class="top"><h1 style="font-size:22px">더보기</h1></div>
  <div class="page">
    <section><div class="sec-h"><h2>운동 설정</h2></div><div class="stack" style="gap:6px">
      ${row('몸무게', st.bw ? `<span class="num" style="font-size:17px">${num(st.bw)}</span> kg` : '입력 안 함', 'set-bw')}
      ${row('기본 휴식 시간', `<span class="num" style="font-size:17px">${fmtDur(st.rest * 1000)}</span>`, 'set-rest')}
      ${tog('휴식 끝 소리', 'sound')}
      ${tog('휴식 끝 진동', 'vibrate')}
      ${tog('운동 중 화면 켜짐 유지', 'awake', '휴식 중에 화면이 꺼지지 않게 합니다')}
      ${tog('앱 밖에 있을 때 알림', 'notify', '다른 앱을 보는 중에도 휴식 끝을 알려줍니다. 화면이 꺼져 있으면 늦게 올 수 있습니다')}
    </div></section>
    <section><div class="sec-h"><h2>관리</h2></div><div class="stack" style="gap:6px">
      ${row('종목', `${S.exercises.length}개`, 'exercises')}
      ${row('루틴', `${S.routines.length}개`, 'routines')}
      ${row('목표', `${S.goals.length}개`, 'goals')}
      ${row('대회 일정', `${S.events.length}개`, 'events')}
    </div></section>
    <section><div class="sec-h"><h2>데이터</h2></div><div class="stack" style="gap:6px">
      <div class="card small ink2">기록은 이 폰의 앱 저장소에만 있습니다. 폰을 바꾸거나 크롬 데이터를 지우기 전에 꼭 백업 파일을 저장하세요.</div>
      ${row('백업 파일 저장', bd, 'backup')}
      ${row('백업 파일 불러오기', '', 'import')}
      ${row('엑셀용 CSV 내보내기', '', 'csv')}
      ${row('휴지통', S.trash.length ? `${S.trash.length}개 · ${TRASH_DAYS}일 보관` : '비어 있음', 'trash')}
    </div></section>
    <section><div class="sec-h"><h2>앱</h2></div><div class="stack" style="gap:6px">
      ${deferredInstall ? '<button class="btn btn-primary btn-block" data-act="install">홈 화면에 앱 설치</button>'
        : '<div class="card small ink2">크롬 메뉴(⋮) → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르면 주소창 없이 앱처럼 열립니다. 이미 설치했다면 그대로 쓰시면 됩니다.</div>'}
      <button class="btn btn-block btn-danger" data-act="reset">모든 기록 지우고 처음 상태로</button>
      <div class="small muted" style="text-align:center">앱 버전 ${APP_VERSION}</div>
    </div></section>
  </div>`;
}

INPUTS.toggle = async (el) => {
  const k = el.dataset.k;
  if (k === 'notify' && el.checked) {
    if (!('Notification' in window)) { el.checked = false; return toast('이 브라우저는 알림을 지원하지 않습니다'); }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { el.checked = false; return toast('알림이 차단되어 있습니다. 크롬 사이트 설정에서 허용해 주세요'); }
  }
  S.settings[k] = el.checked;
  save();
  if (k === 'awake') { if (el.checked && activeSession()) wake.on(); else if (!el.checked && wake.lock) { wake.lock.release(); wake.lock = null; } }
};
ACTS['set-bw'] = () => {
  const sh = openSheet(`<h3>몸무게</h3><p class="small ink2" style="margin:0">중량 풀업·친업처럼 추가 중량 종목의 추정 1RM과 볼륨 계산에 씁니다.</p>
    <input inputmode="decimal" value="${S.settings.bw ?? ''}" placeholder="kg">
    <div class="row"><button class="btn grow" data-a="clear">지우기</button><button class="btn btn-primary grow" data-a="ok">저장</button></div>`);
  sh.el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    const v = parseFloat(sh.el.querySelector('input').value);
    S.settings.bw = a.dataset.a === 'ok' && v > 0 ? v : null;
    save(); sh.close(); render();
  });
};
ACTS['set-rest'] = () => {
  const opts = [45, 60, 90, 120, 150, 180, 240];
  const sh = openSheet(`<h3>기본 휴식 시간</h3><p class="small ink2" style="margin:0">종목마다 따로 정한 휴식 시간이 없을 때 씁니다. 종목별 휴식은 종목 설정에서 바꿀 수 있습니다.</p>
    <div class="chips" style="flex-wrap:wrap">${opts.map((v) => `<button class="chip ${S.settings.rest === v ? 'on' : ''}" data-v="${v}">${fmtDur(v * 1000)}</button>`).join('')}</div>`);
  sh.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    S.settings.rest = +b.dataset.v;
    save(); sh.close(); render();
  });
};

// ── 종목 ──
function editExercise(ex, preset, cb) {
  const isNew = !ex;
  const d = ex ? { ...ex } : { name: (preset && preset.name) || '', ko: '', cat: 'lower', mode: 'kg', rest: S.settings.rest };
  const used = ex ? S.sessions.some((s) => s.items.some((i) => i.ex === ex.id)) || S.routines.some((r) => r.items.some((i) => i.ex === ex.id))
    || S.trash.some((t) => t.s.items.some((i) => i.ex === ex.id)) : false;
  const sh = openSheet(`<h3>${isNew ? '새 종목' : '종목 설정'}</h3>
    <label class="f">이름 (영어로 통일)<input name="name" value="${esc(d.name)}" placeholder="예: Nordic Hamstring Curl" autocomplete="off"></label>
    <label class="f">한글 이름 (검색용)<input name="ko" value="${esc(d.ko)}" placeholder="예: 노르딕 햄스트링 컬" autocomplete="off"></label>
    <div class="stack" style="gap:6px"><div class="small ink2">분류</div>
      <div class="chips" style="flex-wrap:wrap">${Object.entries(CAT).map(([k, v]) => `<button class="chip ${d.cat === k ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('')}</div></div>
    <div class="stack" style="gap:0"><div class="small ink2">기록 방식</div>
      ${Object.entries(MODES).map(([k, m]) => `<button class="pick ${d.mode === k ? 'on' : ''}" data-mode="${k}"><span class="box">${ICON.check}</span>
        <span class="grow"><b style="display:block">${m.name}</b><span class="small muted">${MODE_DESC[k]}</span></span></button>`).join('')}
      ${used ? '<div class="small muted" style="margin-top:6px">기록 방식을 바꿔도 지난 기록의 숫자는 그대로 남습니다.</div>' : ''}</div>
    <div class="stack" style="gap:6px"><div class="small ink2">휴식 시간</div>
      <div class="seg">${[60, 90, 120, 150, 180].map((v) => `<button class="${d.rest === v ? 'on' : ''}" data-rest="${v}">${fmtDur(v * 1000)}</button>`).join('')}</div></div>
    <div class="row">${isNew ? '<button class="btn grow" data-a="x">취소</button>' : '<button class="btn grow btn-danger" data-a="del">삭제</button>'}
      <button class="btn btn-primary grow" data-a="ok">저장</button></div>`);
  const el = sh.el;
  $$('.pick .box', el).forEach((b) => { if (!b.parentElement.classList.contains('on')) b.innerHTML = ''; });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cat],[data-mode],[data-rest],[data-a]');
    if (!t) return;
    if (t.dataset.cat) { d.cat = t.dataset.cat; $$('[data-cat]', el).forEach((x) => x.classList.toggle('on', x === t)); return; }
    if (t.dataset.mode) {
      d.mode = t.dataset.mode;
      $$('[data-mode]', el).forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.querySelector('.box').innerHTML = on ? ICON.check : ''; });
      return;
    }
    if (t.dataset.rest) { d.rest = +t.dataset.rest; $$('[data-rest]', el).forEach((x) => x.classList.toggle('on', x === t)); return; }
    const a = t.dataset.a;
    if (a === 'x') return sh.close();
    if (a === 'del') {
      if (used) return toast('기록이나 루틴에 쓰인 종목은 삭제할 수 없습니다');
      S.exercises = S.exercises.filter((x) => x.id !== ex.id);
      save(); sh.close(); if (cb) cb(null); return;
    }
    d.name = el.querySelector('[name="name"]').value.trim();
    d.ko = el.querySelector('[name="ko"]').value.trim();
    if (!d.name) return toast('종목 이름을 입력해 주세요');
    if (S.exercises.some((x) => x.name.toLowerCase() === d.name.toLowerCase() && x !== ex)) return toast('같은 이름의 종목이 이미 있습니다');
    let out = ex;
    if (isNew) { out = { id: 'c-' + uid(), ...d }; S.exercises.push(out); } else Object.assign(ex, d);
    save(); sh.close();
    if (cb) cb(out);
  });
}
ACTS.exercises = () => {
  let q = '';
  const sh = openSheet(`<div class="row"><h3 class="grow">종목 관리</h3><button class="btn btn-sm" data-a="new">+ 새 종목</button></div>
    <input type="search" placeholder="검색 (영어 또는 한글)" autocomplete="off"><div class="list"></div>`, { tall: true });
  const draw = () => {
    const k = q.toLowerCase().replace(/\s/g, '');
    sh.el.querySelector('.list').innerHTML = Object.entries(CAT).map(([c, label]) => {
      const arr = S.exercises.filter((e) => e.cat === c && (!k || (e.name + e.ko).toLowerCase().replace(/\s/g, '').includes(k)));
      return arr.length ? `<div class="small muted" style="margin:14px 0 2px;font-weight:600">${label}</div>${arr.map((e) => `<button class="pick" data-id="${e.id}">
        <span class="grow" style="min-width:0"><b style="display:block">${esc(e.name)}</b><span class="small muted">${esc(e.ko)} · ${MODES[e.mode].name} · 휴식 ${fmtDur((e.rest || S.settings.rest) * 1000)}</span></span>${ICON.right}</button>`).join('')}` : '';
    }).join('') || '<div class="empty-state">찾는 종목이 없습니다</div>';
  };
  sh.el.querySelector('input').addEventListener('input', (e) => { q = e.target.value; draw(); });
  sh.el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-id]');
    if (p) return editExercise(exById(p.dataset.id), null, () => { draw(); render(); });
    if (e.target.closest('[data-a="new"]')) editExercise(null, { name: q }, () => { draw(); render(); });
  });
  draw();
};

// ── 루틴 ──
ACTS.routines = () => {
  const sh = openSheet(`<h3>루틴 관리</h3>
    <div class="stack">${S.routines.map((r) => `<div class="card stack" style="gap:8px;background:var(--s2)"><b>${esc(r.name)}</b>
      <div class="small ink2">${r.items.map((it) => exById(it.ex).name).join(', ') || '종목 없음'}</div>
      <div class="row"><button class="btn btn-sm grow" data-edit="${r.id}">편집</button><button class="btn btn-sm btn-primary grow" data-start="${r.id}">시작</button></div></div>`).join('')
      || '<div class="empty-state">루틴이 없습니다</div>'}</div>
    <button class="btn btn-block" data-a="new">+ 새 루틴 만들기</button>
    <p class="small muted" style="margin:0">지난 기록 상세에서 “루틴으로 저장”을 눌러도 만들 수 있습니다.</p>`);
  sh.el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-edit],[data-start],[data-a]');
    if (!t) return;
    sh.close();
    if (t.dataset.edit) openEdit('routine', t.dataset.edit);
    else if (t.dataset.start) { const r = S.routines.find((x) => x.id === t.dataset.start); if (r) startSession(fromRoutine(r)); }
    else { const r = { id: uid(), name: '새 루틴', items: [] }; S.routines.push(r); save(); openEdit('routine', r.id); }
  });
};

// ── 목표 ──
ACTS.goals = () => {
  let pickEx = null;
  const sh = openSheet('', {});
  const draw = () => {
    sh.el.innerHTML = `<div class="grab"></div><h3>목표</h3>
      <div class="stack" style="gap:6px">${S.goals.map((g) => {
        const ex = exById(g.ex), p = goalProgress(g);
        return `<div class="row card" style="background:var(--s2)"><div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(ex.name)}</b>
          <span class="small ink2">${fmtW(ex, g.w)}kg × ${g.r}회${g.sets > 1 ? ` × ${g.sets}세트` : ''} · ${p.achieved ? '달성' : `${Math.round(p.pct * 100)}%`}</span></div>
          <button class="btn btn-sm btn-danger" data-del="${g.id}">삭제</button></div>`;
      }).join('') || '<div class="small muted">아직 목표가 없습니다</div>'}</div>
      <div class="card stack" style="background:var(--s2)"><b>새 목표</b>
        <button class="btn" data-a="pick" style="justify-content:flex-start;background:var(--s3)">${pickEx ? esc(exById(pickEx).name) : '종목 선택'}</button>
        <div class="row"><label class="f grow">무게 (kg)<input name="w" inputmode="decimal" placeholder="145"></label>
          <label class="f grow">횟수<input name="r" inputmode="numeric" value="1"></label>
          <label class="f grow">세트<input name="s" inputmode="numeric" value="1"></label></div>
        <button class="btn btn-primary" data-a="add">목표 추가</button></div>`;
  };
  sh.el.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { S.goals = S.goals.filter((g) => g.id !== del.dataset.del); save(); draw(); render(); return; }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    if (a.dataset.a === 'pick') return pickExercises((ids) => { pickEx = ids[0] || pickEx; draw(); }, true);
    const w = parseFloat(sh.el.querySelector('[name="w"]').value), r = parseInt(sh.el.querySelector('[name="r"]').value, 10) || 1, s = parseInt(sh.el.querySelector('[name="s"]').value, 10) || 1;
    if (!pickEx || !(w >= 0)) return toast('종목과 무게를 입력해 주세요');
    S.goals.push({ id: uid(), ex: pickEx, w, r, sets: s });
    pickEx = null;
    save(); draw(); render(); toast('목표를 추가했습니다');
  });
  draw();
};

// ── 대회 일정 ──
ACTS.events = () => {
  const sh = openSheet('', {});
  const draw = () => {
    const list = S.events.slice().sort((a, b) => b.date.localeCompare(a.date));
    sh.el.innerHTML = `<div class="grab"></div><h3>대회 일정</h3>
      <div class="card stack" style="background:var(--s2)">
        <div class="row"><label class="f" style="flex:0 0 46%">날짜<input type="date" name="d" value="${today()}"></label><label class="f grow">대회 이름<input name="n" placeholder="예: 전국체전 예선"></label></div>
        <button class="btn btn-primary" data-a="add">일정 추가</button></div>
      <div class="stack" style="gap:6px">${list.map((e) => {
        const dd = daysUntil(e.date);
        return `<div class="row card" style="background:var(--s2)"><span class="num" style="font-size:20px;min-width:62px;color:${dd >= 0 ? 'var(--clock)' : 'var(--mute)'}">${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : '지남'}</span>
          <span class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(e.name)}</b><span class="small muted">${fmtDate(e.date, true)}</span></span>
          <button class="btn btn-sm btn-danger" data-del="${e.id}">삭제</button></div>`;
      }).join('') || '<div class="small muted">등록된 대회가 없습니다</div>'}</div>`;
  };
  sh.el.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { S.events = S.events.filter((x) => x.id !== del.dataset.del); save(); draw(); render(); return; }
    if (!e.target.closest('[data-a="add"]')) return;
    const d = sh.el.querySelector('[name="d"]').value, n = sh.el.querySelector('[name="n"]').value.trim();
    if (!d || !n) return toast('날짜와 대회 이름을 입력해 주세요');
    S.events.push({ id: uid(), date: d, name: n });
    save(); draw(); render(); toast('대회 일정을 추가했습니다');
  });
  draw();
};

// ── 백업 · 복원 · CSV ──
ACTS.backup = () => {
  S.settings.lastBackup = Date.now();
  save();
  const data = JSON.stringify({ app: 'dryland-log', exportedAt: new Date().toISOString(), ...S, timer: null });
  downloadFile(`dryland-backup-${today()}.json`, data, 'application/json');
  render();
  toast('백업 파일을 다운로드 폴더에 저장했습니다');
};
ACTS.import = () => $('#file-in').click();
$('#file-in').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let d;
  try { d = JSON.parse(await file.text()); } catch (err) { return toast('백업 파일을 읽을 수 없습니다'); }
  if (!d || !Array.isArray(d.sessions) || !Array.isArray(d.exercises)) return toast('Dryland 백업 파일이 아닙니다');
  if (!(await confirmSheet({ title: '백업으로 바꿀까요?', body: `지금 폰에 있는 기록이 백업 파일의 기록 ${d.sessions.length}개로 바뀝니다.`, ok: '불러오기', danger: true }))) return;
  delete d.app; delete d.exportedAt;
  S = Object.assign(defaults(), d);
  S.settings = Object.assign(defaults().settings, d.settings);
  S.timer = null;
  if (S.activeId && !activeSession()) S.activeId = null;
  save(); render(); toast('백업을 불러왔습니다');
});
ACTS.csv = () => {
  const rows = [['date', 'type', 'place', 'condition', 'exercise', 'korean', 'set', 'warmup', 'weight_kg', 'reps', 'weight_mode', 'superset', 'exercise_note', 'session_note', 'swim_m', 'swim_time', 'swim_detail']];
  for (const s of doneSessions().reverse()) {
    const base = [s.date, s.type, s.place, s.cond ?? ''];
    if (s.type === 'swim') { rows.push([...base, '', '', '', '', '', '', '', '', '', s.note, s.swim?.dist ?? '', s.swim?.time ?? '', s.swim?.detail ?? '']); continue; }
    if (!s.items.length) rows.push([...base, '', '', '', '', '', '', '', '', '', s.note, '', '', '']);
    for (const it of s.items) {
      const ex = exById(it.ex), b = [...base, ex.name, ex.ko];
      if (!it.sets.length) rows.push([...b, '', '', '', '', ex.mode, it.g ? 'Y' : '', it.note, s.note, '', '', '']);
      it.sets.forEach((x, i) => rows.push([...b, i + 1, x.wu ? 'Y' : '', x.w ?? '', x.r ?? '', ex.mode, it.g ? 'Y' : '', it.note, s.note, '', '', '']));
    }
  }
  const cell = (v) => { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  downloadFile(`dryland-${today()}.csv`, '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n'), 'text/csv');
  toast('CSV 파일을 저장했습니다');
};
// ── 휴지통 ──
ACTS.trash = () => {
  if (purgeTrash()) save();
  const sh = openSheet('', { tall: S.trash.length > 3 });
  const draw = () => {
    sh.el.innerHTML = `<div class="grab"></div>
      <div class="row"><h3 class="grow">휴지통</h3>${S.trash.length ? '<button class="btn btn-sm btn-danger" data-a="empty">비우기</button>' : ''}</div>
      <p class="small ink2" style="margin:0">지운 기록은 ${TRASH_DAYS}일 동안 보관된 뒤 자동으로 완전히 삭제됩니다.</p>
      <div class="stack" style="gap:8px">${S.trash.map((t) => {
        const s = t.s, left = trashDaysLeft(t);
        const txt = s.type === 'swim' ? swimText(s) : (s.items.map((it) => exById(it.ex).name).join(', ') || s.note || '기록 없음');
        return `<div class="card stack" style="gap:8px;background:var(--s2)">
          <div class="row"><b>${fmtDate(s.date, true)}</b>${s.type === 'swim' ? '<span class="badge swim">수영</span>' : ''}
            <span class="grow"></span><span class="small" style="color:${left <= 3 ? 'var(--warn)' : 'var(--mute)'}">${left}일 후 삭제</span></div>
          <div class="small ink2 ellipsis">${esc(txt)}</div>
          <div class="row"><button class="btn btn-sm grow btn-danger" data-del="${s.id}">완전히 삭제</button><button class="btn btn-sm btn-primary grow" data-restore="${s.id}">복원</button></div>
        </div>`;
      }).join('') || '<div class="empty-state">휴지통이 비어 있습니다</div>'}</div>`;
  };
  sh.el.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-restore]');
    if (r) { restoreSession(r.dataset.restore); draw(); render(); toast('기록을 복원했습니다'); return; }
    const d = e.target.closest('[data-del]');
    if (d) {
      if (await confirmSheet({ title: '완전히 삭제할까요?', body: '이 기록은 다시 복원할 수 없습니다.', ok: '완전히 삭제', danger: true })) {
        S.trash = S.trash.filter((t) => t.s.id !== d.dataset.del);
        save(); draw(); render();
      }
      return;
    }
    if (e.target.closest('[data-a="empty"]') && await confirmSheet({ title: `휴지통의 기록 ${S.trash.length}개를 모두 삭제할까요?`, body: '다시 복원할 수 없습니다.', ok: '모두 삭제', danger: true })) {
      S.trash = [];
      save(); draw(); render();
    }
  });
  draw();
};
ACTS.install = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  render();
};
ACTS.reset = async () => {
  if (!(await confirmSheet({ title: '모든 기록을 지울까요?', body: '엑셀에서 옮긴 기본 기록만 있는 처음 상태로 돌아갑니다. 먼저 백업 파일을 저장하세요.', ok: '모두 지우기', danger: true }))) return;
  localStorage.removeItem(KEY);
  location.reload();
};
