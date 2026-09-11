// 데이터 저장과 계산 (폰의 localStorage에 저장)
const KEY = 'dryland.v1';   // 저장소 이름 (바꾸면 기록이 안 보이니 그대로 두기)
const APP_VERSION = 'v3';   // 더보기 화면에 표시 · sw.js의 VERSION과 같이 올리기
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const CAT = { lower: '하체', pull: '당기기', push: '밀기', power: '파워·점프', core: '코어·어깨' };
const MODES = {
  kg:     { name: '무게 (kg)',          col: 'KG',     s1: 2.5, s2: 5,  l1: '2.5', l2: '5' },
  added:  { name: '맨몸 + 추가 중량',    col: '+KG',    s1: 2.5, s2: 5,  l1: '2.5', l2: '5' },
  plates: { name: '원판만 (양쪽 합계)',   col: '원판 KG', s1: 10,  s2: 40, l1: '10',  l2: '1장' },
  reps:   { name: '횟수만',             col: null,     s1: 1,   s2: 5,  l1: '1',   l2: '5' },
  time:   { name: '시간 (초)',           col: null,     s1: 5,   s2: 15, l1: '5',   l2: '15' },
};

let S; // 앱 전체 상태

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => (v == null || v === '' ? '' : String(Math.round(v * 100) / 100));

function fmtDate(s, year) {
  const d = parseISO(s);
  return `${year ? d.getFullYear() + '. ' : ''}${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`;
}
function fmtDur(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function defaults() {
  return {
    v: 1, exercises: [], sessions: [], routines: [], goals: [], events: [], trash: [],
    settings: { bw: null, rest: 90, sound: true, vibrate: true, awake: true, notify: false, lastBackup: null },
    activeId: null, timer: null,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      S = Object.assign(defaults(), d);
      S.settings = Object.assign(defaults().settings, d.settings);
      if (!Array.isArray(S.trash)) S.trash = [];
      if (purgeTrash()) save();
      return;
    }
  } catch (e) { /* 손상된 데이터면 새로 시작 */ }
  S = defaults();
  seed();
}
function seed() {
  const D = window.DRYLAND_SEED;
  if (!D) return;
  S.exercises = D.exercises.map((e) => ({ ...e }));
  S.sessions = D.sessions.map(normSession);
  S.routines = D.routines.map((r) => ({ id: uid(), name: r.name, items: copyItems(r.items, false) }));
  S.goals = D.goals.map((g) => ({ id: uid(), ...g }));
  S.events = D.events.map((e) => ({ id: uid(), ...e }));
  save();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('저장 공간이 부족합니다. 백업 후 오래된 기록을 지워주세요.'); }
}
function normItem(it, g) {
  return {
    id: uid(), ex: it.ex, g: g === undefined ? (it.g || null) : g, note: it.note || '',
    sets: (it.sets || []).map((s) => ({ w: s.w ?? null, r: s.r ?? null, done: !!s.done, wu: !!s.wu })),
  };
}
function normSession(s) {
  return {
    id: uid(), type: s.type, date: s.date, place: s.place || '', cond: s.cond || null, note: s.note || '',
    items: copyItems(s.items || [], null), swim: s.swim || null, start: null, end: null,
  };
}
// 종목 목록을 복사 (묶음 id는 새로 만듦). done: true/false로 강제, null이면 유지
function copyItems(items, done) {
  const map = {};
  return items.map((it) => {
    const g = it.g ? (map[it.g] ||= uid()) : null;
    const n = normItem(it, g);
    if (done !== null) n.sets.forEach((s) => (s.done = done));
    return n;
  });
}

const exById = (id) => S.exercises.find((e) => e.id === id) || { id, name: id, ko: '', cat: 'core', mode: 'kg', rest: 90 };
const hasW = (ex) => ex.mode === 'kg' || ex.mode === 'added' || ex.mode === 'plates';
const activeSession = () => S.sessions.find((s) => s.id === S.activeId) || null;

function fmtW(ex, w) {
  if (w == null) return '';
  return ex.mode === 'added' && w > 0 ? '+' + num(w) : num(w);
}
function fmtR(ex, r) {
  if (r == null) return '';
  return ex.mode === 'time' ? `${num(r)}초` : `${num(r)}회`;
}
function fmtSet(ex, s) {
  if (!hasW(ex) || s.w == null) return fmtR(ex, s.r) || '—';
  const w = fmtW(ex, s.w) + 'kg';
  return s.r == null ? w : `${w} × ${num(s.r)}`;
}
function platesHint(w) {
  if (!w) return '';
  const side = w / 2, n = side / 20;
  if (Number.isInteger(n)) return `한쪽 ${n}장`;
  if (Number.isInteger(n * 2)) return `한쪽 ${Math.floor(n)}장반`;
  return `한쪽 ${num(side)}`;
}
// 추정 1RM (Epley). 추가 중량 종목은 몸무게가 있으면 몸무게 포함으로 계산 후 추가 중량으로 환산
function e1rm(ex, s) {
  if (!hasW(ex) || s.w == null || !s.r || s.wu) return null;
  const f = s.r <= 1 ? 1 : 1 + Math.min(s.r, 12) / 30;
  if (ex.mode === 'added' && S.settings.bw) return (S.settings.bw + s.w) * f - S.settings.bw;
  return s.w * f;
}

