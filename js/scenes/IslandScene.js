/* ============================================================
   IslandScene.js
   ★ z-index(setDepth) 기반 설계
   ─────────────────────────────────────────────────────────
   depth 계층표 (한 눈에 보기)
     0   _bgGraphics      하늘 그라디언트 + 바다
     1   cloud Graphics   구름 (개별 객체, animated)
     3   _islandGfx       섬 지형
     4   _natureLayer     나무·꽃·부유쓰레기
     7   buildingObjects  건물 (타입별 개별 Graphics)  ← ★ 핵심
     8   trash sprites    수거 가능한 쓰레기 아이템
     9   seagull Graphics 갈매기 (개별 객체, animated)
    15   UI bg            하단패널·HUD 배경
    16   UI text          점수·인벤토리·버튼 텍스트
    17   pollution bar fg 오염도 바 전경
    50   popup text       수집/오답 팝업
   ─────────────────────────────────────────────────────────
   건물은 _buildingLayer(공유 Graphics) 를 쓰지 않고
   각 타입마다 독립 Graphics 객체를 생성합니다.
   → this._bldObjects['eco_house'] 처럼 직접 접근·수정 가능
   → 오염도가 바뀌어도 건물은 재드로우 없이 유지됩니다.
   ============================================================ */

class IslandScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IslandScene' });
    this._trashObjects  = [];
    this._bgGraphics    = null;
    this._islandGfx     = null;
    this._natureLayer   = null;
    this._bldObjects    = {};   // ★ { 'eco_house': Graphics, 'windmill': Graphics, … }
    this._cloudData     = [];
    this._seagullData   = [];
  }

  init() {
    this._trashObjects = [];
    this._bldObjects   = {};
    this._cloudData    = [];
    this._seagullData  = [];
    this._stabilizedNotified = false;
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;

    /* ─── 정적 배경 레이어 (오염도 변화 시 통째로 다시 그림) ─── */
    this._bgGraphics  = this.add.graphics().setDepth(0);
    this._islandGfx   = this.add.graphics().setDepth(3);
    this._natureLayer = this.add.graphics().setDepth(4);
    /* 건물 레이어(공유 Graphics) 제거 → _bldObjects 로 대체 */

    this._dangerBorderGfx   = this.add.graphics().setDepth(13);
    this._dangerWarnActive  = false;
    this._gameOverCountdown = null;

    this._redrawScene();

    /* ★ 건물: 씬 시작 시 한 번만 생성 (오염도 무관) */
    this._refreshBuildings(WIDTH, HEIGHT);

    /* ★ 구름 + 갈매기 */
    this._createAnimatedClouds(WIDTH, HEIGHT);
    this._createAnimatedSeagulls(WIDTH, HEIGHT);

    this._spawnTrashItems();
    this._buildUI(WIDTH, HEIGHT);

    this.time.addEvent({ delay: 30000, callback: () => gameState.save(), loop: true });
    this._autoGainEvent = this.time.addEvent({
      delay: 25000, callback: this._onAutoResourceTick, callbackScope: this, loop: true,
    });
    this._environmentEvent = this.time.addEvent({
      delay: 8000, callback: this._onEnvironmentTick, callbackScope: this, loop: true,
    });

    this.events.on('wake', this._onWake, this);
    this.events.once('shutdown', () => {
      if (this._autoGainEvent)    this._autoGainEvent.remove();
      if (this._environmentEvent) this._environmentEvent.remove();
    });
    this._checkWinCondition();
  }

  _onWake() {
    this._redrawScene();
    this._refreshBuildings(CONFIG.WIDTH, CONFIG.HEIGHT); // 돌아왔을 때 새 건물 반영
    this._refreshUI();
    this._checkDangerState();
    this._checkWinCondition();
  }

  /* ══════════════════════════════════════════════════════════
     배경 + 섬 + 자연 (오염도 변화 시 재드로우, 건물은 제외)
  ══════════════════════════════════════════════════════════ */
  _redrawScene() {
    const { WIDTH, HEIGHT } = CONFIG;
    const p = Phaser.Math.Clamp(gameState.pollution / CONFIG.POLLUTION.MAX, 0, 1);

    this._bgGraphics.clear();
    this._islandGfx.clear();
    this._natureLayer.clear();
    /* ★ 건물은 건드리지 않음 → _bldObjects 각자가 depth 7 로 항상 상위에 있음 */

    /* 하늘 */
    const skyR = Phaser.Math.Linear(0x87, 0x44, p);
    const skyG = Phaser.Math.Linear(0xCE, 0x55, p);
    const skyB = Phaser.Math.Linear(0xEB, 0x66, p);
    this._bgGraphics.fillStyle(Phaser.Display.Color.GetColor(skyR, skyG, skyB), 1);
    this._bgGraphics.fillRect(0, 0, WIDTH, HEIGHT * 0.56);

    /* 바다 */
    const seaR = Phaser.Math.Linear(0x48, 0x44, p);
    const seaG = Phaser.Math.Linear(0xCA, 0x55, p);
    const seaB = Phaser.Math.Linear(0xE4, 0x77, p);
    this._bgGraphics.fillStyle(Phaser.Display.Color.GetColor(seaR, seaG, seaB), 1);
    this._bgGraphics.fillRect(0, HEIGHT * 0.56, WIDTH, HEIGHT * 0.44);
    for (let i = 0; i < 4; i++) {
      this._bgGraphics.fillStyle(0xFFFFFF, 0.08 - p * 0.06);
      this._bgGraphics.fillRect(0, HEIGHT * 0.56 + i * 28, WIDTH, 4);
    }

    this._drawIsland(p, WIDTH, HEIGHT);
    this._drawNature(p, WIDTH, HEIGHT);

    // if (!localStorage.getItem('tutorial_done')) {
    //   this.scene.launch('TutorialScene');
    // }
  }

  _drawIsland(p, W, H) {
    const iy = H * 0.58;
    const g  = this._islandGfx;

    const shadowR = Phaser.Math.Linear(0x55, 0x44, p);
    const shadowG = Phaser.Math.Linear(0x77, 0x44, p);
    g.fillStyle(Phaser.Display.Color.GetColor(shadowR, shadowG, 0x44), 0.6);
    g.fillEllipse(W / 2 + 8, iy + 10, 360, 90);

    const landR = Phaser.Math.Linear(0x6C, 0x88, p);
    const landG = Phaser.Math.Linear(0xC2, 0x77, p);
    const landB = Phaser.Math.Linear(0x4A, 0x66, p);
    g.fillStyle(Phaser.Display.Color.GetColor(landR, landG, landB), 1);
    g.fillEllipse(W / 2, iy, 360, 85);

    const sandR = Phaser.Math.Linear(0xF4, 0x99, p);
    const sandG = Phaser.Math.Linear(0xD0, 0x88, p);
    g.fillStyle(Phaser.Display.Color.GetColor(sandR, sandG, 0x55), 1);
    g.fillEllipse(W / 2, iy + 22, 340, 50);
  }

  _drawNature(p, W, H) {
    const clean = 1 - p;
    const ecoHouseBuilt = (gameState.buildingCounts?.['eco_house'] > 0);

    if (clean > 0.1) {
      this._natureLayer.fillStyle(0x56B84A, clean * 0.8);
      this._natureLayer.fillEllipse(W / 2 - 60, H * 0.570,  80, 15);
      this._natureLayer.fillEllipse(W / 2 + 80, H * 0.575, 100, 15);
    }

    /* 나무 위치: 건물과 안 겹치도록 좌우 끝으로 이동
       tree0 좌(W*0.20) / tree1 우(W*0.73) / tree2 중앙(에코하우스 시 제거) */
    const treePos = [
      [W * 0.20, H * 0.535],
      [W * 0.73, H * 0.530],
      [W * 0.41, H * 0.525],
    ];
    treePos.forEach(([tx, ty], idx) => {
      if (idx === 2 && ecoHouseBuilt) return;
      if (idx === 0 || clean > 0.3)  this._drawTree(tx, ty, p);
    });

    if (clean > 0.6) this._drawFlowers(clean, W, H);
    if (p > 0.3)     this._drawFloatingTrash(p, W, H);
  }

  _drawTree(x, y, p) {
    const g = this._natureLayer;
    const leafR = Phaser.Math.Linear(0x56, 0x44, p);
    const leafG = Phaser.Math.Linear(0xB8, 0x55, p);
    const mainColor      = Phaser.Display.Color.GetColor(leafR, leafG, 0x3A);
    const highlightColor = Phaser.Display.Color.GetColor(leafR + 0x10, leafG + 0x10, 0x4A);

    g.fillStyle(0x7B5E3A, 1);
    g.fillRect(x - 5, y - 12, 10, 40);

    g.fillStyle(mainColor, 1);
    g.fillTriangle(x, y - 44, x - 22, y - 10, x + 22, y - 10);
    g.fillTriangle(x, y - 68, x - 16, y - 40, x + 16, y - 40);

    g.fillStyle(highlightColor, 0.8);
    g.fillTriangle(x, y - 32, x - 14, y - 6,  x + 14, y - 6);
    g.fillTriangle(x, y - 56, x - 10, y - 34, x + 10, y - 34);
  }

  _drawFlowers(clean, W, H) {
    const g = this._natureLayer;
    const alpha = Math.min(1, clean * 1.3);
    
    // 꽃 무리 데이터: [중심X, 중심Y, 꽃 타입, 색상]
    const gardenBeds = [
        [W * 0.32, H * 0.575, 'wild',   0xFF6B9D], // 왼쪽 핑크 들꽃 군락
        [W * 0.58, H * 0.565, 'tulip',  0xFF6B6B], // 중앙 우측 빨간 튤립
        [W * 0.23, H * 0.585, 'cluster', 0xFFD93D], // 왼쪽 끝 노란 꽃 무리
        [W * 0.72, H * 0.580, 'tulip',  0xA29BFE], // 오른쪽 보라 튤립
        [W * 0.40, H * 0.570, 'wild',   0x4FC3F7]  // 중앙 좌측 파란 들꽃
    ];

    gardenBeds.forEach(([cx, cy, type, color]) => {
        if (type === 'wild') {
            // --- 1. 들꽃 (잎사귀가 있는 정교한 형태) ---
            for (let i = 0; i < 3; i++) { // 한 지점에 3송이씩
                const ox = cx + (i * 8 - 8);
                const oy = cy + (i % 2 * 4);
                // 줄기
                g.lineStyle(1.5, 0x4A8C3F, alpha).lineBetween(ox, oy, ox, oy + 5);
                // 꽃잎 5개
                g.fillStyle(color, alpha);
                for (let a = 0; a < 5; a++) {
                    const ang = (a / 5) * Math.PI * 2;
                    g.fillCircle(ox + Math.cos(ang) * 5, oy + Math.sin(ang) * 5, 4);
                }
                g.fillStyle(0xFFE66D, alpha); // 꽃술
                g.fillCircle(ox, oy, 2.5);
            }

        } else if (type === 'tulip') {
            // --- 2. 튤립 (확실하게 위로 솟은 형태) ---
            for (let i = 0; i < 2; i++) {
                const ox = cx + (i * 10 - 5);
                const oy = cy - 2;
                // 긴 줄기와 잎
                g.lineStyle(2, 0x38761D, alpha).lineBetween(ox, oy, ox, oy + 10);
                g.fillStyle(0x4A8C3F, alpha).fillEllipse(ox + 3, oy + 5, 6, 3);
                
                // 튤립 꽃봉오리 (포인트!)
                g.fillStyle(color, alpha);
                g.fillEllipse(ox, oy - 8, 9, 14); // 메인 몸통
                g.fillStyle(0x000000, 0.1); // 그림자 살짝
                g.fillTriangle(ox - 4, oy - 14, ox + 4, oy - 14, ox, oy - 5);
            }

        } else if (type === 'cluster') {
            // --- 3. 안개꽃/잔꽃 (바닥에 깔리는 풍성한 느낌) ---
            g.fillStyle(0x56B84A, alpha * 0.5); // 배경 풀떼기
            g.fillEllipse(cx, cy, 25, 10);
            for (let j = 0; j < 8; j++) {
                const rx = cx + (Math.random() - 0.5) * 20;
                const ry = cy + (Math.random() - 0.5) * 12;
                g.fillStyle(color, alpha);
                g.fillCircle(rx, ry, 2.5);
                g.fillStyle(0xFFFFFF, alpha * 0.8);
                g.fillCircle(rx, ry, 1);
            }
        }
    });
  }

  _drawFloatingTrash(p, W, H) {
    const g = this._natureLayer;
    g.fillStyle(CONFIG.COLORS.DIRTY, p * 0.5);
    [[80, H*0.65],[300, H*0.7],[420, H*0.67]].forEach(([x, y]) => g.fillEllipse(x, y, 28, 10));
  }

  /* ══════════════════════════════════════════════════════════
     ★ 건물: 타입별 독립 Graphics + setDepth(7)
     _refreshBuildings() 호출 시점:
       · create()  → 씬 처음 시작
       · _onWake() → 다른 씬에서 돌아왔을 때
     오염도 변화(_redrawScene)에는 호출하지 않으므로
     불필요한 재드로우 없이 항상 화면에 유지됩니다.
  ══════════════════════════════════════════════════════════ */
  _refreshBuildings(W, H) {
    /* 기존 건물 오브젝트 모두 제거 */
    Object.values(this._bldObjects).forEach(g => g?.destroy());
    this._bldObjects = {};

    const bc = gameState.buildingCounts;
    const iy = H * 0.58;

    /* 건물 정의 테이블
       id        : gameState.buildingCounts 키
       fn        : 드로잉 함수 (this._ 메서드)
       cx, by    : 중심X, 바닥Y
       depth     : z-index (기본 7, 필요 시 개별 조정)        */
    const BUILDING_DEFS = [
      { id: 'paper_garden',   fn: '_bldPaperGarden',   cx: W/2+20,  by: iy+16, depth: 8 },
      { id: 'paper_garden',   fn: '_bldPaperGarden',   cx: W/2-70,  by: iy-25, depth: 8 },
      { id: 'paper_garden',   fn: '_bldPaperGarden',   cx: W/2-30,  by: iy-30, depth: 7 },
      { id: 'eco_bench',      fn: '_bldEcoBench',      cx: W/2-88,  by: iy+12, depth: 7 },
      { id: 'water_purifier', fn: '_bldWaterPurifier', cx: W/2+110, by: iy+35, depth: 7 },
      { id: 'solar_lamp',     fn: '_bldSolarLamp',     cx: W/2-110, by: iy-14, depth: 7 },
      { id: 'greenhouse',     fn: '_bldGreenhouse',    cx: W/2+82,  by: iy-18, depth: 7 },
      { id: 'windmill',       fn: '_bldWindmill',      cx: W/2+148, by: iy-8,  depth: 7 },
      { id: 'eco_house',      fn: '_bldEcoHouse',      cx: W/2,     by: iy,    depth: 7 },
    ];

    BUILDING_DEFS.forEach(({ id, fn, cx, by, depth }) => {
      if ((bc[id] || 0) > 0) {
        const g = this.add.graphics().setDepth(depth);
        this[fn](g, cx, by);        // 드로잉 실행
        this._bldObjects[id] = g;   // 나중에 개별 접근 가능
      }
    });
  }

  /* ── 에코 하우스 (depth 7, 중앙) ── */
  _bldEcoHouse(g, cx, by) {
    g.fillStyle(0x7B6244, 1);
    g.fillRect(cx-24, by-4, 48, 6);
    g.fillStyle(0xEDD9A3, 1);
    g.fillRect(cx-22, by-30, 44, 28);
    g.fillStyle(0x27AE60, 1);
    g.fillTriangle(cx-28, by-30, cx+28, by-30, cx, by-58);
    g.fillStyle(0x1E8449, 0.5);
    g.fillTriangle(cx, by-58, cx+28, by-30, cx+10, by-30);
    g.fillStyle(0x8B6914, 1);
    g.fillRoundedRect(cx-7, by-17, 14, 17, 2);
    g.fillStyle(0x87CEEB, 0.85);
    g.fillRect(cx-19, by-27, 10, 10);
    g.lineStyle(1, 0x7B6244, 0.7);
    g.strokeRect(cx-19, by-27, 10, 10);
    g.fillStyle(0x87CEEB, 0.85);
    g.fillRect(cx+9, by-27, 10, 10);
    g.strokeRect(cx+9, by-27, 10, 10);
    g.fillStyle(0x886644, 1);
    g.fillRect(cx+10, by-60, 7, 18);
    g.fillStyle(0x4FC3F7, 0.75);
    g.fillRect(cx-16, by-48, 10, 6);
    g.fillRect(cx-4,  by-51, 10, 6);
    g.fillStyle(0xCCCCBB, 0.35);
    g.fillCircle(cx+14, by-66, 5);
    g.fillCircle(cx+16, by-74, 4);
    g.lineStyle(1.5, 0xB89A5A, 0.5);
    g.strokeRect(cx-22, by-30, 44, 28);
  }

  /* ── 태양광 가로등 ── */
  _bldSolarLamp(g, cx, by) {
    g.fillStyle(0x888899, 1);
    g.fillRect(cx-2, by-40, 4, 40);
    g.fillRect(cx-2, by-40, 18, 3);
    g.fillStyle(0x4FC3F7, 0.9);
    g.fillRect(cx-6, by-32, 13, 5);
    g.lineStyle(0.8, 0x1A5A7A, 0.6);
    g.lineBetween(cx+1, by-32, cx+1, by-27);
    g.fillStyle(0x555566, 1);
    g.fillRoundedRect(cx+10, by-46, 16, 10, 3);
    g.fillStyle(0xFFE66D, 0.9);
    g.fillCircle(cx+18, by-41, 5);
    g.fillStyle(0xFFE66D, 0.2);
    g.fillCircle(cx+18, by-41, 11);
    g.fillStyle(0xFFFF99, 0.12);
    g.fillCircle(cx+18, by-38, 16);
    g.fillStyle(0x666677, 1);
    g.fillRect(cx-5, by-3, 10, 5);
  }

  /* ── 재활용 풍차 ── */
  _bldWindmill(g, cx, by) {
    g.fillStyle(0x999988, 1);
    g.fillRoundedRect(cx-10, by-5, 20, 7, 2);
    g.fillStyle(0xCCCCBB, 1);
    g.fillTriangle(cx-8, by, cx+8, by, cx+3, by-50);
    g.fillStyle(0xDDDDCC, 1);
    g.fillTriangle(cx-8, by, cx-3, by-50, cx+3, by-50);
    g.fillStyle(0x888877, 1);
    g.fillRoundedRect(cx-5, by-55, 12, 8, 3);
    g.fillStyle(0x666666, 1);
    g.fillCircle(cx, by-51, 4);
    g.fillStyle(0xEEEEDD, 0.95);
    g.fillTriangle(cx, by-51, cx-4,  by-73, cx+2,  by-73);
    g.fillTriangle(cx, by-51, cx+18, by-36, cx+12, by-29);
    g.fillTriangle(cx, by-51, cx-18, by-30, cx-12, by-22);
    g.lineStyle(0.7, 0xAAAAAA, 0.5);
    g.strokeTriangle(cx, by-51, cx-4, by-73, cx+2, by-73);
  }

  /* ── 유리 온실 ── */
  _bldGreenhouse(g, cx, by) {
    g.fillStyle(0x333333, 1);
    g.fillRect(cx-24, by-4, 48, 6);
    g.fillStyle(0x87CEEB, 0.25);
    g.fillEllipse(cx, by-6, 44, 34);
    g.fillStyle(0xFFFFFF, 0.2);
    g.fillEllipse(cx-5, by-18, 15, 8);
    g.lineStyle(2.5, 0x2E5A27, 1);
    g.beginPath();
    g.arc(cx, by-5, 22, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(cx-22, by-5, cx+22, by-5);
    g.lineStyle(1, 0x2E5A27, 0.6);
    g.lineBetween(cx,    by-27, cx,    by-5);
    g.lineBetween(cx-11, by-24, cx-11, by-5);
    g.lineBetween(cx+11, by-24, cx+11, by-5);
    g.beginPath();
    g.arc(cx, by-5, 12, Math.PI, 0, false);
    g.strokePath();
    [0x4A8C3F, 0x38761D, 0x6AA84F].forEach((c, i) => {
      g.fillStyle(c, 0.8);
      g.fillCircle(cx-10+(i*8), by-8-(i%2*3), 7+(i%2));
    });
    g.fillStyle(0xFF6B9D, 1);
    g.fillCircle(cx-6, by-15, 4);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillCircle(cx-7, by-16, 1.5);
    g.fillStyle(0xFFD93D, 1);
    g.fillCircle(cx+8, by-17, 3.5);
    g.fillStyle(0xA29BFE, 1);
    g.fillCircle(cx+2, by-20, 3);
  }

  /* ── 정수 시설 ── */
  _bldWaterPurifier(g, cx, by) {
    g.fillStyle(0x2980B9, 0.9);
    g.fillRoundedRect(cx-11, by-34, 22, 34, 6);
    g.fillStyle(0x3498DB, 0.95);
    g.fillEllipse(cx, by-34, 22, 12);
    g.fillStyle(0xFFFFFF, 0.15);
    g.fillRoundedRect(cx-7, by-32, 6, 20, 3);
    g.fillStyle(0x777788, 1);
    g.fillRect(cx+9, by-22, 14, 3);
    g.fillRect(cx+20, by-22, 3, 10);
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillEllipse(cx, by-20, 7, 9);
    g.fillStyle(0x445566, 1);
    g.fillRect(cx-13, by-3, 26, 5);
    g.lineStyle(1.2, 0x1A5A8A, 0.7);
    g.strokeRoundedRect(cx-11, by-34, 22, 34, 6);
  }

  /* ── 업사이클 벤치 ── */
  _bldEcoBench(g, cx, by) {
    g.fillStyle(0x443322, 1);
    g.fillRect(cx-16, by-8, 4, 10);
    g.fillRect(cx+12, by-8, 4, 10);
    g.fillStyle(0x5D4037, 1);
    g.fillRect(cx-18, by-24, 2, 14);
    g.fillRect(cx+16, by-24, 2, 14);
    g.fillStyle(0xA1887F, 1);
    g.fillRoundedRect(cx-20, by-26, 40, 7, 3);
    g.fillStyle(0x8D6E63, 1);
    g.fillRoundedRect(cx-22, by-12, 44, 8, 2);
    [0x4FC3F7, 0xFF6B9D, 0xFFD93D, 0x81C784, 0xBA68C8].forEach((c, i) => {
      g.fillStyle(c, 0.9);
      g.fillRect(cx-19+(i*8), by-10, 6, 3);
      g.fillStyle(c, 0.6);
      g.fillCircle(cx-15+(i*7.5), by-22.5, 1.5);
    });
    g.fillStyle(0xFFFFFF, 0.15);
    g.fillRect(cx-20, by-26, 40, 1.5);
    g.fillRect(cx-22, by-12, 44, 1.5);
  }

  /* ── 종이 꽃밭 ── */
  _bldPaperGarden(g, cx, by) {
    const flowers = [
      { dx:  0,  stemH: 20, colors: [0xFF6B9D,0xFF9EBB,0xFFD93D,0xFF6B6B] },
      { dx: -14, stemH: 15, colors: [0x4FC3F7,0x87CEEB,0x9B59B6,0x4FC3F7] },
      { dx:  14, stemH: 18, colors: [0xFFD93D,0xFFE66D,0xFF6B9D,0xA5D6A7] },
    ];
    flowers.forEach(({ dx, stemH, colors: fc }) => {
      const fx = cx + dx;
      g.fillStyle(0x4A8C3F, 1);
      g.fillRect(fx-1, by-stemH, 2, stemH);
      g.fillStyle(0x56B84A, 0.8);
      g.fillEllipse(fx+5, by-stemH*0.5, 8, 5);
      fc.forEach((c, i) => {
        g.fillStyle(c, 0.95);
        const angle = (i/4)*Math.PI*2;
        g.fillCircle(fx+Math.cos(angle)*6, by-stemH+Math.sin(angle)*6, 5);
      });
      g.fillStyle(0xFFE66D, 1);
      g.fillCircle(fx, by-stemH, 4.5);
    });
    g.fillStyle(0x8B6914, 0.6);
    g.fillRoundedRect(cx-22, by-4, 44, 6, 3);
  }

  /* ══════════════════════════════════════════════════════════
     구름 (depth 1)
  ══════════════════════════════════════════════════════════ */
  _createAnimatedClouds(W, H) {
    const defs = [
      { x: W*0.22, baseY: H*0.070, scale: 1.05, speed: 0.22, baseAlpha: 0.18 },
      { x: W*0.62, baseY: H*0.130, scale: 0.72, speed: 0.14, baseAlpha: 0.14 },
      { x: W*1.05, baseY: H*0.050, scale: 1.30, speed: 0.18, baseAlpha: 0.20 },
      { x: W*0.82, baseY: H*0.195, scale: 0.60, speed: 0.10, baseAlpha: 0.12 },
    ];
    defs.forEach(def => {
      const g = this.add.graphics().setDepth(1);
      this._drawCloudShape(g, def.scale, def.baseAlpha);
      g.setPosition(def.x, def.baseY);
      this._cloudData.push({ gfx: g, ...def });
    });
  }

  _drawCloudShape(g, scale, alpha) {
    g.clear();
    const s = scale;
    g.fillStyle(0xFFFFFF, alpha);
    g.fillEllipse(   0,      0,   82*s, 27*s);
    g.fillEllipse(-25*s,   5*s,   52*s, 23*s);
    g.fillEllipse( 28*s,   6*s,   58*s, 25*s);
    g.fillEllipse( -8*s, -11*s,   46*s, 28*s);
    g.fillEllipse( 20*s,  -9*s,   38*s, 22*s);
  }

  /* ══════════════════════════════════════════════════════════
     갈매기 (depth 9)
  ══════════════════════════════════════════════════════════ */
  _createAnimatedSeagulls(W, H) {
    const defs = [
      { x: W*0.10, baseY: H*0.12, speed:0.52, bobSpeed:1.30, bobAmp:7, phase:0.0, scale:1.0 },
      { x: W*0.55, baseY: H*0.08, speed:0.36, bobSpeed:1.00, bobAmp:9, phase:2.1, scale:0.8 },
      { x: W*0.82, baseY: H*0.17, speed:0.62, bobSpeed:1.65, bobAmp:6, phase:4.2, scale:0.7 },
    ];
    defs.forEach(def => {
      const g = this.add.graphics().setDepth(9);
      this._drawSeagullShape(g, def.scale);
      g.setPosition(def.x, def.baseY);
      this._seagullData.push({ gfx: g, ...def });
    });
  }

  _drawSeagullShape(g, scale) {
    g.clear();
    const s = scale;
    g.lineStyle(1.6*s, 0xFFFFFF, 0.75);
    g.beginPath(); g.moveTo(0,0); g.lineTo(-10*s,-7*s); g.lineTo(-20*s,-2*s); g.strokePath();
    g.beginPath(); g.moveTo(0,0); g.lineTo( 10*s,-7*s); g.lineTo( 20*s,-2*s); g.strokePath();
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillCircle(0, 1*s, 1.8*s);
  }

  /* ══════════════════════════════════════════════════════════
     쓰레기 스폰 (depth 8, 오염도 비례)
  ══════════════════════════════════════════════════════════ */
  _spawnTrashItems() {
    const { WIDTH, HEIGHT } = CONFIG;
    const count = gameState.pollution <= 5
      ? 0 : Math.max(1, Math.round(gameState.pollution / 13));
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 200, () => this._spawnOneTrash(WIDTH, HEIGHT));
    }
  }

  _spawnOneTrash(W, H) {
    const x = Phaser.Math.Between(60, W-60);
    const y = Phaser.Math.Between(H*0.485, H*0.595);
    const item = createTrashItem();

    let sprite;
    try {
      sprite = this.add.image(x, y, `trash_${item.type}_${item.isDirty?'dirty':'clean'}`)
        .setScale(0.7).setInteractive({ useHandCursor: true }).setDepth(8);
    } catch (e) {
      sprite = this._makeFallbackSprite(x, y, item);
    }

    const floatTween = this.tweens.add({
      targets: sprite, y: y - Phaser.Math.Between(8, 18),
      duration: 1400 + Math.random()*800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const cfg = gameState.getDifficultyConfig();
   if (cfg.trashDecay) {
     this.time.delayedCall(25000, () => {
       if (!item.collected) {
         item.collected = true;
         floatTween.stop();
         if (emitter) emitter.destroy();
         this.tweens.add({
           targets: sprite, alpha:0, scaleX:0.1, scaleY:0.1,
           duration:400, onComplete: () => sprite.destroy(),
         });
         gameState.increasePollution(6);
         this._popupText(sprite.x, sprite.y - 20, '🚨 방치! 오염 +6', '#FF4444');
         this._refreshUI();
         this._checkDangerState();
         this._trashObjects = this._trashObjects.filter(o => o.item.id !== item.id);
       }
     });
   }


    let emitter = null;
    if (item.isDirty) {
      try {
        emitter = this.add.particles(x, y, 'particle', {
          lifespan:1200, speed:{min:8,max:22}, scale:{start:0.5,end:0},
          quantity:1, frequency:400, tint:0x334422, alpha:{start:0.7,end:0},
        });
        emitter.setDepth(8);
      } catch(e) {}
    }

    sprite.on('pointerdown', () => this._collectTrash(item, sprite, emitter, floatTween));
    sprite.on('pointerover', () => {
      this.tweens.add({ targets: sprite, scaleX:0.82, scaleY:0.82, duration:120 });
      this._showItemTooltip(sprite.x, sprite.y, item);
    });
    sprite.on('pointerout', () => {
      this.tweens.add({ targets: sprite, scaleX:0.7, scaleY:0.7, duration:120 });
      if (this._tooltip) this._tooltip.destroy();
    });
    this._trashObjects.push({ item, sprite, emitter, floatTween });
  }

  _makeFallbackSprite(x, y, item) {
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(item.isDirty ? CONFIG.COLORS.DIRTY : item.getColor(), 0.9);
    g.fillCircle(0,0,24);
    g.fillStyle(0xFFFFFF,1); g.fillCircle(-8,-5,5); g.fillCircle(8,-5,5);
    g.fillStyle(0x333333,1); g.fillCircle(-8,-5,2.5); g.fillCircle(8,-5,2.5);
    g.setPosition(x,y);
    g.setInteractive(new Phaser.Geom.Circle(0,0,24), Phaser.Geom.Circle.Contains);
    return g;
  }

  _showItemTooltip(x, y, item) {
    if (this._tooltip) this._tooltip.destroy();
    const label = `${item.getEmoji()} ${item.getKoreanName()}${item.isDirty?' (오염됨)':''}`;
    this._tooltip = this.add.text(x, y-55, label, {
      fontFamily:'Nunito', fontSize:'13px', color:'#FFFFFF',
      backgroundColor:'#1A3A2A', padding:{x:8,y:4},
    }).setOrigin(0.5).setDepth(50);
    this.time.delayedCall(2000, () => { if (this._tooltip) this._tooltip.destroy(); });
  }

  _collectTrash(item, sprite, emitter, floatTween) {
    if (item.collected) return;
    item.collected = true;
    floatTween.stop();
    if (emitter) emitter.destroy();
    this.tweens.add({
      targets: sprite, y: sprite.y-60, alpha:0, scaleX:0.3, scaleY:0.3,
      duration:500, ease:'Power2.easeIn', onComplete: () => sprite.destroy(),
    });
    gameState.inventory.push(item);
    if (item.isDirty) gameState.increasePollution(2);
    this._popupText(sprite.x, sprite.y-20, `+${item.getKoreanName()}!`, '#FFE66D');
    this._refreshUI();
    this._checkDangerState();
    this._trashObjects = this._trashObjects.filter(o => o.item.id !== item.id);
    const targetCount = Math.max(0, Math.floor(gameState.pollution / 22));
    if (this._trashObjects.length < targetCount) {
      this.time.delayedCall(1500, () => this._spawnOneTrash(CONFIG.WIDTH, CONFIG.HEIGHT));
    }
  }

  /* ══════════════════════════════════════════════════════════
     UI (depth 15+)
  ══════════════════════════════════════════════════════════ */
  _buildUI(W, H) {
    this._buildTopHUD(W);
    this._buildBottomPanel(W, H);
    this._buildPollutionBar(W, H);
  }

  /* ── 1. _buildTopHUD(W) ── 이 메서드 전체를 교체 ── */
_buildTopHUD(W) {
  /* ★ 배경 높이 122px */
  this.add.graphics().setDepth(15)
    .fillStyle(0x000000, 0.42)
    .fillRect(0, 0, W, 122);
 
  /* ─ 행 1 (y=10): 점수 | 콤보 | 에코/완화 ─ */
  this._scoreTxt = this.add.text(14, 10, `⭐ ${gameState.score}`, CONFIG.TEXT.SCORE)
    .setFontSize('26px').setDepth(16);                      // ★ 22→26px
 
  this._comboTxt = this.add.text(W / 2, 10, '', CONFIG.TEXT.COMBO)
    .setOrigin(0.5, 0).setFontSize('22px').setDepth(16);   // ★ 18→22px
 
  this._ecoTxt = this.add.text(W - 14, 10, '', {
    fontFamily: 'Jua', fontSize: '14px', color: '#FFE66D', // ★ 13→14px
  }).setOrigin(1, 0).setDepth(16);
 
  /* ─ 행 2 (y=44): 인벤토리 | 오염도 % ─ */
  this._invTxt = this.add.text(14, 44,
    '🎒 인벤토리 0개 | 🥤0 🍶0 🥫0 📄0',
    { ...CONFIG.TEXT.SMALL }
  ).setFontSize('15px').setDepth(16);                       // ★ 11→15px, y 34→44
 
  this._pollutionPctTxt = this.add.text(W - 14, 44, '🏭 100%', {
    fontFamily: 'Nunito', fontSize: '15px', color: '#FF8888', // ★ 11→15px
  }).setOrigin(1, 0).setDepth(16);
 
  /* 행 3: 오염도 바 → _buildPollutionBar 에서 y=66 에 생성 */
 
  /* ─ 행 4 (y=94): 패시브/시너지 텍스트 ─ */
  this._passiveTxt = this.add.text(W / 2, 94, '', {
    fontFamily: 'Nunito', fontSize: '12px', color: '#9FE7CC', // ★ 10→12px, y 74→94
    align: 'center',
  }).setOrigin(0.5, 0).setDepth(16);
 
  this._refreshTopHUD();
}

  /* ── 2. _buildPollutionBar(W, H) ── 이 메서드 전체를 교체 ── */
_buildPollutionBar(W, H) {
  /* ★ 두꺼워진 바: y=66, h=13 (기존 y=50, h=7) */
  const barX = 10, barY = 66, barW = W - 20, barH = 13;
 
  this._pollutionBarBg = this.add.graphics().setDepth(16);
  this._pollutionBarFg = this.add.graphics().setDepth(17);
 
  this._pollutionBarBg.fillStyle(0x2A3A2A, 0.9);
  this._pollutionBarBg.fillRoundedRect(barX, barY, barW, barH, 4);
 
  this._pollutionBarX = barX;
  this._pollutionBarY = barY;
  this._pollutionBarW = barW;
  this._pollutionBarH = barH;
  this._refreshPollutionBar();
}

  _refreshPollutionBar() {
    const p = Phaser.Math.Clamp(gameState.pollution / CONFIG.POLLUTION.MAX, 0, 1);
    this._pollutionBarFg.clear();
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0x00C896),
      Phaser.Display.Color.IntegerToColor(0xFF6B6B),
      CONFIG.POLLUTION.MAX, p * CONFIG.POLLUTION.MAX,
    );
    this._pollutionBarFg.fillStyle(Phaser.Display.Color.ObjectToColor(color).color, 1);
    const fillW = Math.max(0, this._pollutionBarW * p);
    if (fillW > 0) {
      this._pollutionBarFg.fillRoundedRect(
        this._pollutionBarX, this._pollutionBarY, fillW, this._pollutionBarH, 3,
      );
    }
  }

  _buildBottomPanel(W, H) {
    const panelH=220, panelY=H-panelH;
    const bg = this.add.graphics().setDepth(15);
    bg.fillStyle(CONFIG.COLORS.PANEL, 0.96);
    bg.fillRoundedRect(0, panelY, W, panelH, { tl:20, tr:20, bl:0, br:0 });
    bg.lineStyle(2, CONFIG.COLORS.MINT, 0.4);
    bg.strokeRoundedRect(0, panelY, W, panelH, { tl:20, tr:20, bl:0, br:0 });
    this._buildResourceDisplay(W, panelY+12);
    this._buildActionButtons(W, H, panelY+58);
    this.add.text(W/2, panelY+196, '🏁 게임 종료 및 결과 보기', {
      fontFamily:'Nunito', fontSize:'13px', color:'#55EE99', fontStyle:'bold',
    }).setOrigin(0.5).setDepth(16)
      .setInteractive({ useHandCursor:true })
      .on('pointerover', function() { this.setColor('#AAFFCC'); })
      .on('pointerout',  function() { this.setColor('#55EE99'); })
      .on('pointerdown', () => { gameState.save(); this.scene.start('EndingScene'); });
  }

  _buildResourceDisplay(W, startY) {
    const types = [
      {type:'plastic',emoji:'🥤',color:'#4FC3F7'},
      {type:'glass',  emoji:'🍶',color:'#80DEEA'},
      {type:'metal',  emoji:'🥫',color:'#B0BEC5'},
      {type:'paper',  emoji:'📄',color:'#FFCC80'},
    ];
    this._resourceTexts = {};
    const colW = W/4;
    types.forEach((t, i) => {
      const x = colW*i+colW/2;
      this.add.text(x, startY, t.emoji, {fontSize:'22px'}).setOrigin(0.5).setDepth(16);
      this._resourceTexts[t.type] = this.add.text(x, startY+28, String(gameState.resources[t.type]||0), {
        fontFamily:'Jua', fontSize:'18px', color:t.color,
      }).setOrigin(0.5).setDepth(16);
    });
  }

  _buildActionButtons(W, H, startY) {
    const buttons = [
      {label:'🧹 세척',  color:0x4FC3F7,             scene:'WashScene',  check:()=>gameState.inventory.some(i=>i.isDirty&&!i.washed)},
      {label:'♻️ 분류', color:0x00C896,             scene:'SortScene',  check:()=>gameState.inventory.some(i=>!i.isDirty||i.washed)},
      {label:'🔨 제작',  color:CONFIG.COLORS.YELLOW, scene:'CraftScene', check:()=>true},
      {label:'📚 도감',  color:CONFIG.COLORS.PURPLE, scene:'DexScene',   check:()=>true},
    ];
    const btnW=W/2-12, btnH=42;
    const positions=[[6,startY],[W/2+6,startY],[6,startY+50],[W/2+6,startY+50]];
    this._actionButtons=[];
    buttons.forEach((btn, i) => {
      const [bx,by]=positions[i];
      const cx=bx+btnW/2, cy=by+btnH/2;
      const bg  = this.add.graphics().setDepth(15);
      const txt = this.add.text(cx,cy,btn.label,{
        fontFamily:'Jua',fontSize:'16px',color:'#FFFFFF',stroke:'#1A3A2A',strokeThickness:3,
      }).setOrigin(0.5).setDepth(16);
      const zone=this.add.zone(cx,cy,btnW,btnH).setInteractive({useHandCursor:true}).setDepth(16);
      zone.on('pointerdown',()=>{
        if(!btn.check()){ this._popupText(cx,cy-30,'아이템이 없습니다!','#FF6B6B'); return; }
        this._drawActionButton(bg,btn,bx,by,btnW,btnH,true,0.94);
        this.tweens.add({targets:[txt],scaleX:0.94,scaleY:0.94,duration:80,yoyo:true,
          onComplete:()=>{ this._drawActionButton(bg,btn,bx,by,btnW,btnH,true,1); gameState.save(); this.scene.start(btn.scene); }});
      });
      this._actionButtons.push({bg,txt,zone,def:btn,bx,by,btnW,btnH});
    });
    this._refreshActionButtons();
  }

  _refreshActionButtons() {
    this._actionButtons.forEach(({bg,def,bx,by,btnW,btnH})=>
      this._drawActionButton(bg,def,bx,by,btnW,btnH,def.check(),1));
  }

  _drawActionButton(bg,def,bx,by,btnW,btnH,active,scale=1) {
    bg.clear();
    const cx=bx+btnW/2, cy=by+btnH/2, w=btnW*scale, h=btnH*scale, x=cx-w/2, y=cy-h/2;
    bg.fillStyle(0x000000,0.2); bg.fillRoundedRect(x+3,y+3,w,h,10);
    bg.fillStyle(def.color,active?1:0.35); bg.fillRoundedRect(x,y,w,h,10);
    bg.fillStyle(0xFFFFFF,active?0.18:0.05); bg.fillRoundedRect(x+3,y+3,Math.max(0,w-6),12,5);
  }

  /* ══════════════════════════════════════════════════════════
     UI 갱신
  ══════════════════════════════════════════════════════════ */
  _refreshUI() {
    this._refreshTopHUD();
    this._refreshResourceTexts();
    this._refreshPollutionBar();
    this._refreshActionButtons();
    this._redrawScene(); // 건물은 재드로우 안 함 ← 효율 향상
  }

  
