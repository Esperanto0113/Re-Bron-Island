/* ============================================================
   BootScene.js - 부트/로딩 씬
   게임에 필요한 텍스처를 프로그래밍 방식으로 생성합니다.
   (외부 이미지 없이 Canvas 그래픽으로 대체)
   ============================================================ */

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /* ──────────────────────────────────────
     create(): 텍스처 생성 후 MenuScene 전환
  ────────────────────────────────────── */
  create() {
    const { WIDTH, HEIGHT } = CONFIG;

    // 로딩 텍스트
    const loadText = this.add.text(WIDTH / 2, HEIGHT / 2, '🌿 생성 중...', {
      ...CONFIG.TEXT.HEAD, fontSize: '22px', color: '#AAFFCC',
    }).setOrigin(0.5);

    // 텍스처 생성 (비동기처럼 보이지만 실제로는 동기)
    this._generateAllTextures();

    // 짧은 딜레이 후 메뉴로 이동 (로딩 화면 연출)
    this.time.delayedCall(800, () => {
      this.scene.start('MenuScene');
    });
  }

  /* ──────────────────────────────────────
     모든 게임 텍스처 생성
  ────────────────────────────────────── */
  _generateAllTextures() {
    this._makeParticleTexture();   // 파티클용 흰 점
    this._makeTrashTextures();     // 쓰레기 아이템 (clean / dirty)
    this._makeBinTextures();       // 분리수거함
    this._makeIslandElements();    // 섬 구성 요소 (나무, 꽃 등)
  }

  /* 파티클 텍스처 (8×8 흰 원) */
  _makeParticleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  /* 쓰레기 타입별 텍스처 생성 */
  _makeTrashTextures() {
    CONFIG.TRASH_TYPES.forEach(type => {
      // 깨끗한 버전
      this._drawTrashToTexture(type, false, `trash_${type}_clean`);
      // 오염된 버전
      this._drawTrashToTexture(type, true,  `trash_${type}_dirty`);
    });
  }

  /**
   * 쓰레기 아이템 텍스처 그리기 핵심 함수
   * 캔버스 (0,0) ~ (64,84) 영역에 귀여운 쓰레기 캐릭터를 그립니다.
   */
  _drawTrashToTexture(type, isDirty, key) {
    const w = 64, h = 84;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 기본 몸통 색
    const bodyColor = isDirty ? CONFIG.COLORS.DIRTY : this._typeColor(type);
    const lineColor = isDirty ? 0x222211 : 0x334433;

    g.lineStyle(2.5, lineColor, 1);
    g.fillStyle(bodyColor, isDirty ? 0.85 : 1);

    /* 타입별 몸통 모양 */
    switch (type) {
      case 'plastic':
        // 물병 모양
        g.fillRoundedRect(20, 20, 24, 50, 6);
        g.fillStyle(isDirty ? 0x333322 : 0x7DD8F8, 0.9);
        g.fillRoundedRect(24, 12, 16, 16, 4);
        g.strokeRoundedRect(20, 20, 24, 50, 6);
        break;
      case 'glass':
        // 유리병 (더 넓고 투명)
        g.fillStyle(bodyColor, 0.7);
        g.fillRoundedRect(14, 24, 36, 46, 10);
        g.fillStyle(isDirty ? 0x334433 : 0x90ECD8, 0.6);
        g.fillRoundedRect(22, 14, 20, 18, 5);
        g.strokeRoundedRect(14, 24, 36, 46, 10);
        break;
      case 'metal':
        // 캔 (실린더)
        g.fillRoundedRect(16, 14, 32, 56, 4);
        g.fillStyle(isDirty ? 0x444444 : 0xD0D0D0, 0.8);
        g.fillRect(16, 14, 32, 8);
        g.fillRect(16, 62, 32, 8);
        g.strokeRoundedRect(16, 14, 32, 56, 4);
        break;
      case 'paper':
        // 종이 묶음
        g.fillRoundedRect(12, 16, 40, 52, 3);
        // 줄 효과
        g.fillStyle(isDirty ? 0x334422 : 0xEECC88, 0.5);
        for (let i = 0; i < 4; i++) {
          g.fillRect(18, 28 + i * 10, 28, 2);
        }
        g.strokeRoundedRect(12, 16, 40, 52, 3);
        break;
    }

    /* 귀여운 얼굴 */
    const eyeY = 42;
    // 흰 눈 배경
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(22, eyeY, 7);
    g.fillCircle(42, eyeY, 7);
    // 검은 눈동자
    g.fillStyle(isDirty ? 0x221100 : 0x223322, 1);
    g.fillCircle(isDirty ? 21 : 23, eyeY, 3.5); // 더티면 시선 다름
    g.fillCircle(isDirty ? 41 : 43, eyeY, 3.5);
    // 하이라이트
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(isDirty ? 20 : 24, eyeY - 1, 1.2);
    g.fillCircle(isDirty ? 40 : 44, eyeY - 1, 1.2);

    // 입
    g.lineStyle(2, isDirty ? 0x221100 : 0x223322, 1);
    if (isDirty) {
      // 슬픈 표정 :(
      g.beginPath();
      g.arc(32, 58, 7, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
    } else {
      // 웃는 표정 :)
      g.beginPath();
      g.arc(32, 54, 7, 0, Math.PI, false);
      g.strokePath();
    }

    /* 오염 파티클 효과 */
    if (isDirty) {
      g.fillStyle(0x334422, 0.6);
      g.fillCircle(8, 16, 5);
      g.fillCircle(56, 20, 4);
      g.fillCircle(6, 56, 6);
      g.fillCircle(58, 60, 4);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* 분리수거함 텍스처 */
  _makeBinTextures() {
    BIN_DEFS.forEach(bin => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 90, h = 110;

      // 통 몸통
      g.fillStyle(bin.color, 1);
      g.fillRoundedRect(5, 20, 80, 85, 8);
      // 뚜껑
      g.fillStyle(Phaser.Display.Color.IntegerToColor(bin.color).lighten(20).color, 1);
      g.fillRoundedRect(0, 10, 90, 20, 5);
      // 테두리
      g.lineStyle(2.5, 0x223322, 1);
      g.strokeRoundedRect(5, 20, 80, 85, 8);
      g.strokeRoundedRect(0, 10, 90, 20, 5);

      // 재활용 마크
      g.fillStyle(0xFFFFFF, 0.8);
      g.fillCircle(45, 70, 18);
      g.fillStyle(bin.color, 1);
      g.fillCircle(45, 70, 12);
      g.fillStyle(0xFFFFFF, 1);

      g.generateTexture(`bin_${bin.type}`, w, h);
      g.destroy();
    });
  }

  /* 섬 구성 요소 텍스처 (나무, 꽃, 풍차) */
  _makeIslandElements() {
    // 나무 (깨끗)
    this._makeTree('tree_clean', 0x4A8C3F, 0x7BC67E);
    // 나무 (오염)
    this._makeTree('tree_dirty', 0x445544, 0x556655);
    // 꽃
    this._makeFlower();
    // 작은 돌
    this._makeRock();
  }

  _makeTree(key, trunkC, leafC) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // 나무 기둥
    g.fillStyle(0x8B6914, 1);
    g.fillRect(22, 50, 16, 40);
    // 잎
    g.fillStyle(leafC, 1);
    g.fillTriangle(30, 0, 5, 55, 55, 55);
    g.fillStyle(trunkC, 1);
    g.fillTriangle(30, 10, 8, 60, 52, 60);
    g.generateTexture(key, 60, 90);
    g.destroy();
  }

  _makeFlower() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const colors = [0xFF6B9D, 0xFFD93D, 0x6BCB77, 0x4FC3F7];
    // 꽃잎
    colors.forEach((c, i) => {
      g.fillStyle(c, 1);
      const angle = (i / 4) * Math.PI * 2;
      g.fillCircle(20 + Math.cos(angle) * 8, 20 + Math.sin(angle) * 8, 7);
    });
    // 꽃 중심
    g.fillStyle(0xFFE66D, 1);
    g.fillCircle(20, 20, 6);
    // 줄기
    g.fillStyle(0x4A8C3F, 1);
    g.fillRect(18, 24, 4, 16);
    g.generateTexture('flower', 40, 40);
    g.destroy();
  }

  _makeRock() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x889988, 1);
    g.fillEllipse(20, 18, 36, 28);
    g.fillStyle(0xAABBAA, 0.5);
    g.fillEllipse(15, 12, 16, 10);
    g.generateTexture('rock', 40, 36);
    g.destroy();
  }

  /* 타입 → 색상 */
  _typeColor(type) {
    return {
      plastic: CONFIG.COLORS.PLASTIC,
      glass:   CONFIG.COLORS.GLASS,
      metal:   CONFIG.COLORS.METAL,
      paper:   CONFIG.COLORS.PAPER,
    }[type] || 0xCCCCCC;
  }
}
