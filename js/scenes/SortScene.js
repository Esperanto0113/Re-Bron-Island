/* ============================================================
   SortScene.js - 분류 미니게임 씬
   떨어지는 쓰레기를 올바른 분리수거함에 드래그하거나 탭
   콤보 시스템 + Eco Fever 모드
   ============================================================ */

class SortScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SortScene' });
  }

  init() {
    // 인벤토리에서 분류 가능한 아이템 (세척된 것 포함, 처음부터 깨끗한 것)
    this._sortableItems = gameState.inventory.filter(i => !i.isDirty || i.washed);
    this._totalItems    = Math.max(this._sortableItems.length, CONFIG.SORT.TOTAL_ITEMS);
    this._sortedCount   = 0;
    this._wrongCount    = 0;
    this._sessionScore  = 0;
    this._currentItem   = null;
    this._fallingSprite = null;
    this._isSpawning    = false;
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;

    if (this._sortableItems.length === 0 && gameState.inventory.length === 0) {
      this._showMessage('분류할 아이템이 없습니다!\n먼저 쓰레기를 수거하세요 🎒', () => this.scene.start('IslandScene'));
      return;
    }

    this._drawBackground(WIDTH, HEIGHT);
    this._buildBins(WIDTH, HEIGHT);
    this._buildHUD(WIDTH, HEIGHT);
    this._spawnNextItem();
  }

  /* ─── 배경 ─── */
  _drawBackground(W, H) {
    const g = this.add.graphics();
    // 민트 그라디언트 배경
    g.fillStyle(0x0A2A1A, 1);
    g.fillRect(0, 0, W, H);

    // 격자 무늬
    g.lineStyle(1, 0x1A4A2A, 0.3);
    for (let x = 0; x < W; x += 40) g.lineTo(x, 0), g.lineTo(x, H);
    for (let y = 0; y < H; y += 40) g.moveTo(0, y), g.lineTo(W, y);
    g.strokePath();
  }

  /* ─── 분리수거함 (하단) ─── */
  _buildBins(W, H) {
    const binY   = H - 95;
    const binW   = (W - 20) / 4;
    this._bins   = [];
    // 낙하 실패 기준선: 수거함 버튼보다 살짝 위
    this._failLineY = binY - 28;

    BIN_DEFS.forEach((def, i) => {
      const bx = 10 + i * binW + binW / 2;

      // 수거함 그래픽
      const bg = this.add.graphics();
      this._drawBinGraphic(bg, bx, binY, binW - 8, 85, def.color, def.emoji);

      // 라벨
      this.add.text(bx, binY + 55, def.label, {
        fontFamily: 'Nunito', fontSize: '11px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 히트 영역
      const zone = this.add.zone(bx, binY, binW - 8, 85).setInteractive({ useHandCursor: true });

      zone.on('pointerdown', () => {
        this._trySort(def.type, bx, binY);
      });

      // 호버 강조
      zone.on('pointerover', () => {
        bg.clear();
        this._drawBinGraphic(bg, bx, binY, binW - 8, 85, def.color, def.emoji, true);
      });
      zone.on('pointerout', () => {
        bg.clear();
        this._drawBinGraphic(bg, bx, binY, binW - 8, 85, def.color, def.emoji, false);
      });

      this._bins.push({ def, bg, zone, bx, binY });
    });
  }

  _drawBinGraphic(g, cx, cy, w, h, color, emoji, hovered = false) {
    const alpha = hovered ? 1 : 0.85;

    // 그림자
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(cx - w/2 + 3, cy - h/2 + 3, w, h, 8);

    // 통 본체
    g.fillStyle(color, alpha);
    g.fillRoundedRect(cx - w/2, cy - h/2, w, h, 8);

    // 상단 하이라이트
    g.fillStyle(0xFFFFFF, 0.2);
    g.fillRoundedRect(cx - w/2 + 3, cy - h/2 + 3, w - 6, 12, 5);

    // 테두리
    g.lineStyle(hovered ? 3 : 1.5, 0xFFFFFF, hovered ? 0.8 : 0.3);
    g.strokeRoundedRect(cx - w/2, cy - h/2, w, h, 8);

    // 이모지 (Text 오브젝트 대신 간단히 표시)
    // 이모지는 별도 Text로 추가됨
  }

  /* ─── HUD (상단 UI) ─── */
  _buildHUD(W, H) {
    // 상단 패널
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRect(0, 0, W, 72);

    // 점수
    this._scoreTxt = this.add.text(12, 10, `⭐ ${gameState.score}`, CONFIG.TEXT.SCORE).setFontSize('20px');

    // 콤보
    this._comboTxt = this.add.text(W / 2, 10, '', CONFIG.TEXT.COMBO).setOrigin(0.5, 0).setFontSize('17px');

    // 진행도
    this._progressTxt = this.add.text(W - 12, 10, '', {
      fontFamily: 'Nunito', fontSize: '14px', color: '#AAFFCC',
    }).setOrigin(1, 0);

    // 에코 피버 배너
    this._feverBanner = this.add.text(W / 2, 44, '', {
      fontFamily: 'Jua', fontSize: '16px', color: '#FFE66D',
      stroke: '#1A3A2A', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    // 타이틀
    this.add.text(W / 2, 46, '♻️ 올바른 수거함에 넣으세요!', {
      fontFamily: 'Nunito', fontSize: '13px', color: '#88DDAA',
    }).setOrigin(0.5);

    // 뒤로가기
    this.add.text(W - 16, H - 22, '→ 돌아가기', {
      fontFamily: 'Nunito', fontSize: '13px', color: '#556655', fontStyle: 'bold',
    }).setOrigin(1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this._finishSession();
      });

    this._updateHUD();
  }

  _updateHUD() {
    this._scoreTxt.setText(`⭐ ${gameState.score}`);

    if (gameState.combo > 1) {
      this._comboTxt.setText(`🔥 x${gameState.combo} 콤보!`);
    } else {
      this._comboTxt.setText('');
    }

    this._progressTxt.setText(`${this._sortedCount + this._wrongCount}/${this._totalItems}`);

    if (gameState.ecoFeverMode && Date.now() < gameState.ecoFeverEndTime) {
      this._feverBanner.setText('🌟 ECO FEVER MODE! 점수 2배!').setAlpha(1);
    } else {
      this._feverBanner.setAlpha(0);
    }
  }

  /* ─── 아이템 스폰 (위에서 떨어짐) ─── */
  _spawnNextItem() {
    if (this._isSpawning) return;

    // 모든 아이템 처리 완료
    const total = this._sortedCount + this._wrongCount;
    if (total >= this._totalItems || (this._sortableItems.length === 0 && total >= this._sortableItems.length)) {
      this._finishSession();
      return;
    }

    this._isSpawning = true;

    // 아이템 선택 (인벤토리 우선, 없으면 랜덤)
    let item;
    if (this._sortableItems.length > 0) {
      item = this._sortableItems.shift();
    } else {
      item = createTrashItem();
      item.isDirty = false;
    }

    this._currentItem = item;

    const W = CONFIG.WIDTH;
    const startX = Phaser.Math.Between(60, W - 60);
    const startY = -60;

    // 스프라이트 생성
    try {
      this._fallingSprite = this.add.image(startX, startY, `trash_${item.type}_clean`).setScale(0.85);
    } catch (e) {
      this._fallingSprite = this._makeCircleSprite(startX, startY, item);
    }

    // 아이템 타입 표시 텍스트
    if (this._typeTxt) this._typeTxt.destroy();
    this._typeTxt = this.add.text(startX, startY - 30, item.getKoreanName(), {
      fontFamily: 'Jua', fontSize: '15px', color: '#FFFFFF',
      stroke: '#1A3A2A', strokeThickness: 3,
    }).setOrigin(0.5);

    // 낙하 애니메이션
    const failY = this._failLineY ?? (CONFIG.HEIGHT * 0.56);
    this.tweens.add({
      targets: [this._fallingSprite, this._typeTxt],
      y: failY,
      duration: CONFIG.SORT.FALL_SPEED * 10,
      ease: 'Linear',
      onUpdate: () => {
        // 타입 라벨을 스프라이트 위에 고정
        if (this._typeTxt && this._fallingSprite) {
          this._typeTxt.setPosition(this._fallingSprite.x, this._fallingSprite.y - 44);
        }
      },
      onComplete: () => {
        // 바닥 도달 → 오답 처리
        this._onWrong(this._currentItem, this._fallingSprite.x, failY);
      },
    });

    // 드래그 가능하게 설정
    this._fallingSprite.setInteractive({ useHandCursor: true });
    this.input.setDraggable(this._fallingSprite);

    this._fallingSprite.on('drag', (pointer, x, y) => {
      this._fallingSprite.setPosition(x, y);
      if (this._typeTxt) this._typeTxt.setPosition(x, y - 44);
      // 낙하 트윈 일시 정지 느낌 (실제로는 계속 실행되므로 위치 덮어씌우기)
    });

    this._fallingSprite.on('dragend', (pointer) => {
      // 어느 수거함 위에 놨는지 확인
      const dropX = pointer.x;
      const dropY = pointer.y;
      const bin = this._getBinAtPosition(dropX, dropY);
      if (bin) {
        this._trySort(bin.def.type, bin.bx, bin.binY, true);
      }
    });

    this.time.delayedCall(200, () => { this._isSpawning = false; });
  }

  _makeCircleSprite(x, y, item) {
    const g = this.add.graphics();
    g.fillStyle(item.getColor(), 1);
    g.fillCircle(0, 0, 32);
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(-10, -5, 6); g.fillCircle(10, -5, 6);
    g.fillStyle(0x333333, 1);
    g.fillCircle(-10, -5, 3); g.fillCircle(10, -5, 3);
    g.setPosition(x, y);
    g.setInteractive(new Phaser.Geom.Circle(0, 0, 32), Phaser.Geom.Circle.Contains);
    return g;
  }

  _getBinAtPosition(x, y) {
    const binBottom = CONFIG.HEIGHT - 52;
    const binTop    = binBottom - 90;
    if (y < binTop || y > binBottom) return null;

    return this._bins.find(b => Math.abs(b.bx - x) < 55);
  }

  /* ─── 분류 시도 ─── */
  _trySort(binType, binX, binY, fromDrag = false) {
    if (!this._currentItem) return;

    const item    = this._currentItem;
    const correct = (item.type === binType);

    // 낙하 트윈 정지
    this.tweens.killTweensOf(this._fallingSprite);
    this.tweens.killTweensOf(this._typeTxt);

    if (correct) {
      this._onCorrect(item, binX, binY);
    } else {
      this._onWrong(item, this._fallingSprite ? this._fallingSprite.x : CONFIG.WIDTH / 2, this._fallingSprite ? this._fallingSprite.y : 300);
    }
  }

  _onCorrect(item, binX, binY) {
    // 자원에 추가
    gameState.addResource(item.type);
    gameState.addScore(CONFIG.SCORE.SORT_CORRECT);
    gameState.increaseCombo();
    this._sortedCount++;

    // 수거함으로 날아가는 애니메이션
    const currentSprite = this._fallingSprite;
    if (currentSprite) {
      this.tweens.add({
        targets: currentSprite,
        x: binX, y: binY,
        scaleX: 0.1, scaleY: 0.1,
        alpha: 0,
        duration: 350, ease: 'Power2.easeIn',
        onComplete: () => currentSprite.destroy(),
      });
    }
    if (this._typeTxt) { this._typeTxt.destroy(); this._typeTxt = null; }

    // 녹색 파티클
    try {
      const p = this.add.particles(binX, binY - 20, 'particle', {
        lifespan: 600, speed: { min: 50, max: 120 },
        scale: { start: 0.8, end: 0 }, quantity: 10,
        tint: [0x00C896, 0xFFE66D, 0x4FC3F7],
      });
      this.time.delayedCall(300, () => p.destroy());
    } catch (e) {}

    // 정답 텍스트
    this._popupText(binX, binY - 50, '✅ 정답!', '#00FFB4');

    // 콤보 표시
    if (gameState.combo > 1) {
      this._popupText(CONFIG.WIDTH / 2, 120, `🔥 ${gameState.combo}콤보!`, '#FF6B6B', 24);
    }

    this._currentItem  = null;
    this._fallingSprite = null;
    this._updateHUD();

    // 다음 아이템
    this.time.delayedCall(CONFIG.SORT.SPAWN_DELAY * 0.5, () => {
      this._spawnNextItem();
    });
  }

  _onWrong(item, x, y) {
    gameState.addScore(CONFIG.SCORE.SORT_WRONG);
    gameState.increasePollution(3);
    gameState.resetCombo();
    this._wrongCount++;
    if (gameState.shouldTriggerPollutionGameOver()) {
      gameState.gameOver = true;
      gameState.save();
      this.scene.start('EndingScene');
      return;
    }

    // 화면 흔들기
    this.cameras.main.shake(350, 0.01);

    const failedSprite = this._fallingSprite;
    if (failedSprite) {
      // 아이템을 제자리에서 흔들다 사라짐
      this.tweens.add({
        targets: failedSprite,
        x: failedSprite.x + 15,
        duration: 60, yoyo: true, repeat: 4,
        onComplete: () => failedSprite.destroy(),
      });
    }
    if (this._typeTxt) { this._typeTxt.destroy(); this._typeTxt = null; }

    // 오답 텍스트
    this._popupText(x, y - 40, '❌ 오답!', '#FF6B6B');

    // 올바른 정답 힌트
    this._popupText(CONFIG.WIDTH / 2, 120,
      `💡 ${item.getKoreanName()}은 ${this._correctBinLabel(item.type)}에!`, '#FFE66D', 14);

    this._currentItem   = null;
    this._fallingSprite  = null;
    this._updateHUD();

    this.time.delayedCall(CONFIG.SORT.SPAWN_DELAY, () => {
      this._spawnNextItem();
    });
  }

  _correctBinLabel(type) {
    return BIN_DEFS.find(b => b.type === type)?.label || type;
  }

  /* ─── 세션 종료 ─── */
  _finishSession() {
    // 남은 아이템들 자원으로 이동 (분류 안 된 것)
    // (실제로는 sortable에서 꺼낸 것들은 인벤토리에서 제거해야 함)
    const removedIds = new Set(gameState.inventory
      .filter(i => !i.isDirty || i.washed)
      .map(i => i.id));
    gameState.inventory = gameState.inventory.filter(i => !removedIds.has(i.id));

    const msg = `분류 완료!\n✅ 정답: ${this._sortedCount}개\n❌ 오답: ${this._wrongCount}개\n\n💚 자원이 저장됐어요!`;
    this._showMessage(msg, () => {
      gameState.save();
      this.scene.start('IslandScene');
    });
  }

  /* ─── 팝업 텍스트 ─── */
  _popupText(x, y, msg, color = '#FFFFFF', size = 18) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Jua', fontSize: `${size}px`, color,
      stroke: '#1A3A2A', strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t, y: y - 45, alpha: 0,
      duration: 900, ease: 'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showMessage(msg, onClose) {
    const { WIDTH, HEIGHT } = CONFIG;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);

    const panel = this.add.graphics();
    panel.fillStyle(CONFIG.COLORS.PANEL, 1);
    panel.fillRoundedRect(24, HEIGHT * 0.28, WIDTH - 48, 300, 20);
    panel.lineStyle(2, CONFIG.COLORS.MINT, 0.5);
    panel.strokeRoundedRect(24, HEIGHT * 0.28, WIDTH - 48, 300, 20);

    this.add.text(WIDTH / 2, HEIGHT * 0.44, msg, {
      fontFamily: 'Jua', fontSize: '20px', color: '#AAFFCC',
      align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const zone = this.add.zone(WIDTH / 2, HEIGHT * 0.62, WIDTH - 80, 52).setInteractive({ useHandCursor: true });
    const btnBg = this.add.graphics();
    btnBg.fillStyle(CONFIG.COLORS.MINT, 1);
    btnBg.fillRoundedRect(50, HEIGHT * 0.59, WIDTH - 100, 52, 12);
    this.add.text(WIDTH / 2, HEIGHT * 0.616, '섬으로 돌아가기 🌿', {
      fontFamily: 'Jua', fontSize: '19px', color: '#FFFFFF',
    }).setOrigin(0.5);

    zone.on('pointerdown', onClose);
  }

  update() {
    // 에코 피버 만료 체크
    if (gameState.ecoFeverMode && Date.now() >= gameState.ecoFeverEndTime) {
      gameState.ecoFeverMode = false;
    }
  }
}