/* ── 3. _refreshTopHUD() ── 이 메서드 전체를 교체 ── */
_refreshTopHUD() {
  const inv = { plastic: 0, glass: 0, metal: 0, paper: 0 };
  gameState.inventory.forEach(item => {
    if (Object.prototype.hasOwnProperty.call(inv, item.type)) inv[item.type]++;
  });
 
  this._scoreTxt.setText(`⭐ ${gameState.score}`);
  this._invTxt.setText(
    `🎒 인벤토리 ${gameState.inventory.length}개 | 🥤${inv.plastic} 🍶${inv.glass} 🥫${inv.metal} 📄${inv.paper}`
  );
  this._comboTxt.setText(gameState.combo > 1 ? `🔥 x${gameState.combo} 콤보!` : '');
 
  const mp = Math.round(gameState.getTotalPollutionMitigation() * 100);
  const pp = gameState.getPurificationPerTick().toFixed(1);
  if (gameState.ecoFeverMode && Date.now() < gameState.ecoFeverEndTime) {
    this._ecoTxt.setText(`🌟 ECO FEVER\n점수 2배`);
  } else {
    this._ecoTxt.setText(mp > 0 ? `🛡️ -${mp}%\n정화 ${pp}` : `정화 ${pp}`);
  }
 
  /* ★ 오염도 % 색상 */
  const pct = Math.round(gameState.pollution);
  const pc  = pct > 70 ? '#FF6B6B' : pct > 40 ? '#FFB74D' : '#88DD88';
  this._pollutionPctTxt.setText(`🏭 ${pct}%`).setColor(pc);
 
  /* 시너지 텍스트 */
  const syn = gameState.getActiveSynergyLabels();
  if (syn.length)  this._passiveTxt.setText(`활성 시너지: ${syn.join(' / ')}`);
  else if (mp > 0) this._passiveTxt.setText('활성 시너지 없음 · 건물 조합으로 추가 보너스를 얻으세요');
  else             this._passiveTxt.setText('제작으로 패시브를 활성화하세요 (오염 증가 완화/자동 자원 수급)');
}

  _refreshResourceTexts() {
    for(const [type,txt] of Object.entries(this._resourceTexts))
      txt.setText(String(gameState.resources[type]||0));
  }

  _popupText(x,y,msg,color='#FFFFFF') {
    const t=this.add.text(x,y,msg,{
      fontFamily:'Jua',fontSize:'18px',color,stroke:'#1A3A2A',strokeThickness:4,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:t,y:y-50,alpha:0,duration:900,ease:'Power2.easeOut',onComplete:()=>t.destroy()});
  }

  _checkWinCondition() {
    if(!this._stabilizedNotified&&gameState.isPollutionStabilized()){
      this._stabilizedNotified=true;
      this._popupText(CONFIG.WIDTH/2,CONFIG.HEIGHT/2,'🌍 안정화 달성! 이제 정화가 우세합니다','#FFE66D');
    }
  }

  /* ══════════════════════════════════════════════════════════
     update: 구름·갈매기 매 프레임 이동
  ══════════════════════════════════════════════════════════ */
  update(time, delta) {
    if(gameState.ecoFeverMode&&Date.now()>=gameState.ecoFeverEndTime){
      gameState.ecoFeverMode=false; this._ecoTxt?.setText('');
    }
    const W=CONFIG.WIDTH, H=CONFIG.HEIGHT, t=time/1000, dt=delta/16.67;
    const pol=gameState.pollution/100;
    const cloudAlpha=Math.max(0.07, 1-pol*0.65);
    const birdAlpha =Math.max(0,    1-pol*1.20);

    this._cloudData.forEach(d=>{
      d.x-=d.speed*dt;
      if(d.x<-200){ d.x=W+160; d.baseY=Phaser.Math.Between(H*0.03,H*0.22); d.gfx.setY(d.baseY); }
      d.gfx.setX(d.x); d.gfx.setAlpha(cloudAlpha);
    });

    this._seagullData.forEach(d=>{
      d.x+=d.speed*dt;
      if(d.x>W+80){ d.x=-80; d.baseY=Phaser.Math.Between(H*0.04,H*0.22); d.phase=Math.random()*Math.PI*2; }
      d.gfx.setPosition(d.x, d.baseY+Math.sin(t*d.bobSpeed+d.phase)*d.bobAmp);
      d.gfx.setAlpha(birdAlpha);
    });
  }

  /* ══════════════════════════════════════════════════════════
     타이머 콜백
  ══════════════════════════════════════════════════════════ */
  _onAutoResourceTick() {
    const gains=gameState.getAutoResourceTicks();
    if(!gains.length) return;
    const gc={plastic:0,glass:0,metal:0,paper:0};
    gains.forEach(type=>{ gameState.addResource(type,1); gc[type]++; });
    const labels=[gc.plastic?`🥤+${gc.plastic}`:'',gc.glass?`🍶+${gc.glass}`:'',
                  gc.metal?`🥫+${gc.metal}`:'',gc.paper?`📄+${gc.paper}`:''].filter(Boolean).join(' ');
    this._popupText(CONFIG.WIDTH/2,100,`⚙️ 자동 수급 ${labels}`,'#AAFFCC');
    this._refreshUI();
  }

    _onEnvironmentTick() {
      if (gameState.gameOver) return;
 
      /* ★ 난이도별 오염 증가량 */
      const cfg           = gameState.getDifficultyConfig();
      const baseIncrease  = gameState.isPollutionStabilized() ? 0 : cfg.pollutionPerTick;
      const before        = gameState.pollution;
 
      if (baseIncrease > 0) gameState.increasePollution(baseIncrease);
      gameState.reducePollution(gameState.getPurificationPerTick());
 
      /* ★ 위험 / 게임오버 체크 */
      this._checkDangerState();
 
      if (Math.abs(gameState.pollution - before) >= 0.4) {
        this._refreshUI();
        this._checkWinCondition();
      }
    }
  /* ── 위험 상태 종합 체크 ── */
