/* ============================================================
   config.js - 게임 전역 설정 상수
   ★ DIFFICULTY 섹션 추가 (Easy / Normal / Hard)
   ============================================================ */

const CONFIG = {
  WIDTH:  480,
  HEIGHT: 854,

  COLORS: {
    SKY_CLEAN:    0x87CEEB,
    SKY_DIRTY:    0x445566,
    WATER_CLEAN:  0x48CAE4,
    WATER_DIRTY:  0x556677,
    ISLAND_CLEAN: 0x6CC24A,
    ISLAND_DIRTY: 0x887766,
    SAND:         0xF4D03F,
    SAND_DIRTY:   0x998877,

    MINT:    0x00C896,
    MINT_L:  0x4EEEC0,
    YELLOW:  0xFFE66D,
    CORAL:   0xFF6B6B,
    BLUE:    0x4FC3F7,
    PURPLE:  0xC7B3F4,
    WHITE:   0xFFFFFF,
    BLACK:   0x000000,
    PANEL:   0x1A3A2A,
    PANEL_L: 0x2A5A3A,

    PLASTIC: 0x4FC3F7,
    GLASS:   0x80DEEA,
    METAL:   0xB0BEC5,
    PAPER:   0xFFCC80,
    TRASH:   0xA5D6A7,

    DIRTY:   0x556644,
    DIRT_BG: 0x334433,
  },

  TRASH_TYPES: ['plastic', 'glass', 'metal', 'paper'],

  POLLUTION: {
    START:            70,
    MAX:              150,
    MIN:              0,
    DANGER_THRESHOLD: 120,  // 이 이상이면 위험 경고
    COUNTDOWN_AT:     140,  // 이 이상이면 게임오버 카운트다운
    GAMEOVER_AT:      150,  // 도달 즉시 게임오버
  },

  SCORE: {
    WASH_SUCCESS:  50,
    WASH_FAIL:    -20,
    SORT_CORRECT: 100,
    SORT_WRONG:   -30,
    CRAFT_BONUS:  200,
  },

  COMBO: {
    ECO_FEVER_THRESHOLD:  10,
    ECO_FEVER_MULTIPLIER: 2,
    ECO_FEVER_DURATION:   10000,
  },

  WASH: {
    TIME_LIMIT:   3000,
    CLICK_POWER:  8,
    DIRTY_CHANCE: 0.45,   // 기본값 (난이도별 override)
  },

  SORT: {
    FALL_SPEED:    180,   // 기본값 (난이도별 override)
    SPAWN_DELAY:   2000,
    TOTAL_ITEMS:   10,
  },

  /* ══════════════════════════════════════════════════════
     ★ 난이도 설정
       pollutionPerTick : 8초마다 증가하는 오염도
       dirtyChance      : 더티 아이템 생성 확률
       fallSpeed        : 분류 미니게임 낙하 속도 (px/s)
       gameOver         : true 시 오염 COUNTDOWN_AT부터 경고, GAMEOVER_AT에서 강제 종료
       gameOverGrace    : 카운트다운 유예 시간(ms), 0=COUNTDOWN_AT 즉시
       trashDecay       : 쓰레기 방치 시 소멸 + 오염 증가
  ══════════════════════════════════════════════════════ */
  DIFFICULTY: {
    EASY: {
      label:            '쉬움',
      emoji:            '🌿',
      colorHex:         '#00C896',
      colorInt:         0x00C896,
      desc:             '오염 증가 느림  ·  게임오버 없음',
      pollutionPerTick: 3.5,
      dirtyChance:      0.30,
      fallSpeed:        150,
      gameOver:         false,
      gameOverGrace:    0,
      trashDecay:       false,
    },
    NORMAL: {
      label:            '보통',
      emoji:            '🔥',
      colorHex:         '#FFE66D',
      colorInt:         0xFFE66D,
      desc:             '오염 증가 빠름  ·  140부터 8초 카운트다운',
      pollutionPerTick: 6.1,
      dirtyChance:      0.45,
      fallSpeed:        180,
      gameOver:         true,
      gameOverGrace:    8000,
      trashDecay:       false,
    },
    HARD: {
      label:            '어려움',
      emoji:            '💀',
      colorHex:         '#FF6B6B',
      colorInt:         0xFF6B6B,
      desc:             '오염 폭증  ·  140부터 8초 카운트다운  ·  쓰레기 소멸',
      pollutionPerTick: 12.0,
      dirtyChance:      0.62,
      fallSpeed:        220,
      gameOver:         true,
      gameOverGrace:    8000,
      trashDecay:       true,   // 방치 25초 후 소멸 + 오염 +6
    },
  },

  TEXT: {
    TITLE:   { fontFamily: 'Jua',    fontSize: '48px', color: '#FFFFFF', stroke: '#006644', strokeThickness: 6 },
    HEAD:    { fontFamily: 'Nunito', fontSize: '24px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#1A3A2A', strokeThickness: 4 },
    BODY:    { fontFamily: 'Nunito', fontSize: '18px', color: '#FFFFFF' },
    SMALL:   { fontFamily: 'Nunito', fontSize: '14px', color: '#CCFFEE' },
    SCORE:   { fontFamily: 'Jua',    fontSize: '28px', color: '#FFE66D', stroke: '#1A3A2A', strokeThickness: 5 },
    COMBO:   { fontFamily: 'Jua',    fontSize: '22px', color: '#FF6B6B', stroke: '#1A3A2A', strokeThickness: 4 },
    LABEL:   { fontFamily: 'Nunito', fontSize: '13px', color: '#AAFFCC', fontStyle: 'bold' },
  },
};
