// 처음 실행할 때 한 번만 불러오는 기본 데이터
// - 종목 라이브러리 (운동 이름은 영어로 통일)
// - 엑셀 '운동 일지.xlsx'에서 옮긴 2026년 4월~9월 기록
(function () {
  // mode: kg(전체 무게) · added(맨몸 + 추가 중량) · plates(원판만, 양쪽 합계) · reps(횟수만) · time(초)
  const X = (id, name, ko, cat, mode, rest) => ({ id, name, ko, cat, mode, rest: rest || 90 });
  const exercises = [
    X('trap-bar-deadlift', 'Trap Bar Deadlift', '트랩바 데드리프트', 'lower', 'plates', 150),
    X('squat', 'Back Squat', '스쿼트', 'lower', 'kg', 150),
    X('box-squat', 'Box Squat', '박스 스쿼트', 'lower', 'kg', 120),
    X('front-squat', 'Front Squat', '프론트 스쿼트', 'lower', 'kg', 150),
    X('rdl', 'Romanian Deadlift', '루마니안 데드리프트', 'lower', 'kg', 120),
    X('bss', 'Bulgarian Split Squat', '불가리안 스플릿 스쿼트', 'lower', 'kg', 90),
    X('leg-press', 'Leg Press', '레그프레스', 'lower', 'plates', 120),
    X('lying-leg-curl', 'Lying Leg Curl', '라잉 레그컬', 'lower', 'kg', 90),
    X('hip-thrust', 'Hip Thrust', '힙 쓰러스트', 'lower', 'kg', 90),
    X('hip-adduction', 'Hip Adduction Machine', '힙 어덕션 머신', 'lower', 'kg', 60),
    X('hip-abduction', 'Hip Abduction Machine', '힙 어브덕션 머신', 'lower', 'kg', 60),
    X('calf-raise', 'Calf Raise', '카프 레이즈', 'lower', 'kg', 60),

    X('cmj', 'Countermovement Jump', '서전트 점프 CMJ', 'power', 'reps', 60),
    X('trap-bar-jump', 'Trap Bar Jump', '트랩바 점프', 'power', 'plates', 120),
    X('band-assisted-jump', 'Band-Assisted Jump', '밴드 어시스트 점프', 'power', 'reps', 60),
    X('box-jump', 'Box Jump', '박스 점프', 'power', 'reps', 60),
    X('broad-jump', 'Broad Jump', '제자리 멀리뛰기', 'power', 'reps', 60),
    X('power-clean', 'Power Clean', '파워 클린', 'power', 'kg', 120),
    X('med-ball-slam', 'Medicine Ball Slam', '메디신볼 슬램', 'power', 'kg', 60),

    X('weighted-pull-up', 'Weighted Pull-up', '중량 풀업 오버그립', 'pull', 'added', 150),
    X('weighted-chin-up', 'Weighted Chin-up', '중량 친업 언더그립', 'pull', 'added', 150),
    X('lat-pulldown', 'Lat Pulldown', '랫풀다운', 'pull', 'kg', 90),
    X('straight-arm-pulldown', 'Straight-Arm Pulldown', '암풀다운', 'pull', 'kg', 90),
    X('high-row-overhand', 'High Row (Overhand)', '하이로우 오버그립', 'pull', 'kg', 90),
    X('high-row-neutral', 'High Row (Neutral Grip)', '하이로우 뉴트럴그립', 'pull', 'kg', 90),
    X('seated-row', 'Seated Cable Row', '시티드 케이블 로우', 'pull', 'kg', 90),
    X('barbell-row', 'Barbell Row', '바벨 로우', 'pull', 'kg', 120),
    X('db-pullover', 'Dumbbell Pullover', '덤벨 풀오버', 'pull', 'kg', 90),
    X('reverse-fly', 'Reverse Fly', '리버스 플라이', 'pull', 'kg', 60),
    X('reverse-pec-deck', 'Reverse Pec Deck', '리버스 펙덱', 'pull', 'kg', 60),
    X('face-pull', 'Face Pull', '페이스 풀', 'pull', 'kg', 60),
    X('db-shrug', 'Dumbbell Shrug', '덤벨 슈러그', 'pull', 'kg', 90),

    X('bench-press', 'Barbell Flat Bench Press', '바벨 플랫 벤치 프레스', 'push', 'kg', 120),
    X('ohp', 'Overhead Press', '오버헤드 프레스 OHP', 'push', 'kg', 120),
    X('db-bench', 'Dumbbell Bench Press', '덤벨 벤치 프레스', 'push', 'kg', 90),
    X('weighted-dip', 'Weighted Dip', '중량 딥스', 'push', 'added', 120),
    X('push-up', 'Push-up', '푸쉬업', 'push', 'reps', 60),
    X('cable-triceps', 'Cable Triceps Extension', '케이블 삼두', 'push', 'kg', 60),
    X('rope-pushdown', 'Rope Pushdown', '로프 푸쉬다운', 'push', 'kg', 60),
    X('db-curl', 'Dumbbell Curl', '덤벨 컬', 'push', 'kg', 60),

    X('superman', 'Superman', '슈퍼맨', 'core', 'kg', 60),
    X('serratus', 'Serratus Exercise', '전거근 운동', 'core', 'reps', 60),
    X('plank', 'Plank', '플랭크', 'core', 'time', 60),
    X('crossover-toe-touch', 'Crossover Toe Touch', '크로스오버 토터치', 'core', 'reps', 60),
    X('cable-external-rotation', 'Cable External Rotation', '케이블 외회전 어깨', 'core', 'kg', 60),
    X('pallof-press', 'Pallof Press', '팔로프 프레스', 'core', 'kg', 60),
    X('hanging-leg-raise', 'Hanging Leg Raise', '행잉 레그레이즈', 'core', 'reps', 60),
  ];

  const s = (w, r, n, extra) => Array.from({ length: n || 1 }, () => Object.assign({ w, r, done: true }, extra || {}));
  const it = (ex, sets, o) => Object.assign({ ex, sets: [].concat(...sets) }, o || {});
  const W = (date, place, items, o) => Object.assign({ type: 'weight', date, place, items }, o || {});
  const SW = (date, place, swim, o) => Object.assign({ type: 'swim', date, place, items: [], swim }, o || {});
  const easy = '적당히 수행';

  const sessions = [
    W('2026-04-09', '에너메카', [], { note: '전신 · 운동 목표는 strength 향상, 너무 다 털리지 않게' }),
    SW('2026-04-14', '구산역', { detail: "30' 6,6,4" }),
    W('2026-04-16', '에너메카', [
      it('trap-bar-deadlift', [s(130, 2)], { g: 'a' }),
      it('cmj', [s(null, 2)], { g: 'a' }),
      it('weighted-pull-up', [s(40, 3, 2), s(20, 8)]),
    ]),
    W('2026-04-19', '에너메카', [
      it('squat', [s(100, 5, 3)], { g: 'a' }),
      it('cmj', [s(null, 2)], { g: 'a' }),
      it('leg-press', [s(160, 10, 2)], { note: '4장' }),
    ], { note: '충무에서 수영도 함' }),
    W('2026-04-20', '에너메카', [
      it('weighted-pull-up', [s(30, 5, 3)]),
      it('straight-arm-pulldown', [s(25, 5, 2)]),
      it('cable-triceps', [s(12.5, 12)]),
      it('lying-leg-curl', [s(32, 12, 2)]),
    ]),
    W('2026-04-26', '에너메카', [
      it('trap-bar-deadlift', [s(100, 2), s(120, 1), s(130, 1), s(140, 1)], { note: '점프와 함께' }),
      it('weighted-chin-up', [s(20, 2), s(45, 1), s(50, 2), s(40, 4, 4)]),
      it('lat-pulldown', [], { note: easy }),
      it('reverse-pec-deck', [], { note: easy }),
    ]),
    SW('2026-04-27', '충무', {}),
    W('2026-04-28', '에너메카', [
      it('ohp', [s(60, 2), s(65, 2), s(70, 2)]),
      it('power-clean', [s(60, 2)]),
      it('db-pullover', [s(10, 6, 2)]),
      it('superman', [], { note: 'w/ 5kg, ' + easy }),
    ]),
    SW('2026-04-28', '구산', { detail: 'Submarine 3, Max 1' }, { cond: 2, note: '수영 컨디션 bad' }),
    W('2026-04-30', '에너메카', [
      it('trap-bar-deadlift', [s(40, null, 1, { wu: true }), s(80, null, 1, { wu: true }), s(120, null, 1, { wu: true }), s(130, null)], { note: '스트랩 사용 · 130 Easy' }),
      it('trap-bar-jump', [s(20, 3, 2)], { g: 'a', note: '봉 무게 포함해서 적음 → 원판만 기록' }),
      it('cmj', [s(null, 2, 2)], { g: 'a' }),
      it('weighted-chin-up', [s(45, 3, 2)]),
      it('weighted-pull-up', [s(20, 5)]),
    ], { note: '목표: 데드 145, 친업 +45 3×3' }),
    SW('2026-05-04', '충무', {}),
    W('2026-05-07', '에너메카', [it('db-shrug', [s(26, 10), s(26, 8, 3)])]),
    SW('2026-05-08', '충무', {}),
    SW('2026-05-11', '충무', { dist: 1500, time: '33:00' }),
    SW('2026-05-12', '구산역', { detail: '25m @1:00 × 8 / 6' }),
    SW('2026-05-13', '충무', {}, { note: '적당히' }),
    SW('2026-05-14', 'DMC', { dist: 1500, detail: '1500m 기록 측정' }),
    W('2026-05-29', '에너메카', [
      it('weighted-chin-up', [s(20, 3), s(40, 4.5)]),
      it('weighted-pull-up', [s(20, 5, 2)]),
      it('straight-arm-pulldown', [s(65, 5, 2)]),
      it('trap-bar-deadlift', [s(120, 2), s(140, 1), s(120, 2)], { g: 'a', note: '3장 / 3장반 / 3장' }),
      it('cmj', [s(null, 2, 3)], { g: 'a', note: '항상 2개씩' }),
    ]),
    W('2026-07-15', '', [
      it('weighted-chin-up', [s(20, 4), s(30, 4), s(40, 2), s(40, 3), s(40, 3)]),
      it('high-row-overhand', [], { note: easy }),
      it('straight-arm-pulldown', [], { note: easy }),
      it('reverse-fly', [], { note: easy }),
      it('serratus', [], { note: easy }),
    ]),
    W('2026-07-17', '', [
      it('box-squat', [s(60, 5, 4)]),
      it('trap-bar-deadlift', [s(60, 8, 3)]),
      it('trap-bar-jump', [s(60, 5)], { g: 'a' }),
      it('cmj', [s(null, 2)], { g: 'a' }),
      it('rope-pushdown', [s(null, 15, 3)]),
      it('db-curl', [], { note: easy }),
    ]),
    W('2026-07-24', '', [
      it('weighted-chin-up', [s(20, 3), s(35, 2)]),
      it('weighted-pull-up', [s(20, 6), s(20, 7)]),
      it('straight-arm-pulldown', [s(72.5, 5, 2)]),
      it('box-squat', [s(40, null)], { g: 'a' }),
      it('band-assisted-jump', [], { g: 'a' }),
      it('cmj', [s(null, 2)]),
    ]),
    W('2026-08-18', '', [
      it('weighted-chin-up', [s(40, 3, 3)]),
      it('weighted-pull-up', [s(20, 8, 2)]),
    ]),
    W('2026-08-26', '', [
      it('weighted-chin-up', [s(30, 5), s(40, 4)], { note: '30kg는 빠르게 (speed)' }),
      it('weighted-pull-up', [s(20, 8)]),
      it('trap-bar-deadlift', [s(80, 8, 4)], { note: '20kg 2장씩' }),
    ]),
    W('2026-09-01', '', [
      it('high-row-overhand', [s(40, 10, 3)]),
      it('high-row-neutral', [s(40, 8), s(60, 8, 3)]),
      it('trap-bar-deadlift', [s(80, 8, 3)], { note: '20kg 2장' }),
    ]),
  ];

  const r = (w, rr, n) => s(w, rr, n, { done: false });
  const routines = [
    { name: '당기기 스트렝스', items: [
      it('weighted-chin-up', [r(40, 3, 3)]),
      it('weighted-pull-up', [r(20, 8, 2)]),
      it('straight-arm-pulldown', [r(72.5, 5, 2)]),
    ] },
    { name: '하체 파워 · 컨트라스트', items: [
      it('trap-bar-deadlift', [r(80, 8, 3)], { g: 'a' }),
      it('cmj', [r(null, 2, 3)], { g: 'a' }),
      it('box-squat', [r(60, 5, 4)], { g: 'b' }),
      it('band-assisted-jump', [r(null, 3, 4)], { g: 'b' }),
    ] },
  ];

  window.DRYLAND_SEED = {
    exercises,
    sessions,
    routines,
    goals: [
      { ex: 'trap-bar-deadlift', w: 145, r: 1, sets: 1 },
      { ex: 'weighted-chin-up', w: 45, r: 3, sets: 3 },
    ],
    events: [
      { date: '2026-05-02', name: 'KBS 스타트 (5/2~5/3)' },
      { date: '2026-06-28', name: '수원 대회' },
    ],
  };
})();