_checkDangerState() {
  const p   = gameState.pollution;
  const cfg = gameState.getDifficultyConfig();
 
  /* 빨간 테두리 (위험 기준 이상) */
  this._updateDangerBorder(p);
 
  /* 경고 텍스트 표시 / 제거 */
  if (p >= CONFIG.POLLUTION.DANGER_THRESHOLD && !this._dangerWarnActive) {
    this._dangerWarnActive = true;
    this._showDangerWarning();
  } else if (p < CONFIG.POLLUTION.DANGER_THRESHOLD && this._dangerWarnActive) {
    this._dangerWarnActive = false;
    if (this._dangerWarnTxt) { this._dangerWarnTxt.destroy(); this._dangerWarnTxt = null; }
  }
 
  /* 게임오버 조건 */
  if (!cfg.gameOver) {
    if (this._gameOverCountdown) this._cancelGameOverCountdown();
    return;
  }

  if (gameState.shouldTriggerPollutionGameOver()) {
    this._triggerGameOver();
  } else if (p >= CONFIG.POLLUTION.COUNTDOWN_AT) {
    if (!this._gameOverCountdown) {
      if (cfg.gameOverGrace > 0) this._startGameOverCountdown(cfg.gameOverGrace);
      else this._triggerGameOver();
    }
  } else if (p < CONFIG.POLLUTION.COUNTDOWN_AT && this._gameOverCountdown) {
    /* 오염 낮아지면 카운트다운 취소 */
    this._cancelGameOverCountdown();
  }
}
 
