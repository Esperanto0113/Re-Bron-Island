/* ============================================================
   config.js - 게임 전역 설정 상수
   모든 숫자·색상·타이밍은 여기서 관리합니다.
   ============================================================ */

const CONFIG = {
  /* ─── 캔버스 크기 (9:16 모바일 세로 비율) ─── */
  WIDTH:  480,
  HEIGHT: 854,

  /* ─── 팔레트 (Phaser용 0x 정수) ─── */
  COLORS: {
    // 깨끗한 섬 색
    SKY_CLEAN:    0x87CEEB,   // 하늘색
    SKY_DIRTY:    0x445566,   // 오염된 하늘
    WATER_CLEAN:  0x48CAE4,   // 맑은 바다
    WATER_DIRTY:  0x556677,   // 오염된 바다
    ISLAND_CLEAN: 0x6CC24A,   // 초록 섬
    ISLAND_DIRTY: 0x887766,   // 회색 섬
    SAND:         0xF4D03F,   // 모래
    SAND_DIRTY:   0x998877,

    // UI 팔레트 (민트·파스텔)
    MINT:    0x00C896,
    MINT_L:  0x4EEEC0,
    YELLOW:  0xFFE66D,
    CORAL:   0xFF6B6B,
    BLUE:    0x4FC3F7,
    PURPLE:  0xC7B3F4,
    WHITE:   0xFFFFFF,
    BLACK:   0x000000,
    PANEL:   0x1A3A2A,   // 패널 배경
    PANEL_L: 0x2A5A3A,

    // 쓰레기 타입별 색
    PLASTIC: 0x4FC3F7,
    GLASS:   0x80DEEA,
    METAL:   0xB0BEC5,
    PAPER:   0xFFCC80,
    TRASH:   0xA5D6A7,

    // 오염 색 (더티 아이템)
    DIRTY:   0x556644,
    DIRT_BG: 0x334433,
  },

  /* ─── 쓰레기 타입 목록 ─── */
  TRASH_TYPES: ['plastic', 'glass', 'metal', 'paper'],

  /* ─── 섬 오염도 ─── */
  POLLUTION: {
    MAX: 100,   // 완전 오염
    MIN: 0,     // 완전 복구
  },

  /* ─── 점수 ─── */
  SCORE: {
    WASH_SUCCESS:  50,   // 세척 성공
    WASH_FAIL:    -20,   // 세척 실패
    SORT_CORRECT: 100,   // 분류 정답
    SORT_WRONG:   -30,   // 분류 오답
    CRAFT_BONUS:  200,   // 제작 보너스
  },

  /* ─── 콤보 시스템 ─── */
  COMBO: {
    ECO_FEVER_THRESHOLD:  10,    // 에코 피버 발동 콤보
    ECO_FEVER_MULTIPLIER: 2,     // 점수 배율
    ECO_FEVER_DURATION:   10000, // 지속 시간 (ms)
  },

  /* ─── 세척 미니게임 ─── */
  WASH: {
    TIME_LIMIT:   3000,  // 제한 시간 (ms)
    CLICK_POWER:  8,     // 클릭 1회당 게이지 증가량 (%)
    DIRTY_CHANCE: 0.45,  // 더티 아이템 생성 확률
  },

  /* ─── 분류 미니게임 ─── */
  SORT: {
    FALL_SPEED:    180,  // 낙하 속도 (px/s)
    SPAWN_DELAY:   2000, // 다음 아이템 생성 딜레이 (ms)
    TOTAL_ITEMS:   10,   // 라운드당 총 아이템 수
  },

  /* ─── 텍스트 스타일 ─── */
  TEXT: {
    TITLE:   { fontFamily: 'Jua', fontSize: '48px', color: '#FFFFFF', stroke: '#006644', strokeThickness: 6 },
    HEAD:    { fontFamily: 'Nunito', fontSize: '24px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#1A3A2A', strokeThickness: 4 },
    BODY:    { fontFamily: 'Nunito', fontSize: '18px', color: '#FFFFFF' },
    SMALL:   { fontFamily: 'Nunito', fontSize: '14px', color: '#CCFFEE' },
    SCORE:   { fontFamily: 'Jua',    fontSize: '28px', color: '#FFE66D', stroke: '#1A3A2A', strokeThickness: 5 },
    COMBO:   { fontFamily: 'Jua',    fontSize: '22px', color: '#FF6B6B', stroke: '#1A3A2A', strokeThickness: 4 },
    LABEL:   { fontFamily: 'Nunito', fontSize: '13px', color: '#AAFFCC', fontStyle: 'bold' },
  },
};
