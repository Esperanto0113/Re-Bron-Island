/* ============================================================
   EndingScene.js - 엔딩 / 결과 리포트 씬
   등급 카드 UI + 통계 + PNG 저장 기능 (html2canvas)
   ============================================================ */

class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;
    this._drawBackground(WIDTH, HEIGHT);
    this._buildResultCard(WIDTH, HEIGHT);
    this._buildButtons(WIDTH, HEIGHT);
    this._startEntranceAnimation();
  }

  /* ─── 배경 (페스티벌 느낌) ─── */
  _drawBackground(W, H) {
    const g = this.add.graphics();

    // 그라디언트 배경
    for (let i = 0; i < H; i++) {
      const t = i / H;
      const r = Phaser.Math.Linear(0x0A, 0x00, t);
      const gv = Phaser.Math.Linear(0x2A, 0x1A, t);
      const b = Phaser.Math.Linear(0x1A, 0x0D, t);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b), 1);
      g.fillRect(0, i, W, 1);
    }

    // 빛나는 원 장식
    const circles = [
      [80,  150, 60,  CONFIG.COLORS.MINT,   0.08],
      [400, 200, 80,  CONFIG.COLORS.YELLOW, 0.06],
      [50,  500, 50,  CONFIG.COLORS.CORAL,  0.07],
      [420, 600, 70,  CONFIG.COLORS.BLUE,   0.05],
    ];
    circles.forEach(([x, y, r, c, a]) => {
      g.fillStyle(c, a);
      g.fillCircle(x, y, r);
    });
  }

  /* ─── 결과 카드 (9:16 카드 UI) ─── */
  _buildResultCard(W, H) {
    const grade   = gameState.getEndingByPollution();

    if (grade.isGameOver) {
  /* ── 게임오버 전용 화면 ── */
  this._card = this.add.container(0, 0);
 
  const cW = W - 32, cH = H * 0.82, cX = 16, cY = H * 0.05;
 
  /* 배경 (붉은 톤) */
  const cardBg = this.add.graphics();
  cardBg.fillStyle(0x1A0808, 1);
  cardBg.fillRoundedRect(cX, cY, cW, cH, 20);
  cardBg.lineStyle(2.5, 0xFF2222, 0.6);
  cardBg.strokeRoundedRect(cX, cY, cW, cH, 20);
  this._card.add(cardBg);
 
  /* 상단 붉은 배너 */
  const bannerBg = this.add.graphics();
  bannerBg.fillStyle(0xFF1111, 0.18);
  bannerBg.fillRoundedRect(cX, cY, cW, 90, { tl:20, tr:20, bl:0, br:0 });
  this._card.add(bannerBg);
 
  /* 게임 제목 */
  this._card.add(this.add.text(W/2, cY+22, '🌿 Re:Born Island', {
    fontFamily:'Jua', fontSize:'18px', color:'#FF8888',
  }).setOrigin(0.5));
 
  this._card.add(this.add.text(W/2, cY+50, `플레이 시간: ${gameState.getPlayTime()}`, {
    fontFamily:'Nunito', fontSize:'13px', color:'#887777',
  }).setOrigin(0.5));
 
  /* 게임오버 이모지 */
  this._gradeEmoji = this.add.text(W/2, cY+130, '☠️', {
    fontSize:'80px',
  }).setOrigin(0.5).setScale(0);
  this._card.add(this._gradeEmoji);
 
  /* 제목 */
  this._card.add(this.add.text(W/2, cY+210, '게임오버', {
    fontFamily:'Jua', fontSize:'36px', color:'#FF2222',
    stroke:'#1A0000', strokeThickness:5,
  }).setOrigin(0.5));
 
  /* 설명 */
  this._card.add(this.add.text(W/2, cY+244, grade.desc, {
    fontFamily:'Nunito', fontSize:'14px', color:'#FF9999',
    align:'center', lineSpacing:8, wordWrap:{width:W-80},
  }).setOrigin(0.5, 0));
 
  /* 구분선 */
  const divBg = this.add.graphics();
  divBg.lineStyle(1, 0xFF2222, 0.3);
  divBg.lineBetween(cX+20, cY+350, cX+cW-20, cY+350);
  this._card.add(divBg);
 
  /* 통계 (점수 · 오염도) */
  this._card.add(this.add.text(W/2, cY+384, `⭐ 최종 점수: ${gameState.score}점`, {
    fontFamily:'Jua', fontSize:'22px', color:'#FFB74D',
    stroke:'#1A0000', strokeThickness:3,
  }).setOrigin(0.5));
 
  this._card.add(this.add.text(W/2, cY+422, `🏭 오염도: ${Math.round(gameState.pollution)}%  (오버)`, {
    fontFamily:'Jua', fontSize:'16px', color:'#FF6666',
    stroke:'#1A0000', strokeThickness:3,
  }).setOrigin(0.5));
 
  /* 난이도 표시 */
  const diffCfg = gameState.getDifficultyConfig();
  this._card.add(this.add.text(W/2, cY+456, `${diffCfg.emoji} 난이도: ${diffCfg.label}`, {
    fontFamily:'Jua', fontSize:'15px', color: diffCfg.colorHex,
  }).setOrigin(0.5));
 
  /* 힌트 */
  this._card.add(this.add.text(W/2, cY+510, '💡 TIP: 건물을 먼저 제작하면\n오염 증가를 늦출 수 있어요!', {
    fontFamily:'Nunito', fontSize:'13px', color:'#886666',
    align:'center', lineSpacing:6,
  }).setOrigin(0.5));
 
  /* 서명 */
  this._card.add(this.add.text(W/2, cY+cH-22, '#ReBornIsland · 다시 도전해보세요 🌍', {
    fontFamily:'Nunito', fontSize:'10px', color:'#443333',
  }).setOrigin(0.5));
 
  return; /* 일반 카드 렌더링 건너뜀 */
}

    const cardW   = W - 32;
    const cardH   = H * 0.82;
    const cardX   = 16;
    const cardY   = H * 0.05;

    // 카드 컨테이너 (나중에 캡처용)
    this._card = this.add.container(0, 0);

    /* 카드 배경 */
    const cardBg = this.add.graphics();
    cardBg.fillStyle(CONFIG.COLORS.PANEL, 1);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 20);
    cardBg.lineStyle(2.5, CONFIG.COLORS.MINT, 0.6);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 20);
    this._card.add(cardBg);

    /* 헤더 배너 */
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(CONFIG.COLORS.MINT, 0.15);
    bannerBg.fillRoundedRect(cardX, cardY, cardW, 90, { tl: 20, tr: 20, bl: 0, br: 0 });
    this._card.add(bannerBg);

    /* 게임 제목 */
    this._card.add(
      this.add.text(W / 2, cardY + 22, '🌿 Re:Born Island', {
        fontFamily: 'Jua', fontSize: '18px', color: '#AAFFCC',
      }).setOrigin(0.5)
    );

    /* 플레이 시간 */
    this._card.add(
      this.add.text(W / 2, cardY + 48, `플레이 시간: ${gameState.getPlayTime()}`, {
        fontFamily: 'Nunito', fontSize: '13px', color: '#88AABB',
      }).setOrigin(0.5)
    );

    /* 등급 이모지 + 제목 */
    const gradeY = cardY + 108;
    this._gradeEmoji = this.add.text(W / 2, gradeY, grade.emoji, {
      fontSize: '64px',
    }).setOrigin(0.5).setScale(0);
    this._card.add(this._gradeEmoji);

    this._card.add(
      this.add.text(W / 2, gradeY + 78, grade.title, {
        fontFamily: 'Jua', fontSize: '30px', color: grade.color,
        stroke: '#1A3A2A', strokeThickness: 5,
      }).setOrigin(0.5)
    );

    this._card.add(
      this.add.text(W / 2, gradeY + 110, grade.desc, {
        fontFamily: 'Nunito', fontSize: '12px', color: '#A5D6A7',
        align: 'center', lineSpacing: 4, wordWrap: { width: W - 70 },
      }).setOrigin(0.5, 0)
    );

    /* 점수 */
    this._card.add(
      this.add.text(W / 2, gradeY + 158, `⭐ 최종 점수: ${gameState.score}점`, {
        fontFamily: 'Jua', fontSize: '22px', color: CONFIG.COLORS.YELLOW + '',
        stroke: '#1A3A2A', strokeThickness: 4,
      }).setOrigin(0.5).setTint(CONFIG.COLORS.YELLOW)
    );

    this._card.add(
      this.add.text(W / 2, gradeY + 188, `🏭 종료 시점 오염도: ${Math.round(gameState.pollution)}%`, {
        fontFamily: 'Jua', fontSize: '16px', color: '#FFCC80',
        stroke: '#1A3A2A', strokeThickness: 3,
      }).setOrigin(0.5)
    );

    /* 구분선 */
    const divY = gradeY + 222;
    const divBg = this.add.graphics();
    divBg.lineStyle(1, CONFIG.COLORS.MINT, 0.3);
    divBg.lineBetween(cardX + 20, divY, cardX + cardW - 20, divY);
    this._card.add(divBg);

    /* 통계 박스들 */
    this._buildStats(W, cardX, divY + 12, cardW);

    /* 건물 목록 */
    const buildY = divY + 206;
    this._buildBuildingList(W, cardX, buildY, cardW);

    /* 하단 서명 */
    this._card.add(
      this.add.text(W / 2, cardY + cardH - 22, '#ReBornIsland · 지구를 위한 선택 🌍', {
        fontFamily: 'Nunito', fontSize: '10px', color: '#334433',
      }).setOrigin(0.5)
    );
  }

  _buildStats(W, cardX, startY, cardW) {
    const stats = [
      { label: '총 재활용',   value: `${gameState.totalRecycled}개`,     emoji: '♻️',  color: '#00C896' },
      { label: 'CO₂ 절약',   value: `${gameState.savedCO2.toFixed(1)}kg`, emoji: '🌿', color: '#6BCB77' },
      { label: '제작 건축물', value: `${gameState.craftedItems.length}개`,  emoji: '🏗️',  color: '#4FC3F7' },
      { label: '최대 콤보',   value: `${gameState.maxCombo}콤보`,          emoji: '🔥',  color: '#FF6B6B' },
    ];

    const colW = (cardW - 24) / 2;
    const gap  = 8;

    stats.forEach((stat, i) => {
      const col  = i % 2;
      const row  = Math.floor(i / 2);
      const bx   = cardX + 12 + col * (colW + gap);
      const by   = startY + row * 76;
      const bw   = colW;
      const bh   = 68;

      const bg = this.add.graphics();
      bg.fillStyle(0x1A3A2A, 0.7);
      bg.fillRoundedRect(bx, by, bw, bh, 8);
      bg.lineStyle(1, stat.color, 0.25);
      bg.strokeRoundedRect(bx, by, bw, bh, 8);
      this._card.add(bg);

      this._card.add(
        this.add.text(bx + bw / 2, by + 14, stat.emoji, { fontSize: '22px' }).setOrigin(0.5)
      );
      this._card.add(
        this.add.text(bx + bw / 2, by + 38, stat.value, {
          fontFamily: 'Jua', fontSize: '16px', color: stat.color,
        }).setOrigin(0.5)
      );
      this._card.add(
        this.add.text(bx + bw / 2, by + 56, stat.label, {
          fontFamily: 'Nunito', fontSize: '10px', color: '#AABBAA',
        }).setOrigin(0.5)
      );
    });
  }

  _buildBuildingList(W, cardX, startY, cardW) {
    const built = gameState.craftedItems;
    if (built.length === 0) return;

    this._card.add(
      this.add.text(W / 2, startY, '🏗️ 제작한 건축물', {
        fontFamily: 'Jua', fontSize: '14px', color: '#AAFFCC',
      }).setOrigin(0.5)
    );

    const emojis = built.slice(0, 7).map(b => {
      const recipe = RECIPES.find(r => r.id === b.id);
      return recipe ? recipe.emoji : '🏠';
    }).join(' ');

    this._card.add(
      this.add.text(W / 2, startY + 26, emojis, {
        fontFamily: 'Nunito', fontSize: '24px',
      }).setOrigin(0.5)
    );

    if (built.length > 7) {
      this._card.add(
        this.add.text(W / 2, startY + 58, `외 ${built.length - 7}개 더...`, {
          fontFamily: 'Nunito', fontSize: '11px', color: '#556655',
        }).setOrigin(0.5)
      );
    }
  }

  /* ─── 하단 버튼들 ─── */
  _buildButtons(W, H) {
    const btnY = H * 0.89;

    // PNG 저장 버튼 (html2canvas 사용)
    this._makeButton(W / 2 - 88, btnY, 160, 46, '📷 결과 저장', CONFIG.COLORS.BLUE, () => {
      this._saveAsImage();
    });

    // 다시 하기 버튼
    this._makeButton(W / 2 + 88, btnY, 160, 46, '🔄 다시 시작', CONFIG.COLORS.CORAL, () => {
      gameState.newGame();
      this.scene.start('MenuScene');
    });
  }

  _makeButton(cx, cy, w, h, label, color, onClick) {
    const bg = this.add.graphics();
    const draw = (scale = 1) => {
      const sw = w * scale;
      const sh = h * scale;
      const sx = cx - sw / 2;
      const sy = cy - sh / 2;

      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(sx, sy, sw, sh, 10);
      bg.fillStyle(0xFFFFFF, 0.15);
      bg.fillRoundedRect(sx + 3, sy + 3, Math.max(0, sw - 6), 12, 5);
    };
    draw(1);

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Jua', fontSize: '15px', color: '#FFFFFF',
      stroke: '#1A3A2A', strokeThickness: 3,
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });

    zone.on('pointerover',  () => {
      draw(1.03);
      this.tweens.add({ targets: [txt], scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    zone.on('pointerout',   () => {
      draw(1);
      this.tweens.add({ targets: [txt], scaleX: 1, scaleY: 1, duration: 100 });
    });
    zone.on('pointerdown', () => {
      draw(0.94);
      this.tweens.add({
        targets: [txt], scaleX: 0.94, scaleY: 0.94,
        duration: 80, yoyo: true,
        onComplete: () => {
          draw(1);
          onClick();
        },
      });
    });
  }

  /* ─── 등장 애니메이션 ─── */
  _startEntranceAnimation() {
    // 등급 이모지 팡
    this.time.delayedCall(300, () => {
      this.tweens.add({
        targets: this._gradeEmoji,
        scaleX: 1.2, scaleY: 1.2,
        duration: 600, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: this._gradeEmoji,
            scaleX: 1, scaleY: 1,
            duration: 200,
          });
        },
      });
    });

    // 파티클 (등급에 맞는 색)
    this.time.delayedCall(500, () => {
      try {
        const p = this.add.particles(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.25, 'particle', {
          lifespan: 1800,
          speed:    { min: 60, max: 220 },
          angle:    { min: -120, max: -60 },
          scale:    { start: 1, end: 0 },
          quantity: 40,
          tint:     [CONFIG.COLORS.MINT, CONFIG.COLORS.YELLOW, CONFIG.COLORS.CORAL, CONFIG.COLORS.BLUE],
        });
        this.time.delayedCall(1000, () => p.destroy());
      } catch (e) {}
    });
  }

  /* ─── PNG 저장 ─── */
  _saveAsImage() {
    this._captureAndSave();
  }

  _loadHtml2Canvas(cb) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = cb;
    script.onerror = () => {
      this._showSaveError();
    };
    document.head.appendChild(script);
  }

  _captureAndSave() {
    const game = this.sys.game;
    const renderer = game.renderer;
    const canvas = game.canvas;

    // WebGL에서도 검은 화면 없이 현재 프레임을 캡처
    renderer.snapshot((image) => {
      try {
        if (image?.src) {
          this._downloadDataUrl(image.src);
          return;
        }
      } catch (e) {}

      // snapshot 실패 시 캔버스 직접 저장으로 폴백
      this._directCanvasSave(canvas);
    }, 'image/png', 0.92);
  }

  _directCanvasSave(canvas) {
    try {
      this._downloadDataUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      this._showSaveError();
    }
  }

  _downloadDataUrl(dataUrl) {
    const link = document.createElement('a');
    link.download = `reborn-island-result-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  _showSaveError() {
    this._popupText(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.85, '저장에 실패했습니다 😢', '#FF6B6B');
  }

  _popupText(x, y, msg, color = '#FFFFFF') {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Jua', fontSize: '16px', color,
      stroke: '#1A3A2A', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(3000, () => t.destroy());
  }
}