/* ── 빨간 테두리 ── */
_updateDangerBorder(pollution) {
  const dangerRange = CONFIG.POLLUTION.GAMEOVER_AT - CONFIG.POLLUTION.DANGER_THRESHOLD;
  const ratio = Phaser.Math.Clamp((pollution - CONFIG.POLLUTION.DANGER_THRESHOLD) / dangerRange, 0, 1);
  this._dangerBorderGfx.clear();
  if (ratio <= 0) return;
 
  const W = CONFIG.WIDTH, H = CONFIG.HEIGHT, T = 22;
  const alpha = Math.min(0.65, ratio * 0.7);
  this._dangerBorderGfx.fillStyle(0xFF1111, alpha);
  this._dangerBorderGfx.fillRect(0,   0,   W,   T);       // 상단
  this._dangerBorderGfx.fillRect(0,   H-T, W,   T);       // 하단
  this._dangerBorderGfx.fillRect(0,   T,   T,   H-T*2);   // 좌
  this._dangerBorderGfx.fillRect(W-T, T,   T,   H-T*2);   // 우
}
 
/* ── 위험 경고 텍스트 ── */
_showDangerWarning() {
  if (this._dangerWarnTxt) return;
  const cfg = gameState.getDifficultyConfig();
  const msg = cfg.gameOver ? '⚠️ 위험! 오염도가 한계에 가까워졌습니다!' : '⚠️ 오염도가 위험 수준입니다!';
 
  this._dangerWarnTxt = this.add.text(CONFIG.WIDTH / 2, 108, msg, {
    fontFamily: 'Jua', fontSize: '15px', color: '#FF4444',
    stroke: '#1A0000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(18);
 
  /* 깜빡임 */
  this.tweens.add({
    targets:  this._dangerWarnTxt,
    alpha:    0.2,
    duration: 500,
    yoyo:     true,
    repeat:   -1,
  });
}
 
/* ── 게임오버 카운트다운 ── */
_startGameOverCountdown(graceMs) {
  const secs = Math.ceil(graceMs / 1000);
  let   remaining = secs;
 
  /* 대형 카운트다운 텍스트 */
  this._gameOverCountTxt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.45, '', {
    fontFamily: 'Jua', fontSize: '72px', color: '#FF2222',
    stroke: '#1A0000', strokeThickness: 6,
  }).setOrigin(0.5).setDepth(60).setAlpha(0);
 
  this.tweens.add({ targets: this._gameOverCountTxt, alpha: 1, duration: 300 });
 
  const updateTxt = () => {
    if (!this._gameOverCountTxt) return;
    this._gameOverCountTxt.setText(`${remaining}`);
    this.tweens.add({
      targets: this._gameOverCountTxt,
      scaleX: 1.3, scaleY: 1.3,
      duration: 200, yoyo: true, ease: 'Back.easeOut',
    });
    this.cameras.main.shake(120, 0.006);
  };
  updateTxt();
 
  /* 1초 간격 카운트 */
  this._gameOverCountdown = this.time.addEvent({
    delay: 1000,
    repeat: secs - 1,
    callback: () => {
      remaining--;
      if (remaining > 0) {
        updateTxt();
      } else {
        this._triggerGameOver();
      }
    },
  });
 
  /* 안내 텍스트 */
  this._gameOverLabelTxt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.55, '오염도 140% 이상 — 150% 도달 시 침몰합니다!', {
    fontFamily: 'Nunito', fontSize: '15px', color: '#FF8888',
    stroke: '#1A0000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(60);
  this.tweens.add({
    targets: this._gameOverLabelTxt, alpha: 0.3,
    duration: 600, yoyo: true, repeat: -1,
  });
}
 
/* ── 카운트다운 취소 ── */
_cancelGameOverCountdown() {
  if (this._gameOverCountdown) {
    this._gameOverCountdown.remove();
    this._gameOverCountdown = null;
  }
  if (this._gameOverCountTxt)  { this._gameOverCountTxt.destroy();  this._gameOverCountTxt  = null; }
  if (this._gameOverLabelTxt)  { this._gameOverLabelTxt.destroy();  this._gameOverLabelTxt  = null; }
}
 
/* ── 게임오버 강제 전환 ── */
_triggerGameOver() {
  if (gameState.gameOver) return;
  gameState.gameOver = true;
 
  /* 화면 암전 */
  this.cameras.main.fadeOut(800, 80, 0, 0);
  this.time.delayedCall(800, () => {
    gameState.save();
    this.scene.start('EndingScene');
  });
}
}
