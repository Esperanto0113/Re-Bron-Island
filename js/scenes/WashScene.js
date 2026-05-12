/* ============================================================
   WashScene.js - 세척 미니게임 씬
   오염된 아이템을 클릭 연타로 세척하는 미니게임
   원형 게이지 + 타이머, 성공/실패 피드백
   ============================================================ */

class WashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WashScene' });
  }

  /* ─── 씬 초기화 ─── */
  init() {
    // 세척해야 할 더티 아이템만 뽑기
    this._dirtyItems = gameState.inventory.filter(i => i.isDirty && !i.washed);
    this._currentIdx = 0;
    this._gauge      = 0;   // 0 ~ 100
    this._timeLeft   = CONFIG.WASH.TIME_LIMIT; // ms
    this._isRunning  = false;
    this._isDone     = false;
    this._results    = [];   // { item, success }
    this._successParticles = null;
    this._comboPopup = null;
    this._successCleanupTimer = null;
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;

    // 더티 아이템 없으면 바로 복귀
    if (this._dirtyItems.length === 0) {
      this._showMessage('세척할 아이템이 없어요! 🤔', () => this.scene.start('IslandScene'));
      return;
    }

    this._drawBackground(WIDTH, HEIGHT);
    this._buildUI(WIDTH, HEIGHT);
    this._startCurrentItem();
  }

  /* ─── 배경 ─── */
  _drawBackground(W, H) {
    // 세척 테마: 파란 물결 느낌
    const g = this.add.graphics();

    // 하늘 배경
    g.fillStyle(0x1A4060, 1);
    g.fillRect(0, 0, W, H);

    // 물결 레이어
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x2A5580, 0.4 - i * 0.06);
      g.fillRect(0, H - 100 - i * 60, W, 50 + i * 20);
    }

    // 거품 장식
    g.fillStyle(0xFFFFFF, 0.15);
    [[60, 200], [200, 180], [380, 220], [100, 350], [320, 400]].forEach(([x, y]) => {
      g.fillCircle(x, y, Phaser.Math.Between(8, 18));
    });
  }

  /* ─── UI 구성 ─── */
  _buildUI(W, H) {
    // 타이틀
    this.add.text(W / 2, 30, '🧹 세척 미니게임', {
      ...CONFIG.TEXT.HEAD, fontSize: '24px',
    }).setOrigin(0.5);

    this.add.text(W / 2, 62, '아이템을 빠르게 클릭하여 세척하세요!', {
      fontFamily: 'Nunito', fontSize: '14px', color: '#AADDFF',
    }).setOrigin(0.5);

    // 아이템 표시 영역
    this._itemContainer = this.add.container(W / 2, H * 0.38);

    // 원형 게이지 그래픽스
    this._gaugeGfx = this.add.graphics();

    // 게이지 수치 텍스트
    this._gaugeTxt = this.add.text(W / 2, H * 0.38, '0%', {
      fontFamily: 'Jua', fontSize: '28px', color: '#FFFFFF',
    }).setOrigin(0.5);

    // 타이머 텍스트
    this._timerTxt = this.add.text(W / 2, H * 0.58, '⏱ 3.0초', {
      fontFamily: 'Jua', fontSize: '22px', color: '#FFE66D',
    }).setOrigin(0.5);

    // 진행도 표시 (n/total)
    this._progressTxt = this.add.text(W / 2, H * 0.63, '', {
      fontFamily: 'Nunito', fontSize: '14px', color: '#AADDFF',
    }).setOrigin(0.5);

    // 결과 메시지 텍스트 (숨김 상태로 시작)
    this._resultTxt = this.add.text(W / 2, H * 0.5, '', {
      fontFamily: 'Jua', fontSize: '42px', color: '#FFE66D',
      stroke: '#1A3A2A', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    // 클릭 히트 영역
    this._hitZone = this.add.zone(W / 2, H * 0.38, 160, 160)
      .setInteractive({ useHandCursor: true });

    this._hitZone.on('pointerdown', this._onClicked, this);

    // 뒤로가기 버튼
    this._makeBackButton(W, H);
  }

  _makeBackButton(W, H) {
    const bg = this.add.graphics();
    bg.fillStyle(0x334433, 0.8);
    bg.fillRoundedRect(W/2 - 70, H - 72, 140, 44, 10);

    this.add.text(W / 2, H - 50, '← 돌아가기', {
      fontFamily: 'Nunito', fontSize: '15px', color: '#AAFFCC', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this._endSession(false);
      });
  }

  /* ─── 현재 아이템 세척 시작 ─── */
  _startCurrentItem() {
    if (this._currentIdx >= this._dirtyItems.length) {
      this._finishAll();
      return;
    }

    this._gauge   = 0;
    this._timeLeft = CONFIG.WASH.TIME_LIMIT;
    this._isRunning = true;
    this._isDone  = false;
    this._clearSuccessEffects();

    const item = this._dirtyItems[this._currentIdx];

    // 아이템 스프라이트 표시
    this._itemContainer.removeAll(true);
    try {
      const img = this.add.image(0, 0, `trash_${item.type}_dirty`).setScale(1.4);
      this._itemContainer.add(img);
    } catch (e) {
      // 폴백: 원
      const g = this.add.graphics();
      g.fillStyle(item.getDirtyColor(), 1);
      g.fillCircle(0, 0, 50);
      this._itemContainer.add(g);
    }

    // 아이템 흔들기 (더러움 강조)
    this.tweens.add({
      targets: this._itemContainer,
      angle: 5,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this._progressTxt.setText(
      `${this._currentIdx + 1} / ${this._dirtyItems.length} 아이템`
    );

    // 타이머 시작
    this._timerEvent = this.time.addEvent({
      delay: 50,
      callback: this._tick,
      callbackScope: this,
      loop: true,
    });

    this._drawGauge();
  }

  /* ─── 타이머 틱 ─── */
  _tick() {
    if (!this._isRunning) return;

    this._timeLeft -= 50;

    if (this._timeLeft <= 0) {
      this._timeLeft = 0;
      this._onTimerEnd();
    }

    this._timerTxt.setText(`⏱ ${(this._timeLeft / 1000).toFixed(1)}초`);

    // 남은 시간에 따라 색 변화
    const ratio = this._timeLeft / CONFIG.WASH.TIME_LIMIT;
    if (ratio < 0.3) {
      this._timerTxt.setColor('#FF6B6B');
    } else if (ratio < 0.6) {
      this._timerTxt.setColor('#FFE66D');
    } else {
      this._timerTxt.setColor('#AADDFF');
    }

    this._drawGauge();
  }

  /* ─── 클릭 처리 ─── */
  _onClicked() {
    if (!this._isRunning || this._isDone) return;

    this._gauge = Math.min(100, this._gauge + CONFIG.WASH.CLICK_POWER);
    this._gaugeTxt.setText(`${Math.round(this._gauge)}%`);

    // 클릭 파티클
    this._spawnClickParticles();

    // 아이템 흔들기
    this.tweens.add({
      targets: this._itemContainer,
      scaleX: 1.15, scaleY: 0.88,
      duration: 60, yoyo: true,
    });

    // 게이지 완료
    if (this._gauge >= 100) {
      this._onSuccess();
    }
  }

  _spawnClickParticles() {
    const { WIDTH, HEIGHT } = CONFIG;
    const px = Phaser.Math.Between(WIDTH/2 - 50, WIDTH/2 + 50);
    const py = HEIGHT * 0.38 + Phaser.Math.Between(-50, 50);

    try {
      const emitter = this.add.particles(px, py, 'particle', {
        lifespan: 600, speed: { min: 40, max: 80 },
        scale: { start: 0.7, end: 0 }, quantity: 6,
        tint: [0x4FC3F7, 0xADD8FF, 0xFFFFFF],
        alpha: { start: 1, end: 0 },
      });
      this.time.delayedCall(200, () => emitter.destroy());
    } catch (e) {}
  }

  /* ─── 원형 게이지 그리기 ─── */
  _drawGauge() {
    const { WIDTH, HEIGHT } = CONFIG;
    const cx = WIDTH / 2, cy = HEIGHT * 0.38;
    const radius = 80, lineW = 14;
    const ratio = this._gauge / 100;
    const timeRatio = this._timeLeft / CONFIG.WASH.TIME_LIMIT;

    this._gaugeGfx.clear();

    // 배경 원
    this._gaugeGfx.lineStyle(lineW, 0x334455, 0.7);
    this._gaugeGfx.strokeCircle(cx, cy, radius);

    // 게이지 (시작: 12시 방향 = -PI/2)
    if (ratio > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + Math.PI * 2 * ratio;

      // 게이지 색 (민트)
      this._gaugeGfx.lineStyle(lineW, CONFIG.COLORS.MINT, 1);
      this._gaugeGfx.beginPath();
      this._gaugeGfx.arc(cx, cy, radius, startAngle, endAngle, false);
      this._gaugeGfx.strokePath();
    }

    // 타이머 링 (바깥쪽)
    if (timeRatio > 0) {
      const timerColor = timeRatio < 0.3 ? 0xFF6B6B : (timeRatio < 0.6 ? 0xFFE66D : 0x4FC3F7);
      this._gaugeGfx.lineStyle(4, timerColor, 0.6);
      this._gaugeGfx.beginPath();
      this._gaugeGfx.arc(cx, cy, radius + 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timeRatio, false);
      this._gaugeGfx.strokePath();
    }

    // 게이지 텍스트 갱신
    this._gaugeTxt.setPosition(cx, cy);
  }

  /* ─── 성공 ─── */
  _onSuccess() {
    if (this._isDone) return;
    this._isDone = true;
    this._isRunning = false;
    if (this._timerEvent) this._timerEvent.remove();

    const item = this._dirtyItems[this._currentIdx];
    item.washed = true;
    item.isDirty = false; // 이제 깨끗

    // 성공 파티클
    try {
      this._successParticles = this.add.particles(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.38, 'particle', {
        lifespan: 1000, speed: { min: 80, max: 180 },
        scale: { start: 1, end: 0 }, quantity: 20,
        tint: [0x00C896, 0xFFE66D, 0x4FC3F7],
        angle: { min: 0, max: 360 },
      });
      this._successCleanupTimer = this.time.delayedCall(380, () => this._clearSuccessEffects());
    } catch (e) {}

    // 아이템 스프라이트를 깨끗한 버전으로 교체
    this._itemContainer.removeAll(true);
    try {
      const cleanImg = this.add.image(0, 0, `trash_${item.type}_clean`).setScale(1.4);
      this._itemContainer.add(cleanImg);
    } catch (e) {}

    // 점수 추가
    gameState.addScore(CONFIG.SCORE.WASH_SUCCESS);
    gameState.increaseCombo();

    this._showResultText('✨ Clean!', '#00FFB4', true);

    // 게이지 채우기 애니메이션
    this.tweens.add({
      targets: this._gaugeGfx, alpha: 0,
      duration: 320, delay: 260,
    });

    this.time.delayedCall(780, () => {
      this._currentIdx++;
      this._gaugeGfx.setAlpha(1);
      this._resultTxt.setAlpha(0);
      this._startCurrentItem();
    });
  }

  /* ─── 타이머 종료 (실패) ─── */
  _onTimerEnd() {
    if (this._isDone) return;
    this._isDone = true;
    this._isRunning = false;
    if (this._timerEvent) this._timerEvent.remove();

    // 패널티
    gameState.addScore(CONFIG.SCORE.WASH_FAIL);
    gameState.increasePollution(5);
    gameState.resetCombo();

    // 화면 흔들기
    this.cameras.main.shake(400, 0.012);

    this._showResultText('💀 실패!', '#FF6B6B', false);

    this.time.delayedCall(1400, () => {
      this._currentIdx++;
      this._resultTxt.setAlpha(0);
      this._startCurrentItem();
    });
  }

  _showResultText(text, color, success) {
    this._resultTxt.setText(text).setColor(color).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this._resultTxt,
      scaleX: 1.2, scaleY: 1.2,
      duration: 300, ease: 'Back.easeOut',
    });

    // 콤보 팝업
    if (success && gameState.combo > 1) {
      if (this._comboPopup) this._comboPopup.destroy();
      this._comboPopup = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.5, `🔥 ${gameState.combo}콤보!`, {
        fontFamily: 'Jua', fontSize: '24px', color: '#FF6B6B',
        stroke: '#1A3A2A', strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(1);
      this.tweens.add({
        targets: this._comboPopup,
        y: this._comboPopup.y - 26,
        alpha: 0,
        duration: 480,
        ease: 'Power2.easeOut',
        onComplete: () => {
          if (this._comboPopup) {
            this._comboPopup.destroy();
            this._comboPopup = null;
          }
        },
      });
    }
  }

  /* ─── 모두 완료 ─── */
  _finishAll() {
    const washed = this._dirtyItems.filter(i => i.washed).length;

    this._showMessage(
      `세척 완료!\n${washed}개 아이템이 깨끗해졌어요! ✨\n\n점수: +${washed * CONFIG.SCORE.WASH_SUCCESS}`,
      () => this.scene.start('IslandScene'),
    );
  }

  /* ─── 전체 종료 (뒤로가기) ─── */
  _endSession(completed) {
    if (this._timerEvent) this._timerEvent.remove();
    this._clearSuccessEffects();
    this.scene.start('IslandScene');
  }

  _clearSuccessEffects() {
    if (this._successCleanupTimer) {
      this._successCleanupTimer.remove();
      this._successCleanupTimer = null;
    }
    if (this._successParticles) {
      this._successParticles.destroy();
      this._successParticles = null;
    }
    if (this._comboPopup) {
      this._comboPopup.destroy();
      this._comboPopup = null;
    }
  }

  /* ─── 공통 메시지 표시 ─── */
  _showMessage(msg, onClose) {
    const { WIDTH, HEIGHT } = CONFIG;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);

    const panel = this.add.graphics();
    panel.fillStyle(CONFIG.COLORS.PANEL, 1);
    panel.fillRoundedRect(30, HEIGHT * 0.3, WIDTH - 60, 280, 20);

    this.add.text(WIDTH / 2, HEIGHT * 0.44, msg, {
      fontFamily: 'Jua', fontSize: '20px', color: '#AAFFCC',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    const zone = this.add.zone(WIDTH / 2, HEIGHT * 0.62, WIDTH - 60, 54).setInteractive({ useHandCursor: true });
    const btn = this.add.graphics();
    btn.fillStyle(CONFIG.COLORS.MINT, 1);
    btn.fillRoundedRect(60, HEIGHT * 0.59, WIDTH - 120, 54, 12);
    this.add.text(WIDTH / 2, HEIGHT * 0.616, '확인 ✓', {
      fontFamily: 'Jua', fontSize: '20px', color: '#FFFFFF',
    }).setOrigin(0.5);

    zone.on('pointerdown', onClose);
  }
}
