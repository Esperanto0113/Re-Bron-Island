/* ============================================================
   CraftScene.js - 업사이클 제작 씬
   ★ 수정: 폰트 전반적으로 확대, 카드 높이 176 → 204,
           자원 바 높이 44 → 56, 겹침 없이 재배치
   ============================================================ */

class CraftScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CraftScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;
    this._drawBackground(WIDTH, HEIGHT);
    this._buildResourceBar(WIDTH);
    this._buildRecipeGrid(WIDTH, HEIGHT);
    this._buildBackButton(WIDTH, HEIGHT);
    this._enableCheatCraftKeys();
  }

  _enableCheatCraftKeys() {
    this._cheatZHeld    = false;
    this._isCheatCrafting = false;

    const kb = this.input.keyboard;
    if (!kb) return;

    const zKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    zKey.on('down', () => { this._cheatZHeld = true;  });
    zKey.on('up',   () => { this._cheatZHeld = false; });

    const digitKeyMap = [
      Phaser.Input.Keyboard.KeyCodes.ONE,   Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,  Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
    ];
    digitKeyMap.forEach((code, idx) => {
      const key = kb.addKey(code);
      key.on('down', () => {
        if (!this._cheatZHeld || this._isCheatCrafting) return;
        const recipe = RECIPES[idx];
        if (!recipe) return;
        for (const [type, qty] of Object.entries(recipe.ingredients)) {
          if (gameState.resources[type] == null) gameState.resources[type] = 0;
          gameState.resources[type] += qty;
        }
        this._isCheatCrafting = true;
        this._doCraft(recipe, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.58);
        this.time.delayedCall(1500, () => { this._isCheatCrafting = false; });
      });
    });
  }

  /* ─── 배경 ─── */
  _drawBackground(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x0D1F0D, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(CONFIG.COLORS.MINT, 0.04);
    [[80,180],[400,300],[50,600],[420,700]].forEach(([x,y]) => g.fillCircle(x,y,90));

    /* ★ 제목 24px (기존 22px) */
    this.add.text(W/2, 28, '🔨 업사이클 제작소', {
      ...CONFIG.TEXT.HEAD, fontSize: '24px',
    }).setOrigin(0.5);

    /* ★ 부제 14px (기존 12px) */
    this.add.text(W/2, 58, '재활용 자원으로 친환경 건축물을 만드세요!', {
      fontFamily: 'Nunito', fontSize: '14px', color: '#88DDAA',
    }).setOrigin(0.5);
  }

  /* ─── 보유 자원 바 ★ 높이 44→56, 폰트 15→18px ─── */
  _buildResourceBar(W) {
    const barY = 76;          // 기존 70
    const barH = 56;          // 기존 44
    const bg = this.add.graphics();
    bg.fillStyle(CONFIG.COLORS.PANEL_L, 0.9);
    bg.fillRoundedRect(8, barY, W - 16, barH, 10);

    const types = [
      { type: 'plastic', emoji: '🥤', color: '#4FC3F7' },
      { type: 'glass',   emoji: '🍶', color: '#80DEEA' },
      { type: 'metal',   emoji: '🥫', color: '#B0BEC5' },
      { type: 'paper',   emoji: '📄', color: '#FFCC80' },
    ];
    const colW = (W - 16) / 4;
    types.forEach((t, i) => {
      const x = 8 + colW * i + colW / 2;
      /* ★ 이모지+수량 18px, 수직 중앙 정렬 */
      this.add.text(x, barY + barH / 2, `${t.emoji} ${gameState.resources[t.type] || 0}`, {
        fontFamily: 'Jua', fontSize: '18px', color: t.color,
      }).setOrigin(0.5);
    });
  }

  /* ─── 레시피 그리드 ★ startY·cardH 조정 ─── */
  _buildRecipeGrid(W, H) {
    const startY     = 142;   // 기존 124 (자원바 확장분 반영)
    const cardH      = 204;   // 기존 176
    const cardW      = W - 24;
    const gap        = 10;
    const bottomBarH = 70;

    this._scrollContainer = this.add.container(0, 0);

    RECIPES.forEach((recipe, i) => {
      const cardY = startY + i * (cardH + gap);
      this._buildRecipeCard(recipe, 12, cardY, cardW, cardH);
    });

    const maskShape = this.make.graphics({ add: false });
    maskShape.fillRect(0, startY, W, H - startY - bottomBarH);
    const geomMask = new Phaser.Display.Masks.GeometryMask(this, maskShape);
    this._scrollContainer.setMask(geomMask);

    const totalContentH = RECIPES.length * (cardH + gap);
    const visibleH      = H - startY - bottomBarH;
    const maxScrollUp   = Math.max(0, totalContentH - visibleH);
    let lastY = 0, offsetY = 0;

    this.input.on('pointerdown', (p) => { lastY = p.y; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      const dy = p.y - lastY;
      lastY   = p.y;
      offsetY = Phaser.Math.Clamp(offsetY + dy, -maxScrollUp, 0);
      this._scrollContainer.setY(offsetY);
    });
  }

  /* ─── 레시피 카드 (cardH=204) ─── */
  /*
     내부 레이아웃 (y 기준):
       +0   카드 배경
       +14  이름 (20px Jua)
       +40  설명 (13px Nunito, wordWrap)
       +48  이모지 중앙 (40px)   ← 왼쪽 72px 영역
       +86  재료 배지 (15px) + CO2 우측 (13px)
       +114 ✨ 효과 (14px)
       +134 🛡️ 완화% (12px)
       +153 💧 정화/주기 (11px, 1줄)
       +168 [🧱 N/M 좌] [🔨 제작 버튼 우 128×40]
  */
  _buildRecipeCard(recipe, x, y, w, h) {
    const canCraft   = gameState.canCraft(recipe);
    const craftCount = gameState.getBuildingCount(recipe.id);
    const craftLimit = recipe.stackLimit || 3;
    const isMaxed    = craftCount >= craftLimit;

    /* 카드 배경 */
    const bg = this.add.graphics();
    bg.fillStyle(isMaxed ? 0x1A4A2A : (canCraft ? CONFIG.COLORS.PANEL_L : 0x1A1A2A), 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    bg.lineStyle(2, isMaxed ? CONFIG.COLORS.MINT : (canCraft ? 0x2A5A3A : 0x2A2A3A), 1);
    bg.strokeRoundedRect(x, y, w, h, 12);
    this._scrollContainer.add(bg);

    /* ★ 이모지 40px (기존 34px) */
    const emojiTxt = this.add.text(x + 40, y + 50, recipe.emoji, {
      fontSize: '40px',
    }).setOrigin(0.5);
    this._scrollContainer.add(emojiTxt);

    /* ★ 이름 20px (기존 17px) */
    const nameTxt = this.add.text(x + 80, y + 14, recipe.name, {
      fontFamily: 'Jua', fontSize: '20px',
      color: isMaxed ? '#AAFFCC' : (canCraft ? '#FFFFFF' : '#667766'),
    });
    this._scrollContainer.add(nameTxt);

    /* ★ 설명 13px (기존 11px) */
    const descTxt = this.add.text(x + 80, y + 42, recipe.description, {
      fontFamily: 'Nunito', fontSize: '13px', color: '#88AABB',
      wordWrap: { width: w - 210 },
    });
    this._scrollContainer.add(descTxt);

    /* ★ 재료 배지 15px (기존 13px), matY 올림 */
    const matY = y + 88;
    const matTypes = [
      { type: 'plastic', emoji: '🥤', color: '#4FC3F7' },
      { type: 'glass',   emoji: '🍶', color: '#80DEEA' },
      { type: 'metal',   emoji: '🥫', color: '#B0BEC5' },
      { type: 'paper',   emoji: '📄', color: '#FFCC80' },
    ];
    let matX = x + w - 295;
    for (const mat of matTypes) {
      const needed = recipe.ingredients[mat.type] || 0;
      if (!needed) continue;
      const enough = (gameState.resources[mat.type] || 0) >= needed;
      const matTxt = this.add.text(matX, matY, `${mat.emoji}×${needed}`, {
        fontFamily: 'Nunito', fontSize: '15px',
        color: isMaxed ? '#AAAAAA' : (enough ? mat.color : '#FF6B6B'),
      });
      this._scrollContainer.add(matTxt);
      matX += matTxt.width + 10;
    }

    /* ★ CO2 13px (기존 11px) */
    const co2Txt = this.add.text(x + w - 12, y + 88, `🌿 -${recipe.co2Saved}kg CO₂`, {
      fontFamily: 'Nunito', fontSize: '13px', color: '#55FFAA',
    }).setOrigin(1, 0);
    this._scrollContainer.add(co2Txt);

    /* ★ 효과 14px (기존 11px) */
    const effectTxt = this.add.text(x + 10, y + 116, `✨ ${recipe.effect}`, {
      fontFamily: 'Nunito', fontSize: '14px', color: '#AAFFCC',
    });
    this._scrollContainer.add(effectTxt);

    /* ★ 완화% 12px (기존 10px) */
    const baseMitigation = Math.round(gameState.getRecipeMitigationBase(recipe.id) * 100);
    const basePurify     = gameState.getRecipePurificationBase(recipe.id).toFixed(1);
    const passiveTxt = this.add.text(x + 10, y + 136, `🛡️ 오염 증가 완화 +${baseMitigation}%`, {
      fontFamily: 'Nunito', fontSize: '12px', color: '#9ED6FF',
    });
    this._scrollContainer.add(passiveTxt);

    /* ★ 정화/힌트 11px (기존 9px), 1줄 표시 */
    const autoGainTxt = this.add.text(x + 10, y + 153, `💧 정화 +${basePurify}/주기`, {
      fontFamily: 'Nunito', fontSize: '11px', color: '#9FE7CC',
    });
    this._scrollContainer.add(autoGainTxt);

    /* ── 최대치 ── */
    if (isMaxed) {
      const doneTxt = this.add.text(x + w - 12, y + h - 24, '✅ 제작 최대치', {
        fontFamily: 'Jua', fontSize: '15px', color: '#00FFB4',
      }).setOrigin(1, 0.5);
      this._scrollContainer.add(doneTxt);
      return;
    }

    /* ★ 카운트 14px (기존 13px) — 버튼과 같은 행 좌측 */
    const btnRowY = y + h - 50;   // 버튼 행 Y (= y+154)
    const countTxt = this.add.text(x + 14, btnRowY + 20, `🧱 ${craftCount}/${craftLimit}`, {
      fontFamily: 'Nunito', fontSize: '14px', color: '#AAFFCC',
    }).setOrigin(0, 0.5);
    this._scrollContainer.add(countTxt);

    /* ★ 제작 버튼 128×40 (기존 115×34), 글자 15px (기존 13px) */
    const btnW = 128, btnH = 40;
    const btnX = x + w - btnW - 10;
    const btnY = btnRowY;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(canCraft ? CONFIG.COLORS.MINT : 0x334433, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 9);
    if (canCraft) {
      btnBg.fillStyle(0xFFFFFF, 0.15);
      btnBg.fillRoundedRect(btnX + 3, btnY + 3, btnW - 6, 12, 5);
    }
    this._scrollContainer.add(btnBg);

    const btnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2,
      canCraft ? '🔨 제작' : '🔒 자원 부족', {
        fontFamily: 'Jua', fontSize: '15px',
        color: canCraft ? '#FFFFFF' : '#556655',
      }
    ).setOrigin(0.5);
    this._scrollContainer.add(btnTxt);

    if (canCraft) {
      const zone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      this._scrollContainer.add(zone);
      zone.on('pointerdown', () => this._doCraft(recipe, x + w / 2, y + h / 2));
    }
  }

  /* ─── 제작 실행 ─── */
  _doCraft(recipe, cx, cy) {
    const success = gameState.consumeResources(recipe.ingredients);
    if (!success) {
      this._popupText(cx, cy - 20, '자원이 부족합니다!', '#FF6B6B');
      return;
    }
    const reducedAmount = gameState.addBuilding(recipe);
    try {
      const p = this.add.particles(cx, cy, 'particle', {
        lifespan: 1000, speed: { min: 80, max: 200 },
        scale: { start: 1.2, end: 0 }, quantity: 30,
        angle: { min: 0, max: 360 },
        tint: [CONFIG.COLORS.MINT, CONFIG.COLORS.YELLOW, CONFIG.COLORS.CORAL],
      });
      this.time.delayedCall(500, () => p.destroy());
    } catch (e) {}

    this.cameras.main.flash(300, 0, 200, 100, false);
    this._popupText(cx, cy - 30, `🎉 ${recipe.name} 완성!`, '#FFE66D', 22);
    this._popupText(cx, cy + 20, `오염도 -${reducedAmount}%`, '#00FFB4', 16);
    this.time.delayedCall(1200, () => this.scene.restart());
  }

  /* ─── 뒤로가기 ─── */
  _buildBackButton(W, H) {
    const bg = this.add.graphics();
    bg.fillStyle(CONFIG.COLORS.PANEL, 0.97);
    bg.fillRect(0, H - 70, W, 70);
    bg.lineStyle(1, CONFIG.COLORS.MINT, 0.3);
    bg.lineBetween(0, H - 70, W, H - 70);

    this.add.zone(W / 2, H - 35, W - 40, 58)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { gameState.save(); this.scene.start('IslandScene'); });

    /* ★ 뒤로가기 텍스트 18px (기존 17px) */
    this.add.text(W / 2, H - 35, '← 섬으로 돌아가기', {
      fontFamily: 'Jua', fontSize: '18px', color: '#AAFFCC',
    }).setOrigin(0.5);
  }

  _popupText(x, y, msg, color = '#FFFFFF', size = 18) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Jua', fontSize: `${size}px`, color,
      stroke: '#1A3A2A', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: t, y: y - 55, alpha: 0,
      duration: 1000, ease: 'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}