// 저장이 끝난 세션 (진행 중인 세션 제외), 최신순
function doneSessions() {
  return S.sessions.filter((s) => s.id !== S.activeId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.end || 0) - (a.end || 0));
}
function lastItemFor(exId, excludeId) {
  for (const s of doneSessions()) {
    if (s.id === excludeId) continue;
    const it = s.items.find((i) => i.ex === exId && i.sets.length);
    if (it) return { session: s, item: it };
  }
  return null;
}
// 종목별 기록 (날짜 오름차순)
function exHistory(exId) {
  const out = [];
  for (const s of doneSessions()) {
    for (const it of s.items) {
      if (it.ex !== exId) continue;
      const sets = it.sets.filter((x) => x.done);
      if (sets.length) out.push({ date: s.date, sid: s.id, sets });
    }
  }
  return out.reverse();
}
function exUsage() {
  const c = {};
  for (const s of doneSessions()) for (const it of s.items) if (it.sets.length) c[it.ex] = (c[it.ex] || 0) + 1;
  return c;
}
function sessionStats(s) {
  let sets = 0, vol = 0;
  for (const it of s.items) {
    const ex = exById(it.ex);
    for (const x of it.sets) {
      if (!x.done) continue;
      sets++;
      if (x.wu || !hasW(ex) || x.w == null || !x.r) continue;
      vol += (ex.mode === 'added' ? (S.settings.bw || 0) + x.w : x.w) * x.r;
    }
  }
  return { sets, vol: Math.round(vol), ex: s.items.filter((i) => i.sets.length || i.note).length };
}
// 이 세션에서 세운 개인 기록
function prsIn(s) {
  const out = [];
  for (const it of s.items) {
    const ex = exById(it.ex);
    if (!hasW(ex)) continue;
    const sets = it.sets.filter((x) => x.done && !x.wu && x.w != null);
    if (!sets.length) continue;
    let pw = -Infinity, pe = -Infinity, any = false;
    for (const o of S.sessions) {
      if (o.id === s.id || o.id === S.activeId || o.date > s.date) continue;
      for (const oi of o.items) {
        if (oi.ex !== it.ex) continue;
        for (const x of oi.sets) {
          if (!x.done || x.wu || x.w == null) continue;
          any = true;
          pw = Math.max(pw, x.w);
          const e = e1rm(ex, x);
          if (e != null) pe = Math.max(pe, e);
        }
      }
    }
    if (!any) continue;
    const bw = Math.max(...sets.map((x) => x.w));
    const be = Math.max(...sets.map((x) => e1rm(ex, x) ?? -Infinity));
    if (bw > pw) out.push({ ex, kind: '최고 무게', val: fmtW(ex, bw) + 'kg' });
    else if (be > pe + 0.05) out.push({ ex, kind: '추정 1RM', val: fmtW(ex, Math.round(be * 10) / 10) + 'kg' });
  }
  return out;
}
function goalProgress(g) {
  let best = null, bestDate = null, achieved = null;
  for (const h of exHistory(g.ex)) {
    const ok = h.sets.filter((x) => !x.wu && x.w != null && x.r != null && x.r >= g.r);
    for (const x of ok) if (best == null || x.w > best) { best = x.w; bestDate = h.date; }
    if (!achieved && ok.filter((x) => x.w >= g.w).length >= (g.sets || 1)) achieved = h.date;
  }
  return { ex: exById(g.ex), best, bestDate, achieved, pct: best == null ? 0 : Math.max(0, Math.min(1, best / g.w)) };
}
function places() {
  const c = {};
  for (const s of S.sessions) if (s.place) c[s.place] = (c[s.place] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a]);
}
function nextEvent() {
  const t = today();
  return S.events.filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
function daysUntil(dateStr) {
  return Math.round((parseISO(dateStr) - parseISO(today())) / 86400000);
}

// ── 휴지통: 지운 기록은 30일 보관 후 자동으로 완전 삭제 ──
const TRASH_DAYS = 30;
function purgeTrash() {
  const limit = Date.now() - TRASH_DAYS * 86400000, n = S.trash.length;
  S.trash = S.trash.filter((t) => t.at > limit);
  return n !== S.trash.length;
}
function trashSession(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return null;
  S.sessions = S.sessions.filter((x) => x.id !== id);
  if (S.activeId === id) { S.activeId = null; S.timer = null; }
  S.trash.unshift({ at: Date.now(), s });
  save();
  return s;
}
function restoreSession(id) {
  const i = S.trash.findIndex((t) => t.s.id === id);
  if (i < 0) return;
  S.sessions.push(S.trash.splice(i, 1)[0].s);
  save();
}
const trashDaysLeft = (t) => Math.max(1, Math.ceil((t.at + TRASH_DAYS * 86400000 - Date.now()) / 86400000));
