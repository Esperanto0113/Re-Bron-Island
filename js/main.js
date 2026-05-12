/* ============================================================
   main.js - Phaser 3 게임 진입점
   모든 씬을 등록하고 게임 인스턴스를 생성합니다.
   ============================================================ */

/**
 * Phaser 3 게임 설정
 * - WebGL 우선, 불가 시 Canvas 폴백
 * - Scale.FIT: 화면 크기에 맞게 비율 유지하며 확대/축소
 * - CENTER_BOTH: 화면 중앙 정렬 (PC 레터박스)
 */
const phaserConfig = {
  type: Phaser.AUTO,          // WebGL 우선 → Canvas 폴백
  backgroundColor: '#0A2A1A', // 로딩 중 배경색

  /* ─── 스케일 설정 (반응형 모바일/PC) ─── */
  scale: {
    mode:         Phaser.Scale.FIT,       // 비율 유지하며 맞춤
    autoCenter:   Phaser.Scale.CENTER_BOTH, // 가로+세로 중앙
    width:        CONFIG.WIDTH,
    height:       CONFIG.HEIGHT,
    expandParent: false,  // 부모 크기를 캔버스에 맞게 늘리지 않음
    min: { width: 240, height: 427 },
    max: { width: 960, height: 1708 },
  },

  /* ─── 물리 엔진 (아케이드: 간단한 충돌 처리) ─── */
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },

  /* ─── 씬 목록 (로드 순서 = 실행 순서) ─── */
  scene: [
    BootScene,    // 1. 텍스처 생성 + 초기화
    MenuScene,    // 2. 타이틀 메뉴
    IslandScene,  // 3. 메인 아일랜드 (수집/UI 허브)
    WashScene,    // 4. 세척 미니게임
    SortScene,    // 5. 분류 미니게임
    CraftScene,   // 6. 업사이클 제작
    DexScene,     // 7. 도감
    EndingScene,  // 8. 결과 리포트
  ],

  /* ─── 입력 설정 ─── */
  input: {
    activePointers: 2, // 멀티터치 (최대 2포인터)
  },

  /* ─── 렌더러 ─── */
  render: {
    antialias:        true,
    pixelArt:         false,
    roundPixels:      false,
    transparent:      false,
    clearBeforeRender:true,
  },

  /* ─── 부모 요소 ─── */
  parent: 'game-container',
};

/* ──────────────────────────────────────
   게임 인스턴스 생성
   DOMContentLoaded 이후 실행
────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // 로딩 화면 DOM 제거 (Phaser 캔버스로 대체)
  const loadingEl = document.getElementById('loading-screen');

  const game = new Phaser.Game(phaserConfig);

  // Phaser 준비 완료 이벤트
  game.events.once('ready', () => {
    if (loadingEl) {
      loadingEl.style.transition = 'opacity 0.5s';
      loadingEl.style.opacity    = '0';
      setTimeout(() => loadingEl.remove(), 500);
    }
  });

  // 전역 노출 (디버깅용)
  window.__game      = game;
  window.__gameState = gameState;
});
