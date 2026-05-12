/* ============================================================
   CraftScene.js - 업사이클 제작 씬
   ★ 수정사항: mask 변수가 불투명 사각형을 그리던 버그 제거
               GeometryMask 를 사용하여 스크롤 영역 클리핑
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
    // 테스트용: Z + 숫자 조합으로 제작 즉시 실행
    //  - Z + 1 => RECIPES[0], Z + 2 => RECIPES[1] ... (최대 7개 레시피)
    this._cheatZHeld = false;
    this._isCheatCrafting = false;

    const kb = this.input.keyboard;
    if (!kb) return;

    const zKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    zKey.on('down', () => { this._cheatZHeld = true; });
    zKey.on('up', () => { this._cheatZHeld = false; });

    const digitKeyMap = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
    ];

    digitKeyMap.forEach((code, idx) => {
      const key = kb.addKey(code);
      key.on('down', () => {
        if (!this._cheatZHeld) return;
        if (this._isCheatCrafting) return;

        const recipe = RECIPES[idx];
        if (!recipe) return;

        // 자원 부족으로 실패하지 않도록 필요한 재료를 우선 채움
        for (const [type, qty] of Object.entries(recipe.ingredients)) {
          if (gameState.resources[type] == null) gameState.resources[type] = 0;
          gameState.resources[type] += qty;
        }

        this._isCheatCrafting = true;
        this._doCraft(recipe, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.58);

        // _doCraft 마지막에 scene.restart()가 들어가므로, 혹시 모를 경우만 해제
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

    this.add.text(W/2, 28, '🔨 업사이클 제작소', {
      ...CONFIG.TEXT.HEAD, fontSize:'22px',
    }).setOrigin(0.5);

    this.add.text(W/2, 54, '재활용 자원으로 친환경 건축물을 만드세요!', {
      fontFamily:'Nunito', fontSize:'12px', color:'#88DDAA',
    }).setOrigin(0.5);
  }

  /* ─── 보유 자원 바 ─── */
  _buildResourceBar(W) {
    const barY = 70;
    const bg = this.add.graphics();
    bg.fillStyle(CONFIG.COLORS.PANEL_L, 0.9);
    bg.fillRoundedRect(8, barY, W-16, 44, 10);

    const types = [
      { type:'plastic', emoji:'🥤', color:'#4FC3F7' },
      { type:'glass',   emoji:'🍶', color:'#80DEEA' },
      { type:'metal',   emoji:'🥫', color:'#B0BEC5' },
      { type:'paper',   emoji:'📄', color:'#FFCC80' },
    ];
    const colW = (W-16)/4;
    types.forEach((t,i) => {
      const x = 8 + colW*i + colW/2;
      this.add.text(x, barY+8, `${t.emoji} ${gameState.resources[t.type]||0}`, {
        fontFamily:'Jua', fontSize:'15px', color:t.color,
      }).setOrigin(0.5, 0);
    });
  }

  /* ─── 레시피 그리드 ─── */
  _buildRecipeGrid(W, H) {
    const startY = 124;
    const cardH  = 176;
    const cardW  = W - 24;
    const gap    = 10;
    const bottomBarH = 66; // 뒤로가기 버튼 영역

    // ★ 핵심 수정: 스크롤 컨테이너 생성
    this._scrollContainer = this.add.container(0, 0);

    RECIPES.forEach((recipe, i) => {
      const cardY = startY + i * (cardH + gap);
      this._buildRecipeCard(recipe, 12, cardY, cardW, cardH);
    });

    // ★ 수정 전 버그: mask.fillRect(...) → 불투명 사각형이 카드를 덮음
    // ★ 수정 후: GeometryMask 로 실제 클리핑 처리
    const maskShape = this.make.graphics({ add: false }); // 씬에 추가하지 않음!
    maskShape.fillRect(0, startY, W, H - startY - bottomBarH);
    const geomMask = new Phaser.Display.Masks.GeometryMask(this, maskShape);
    this._scrollContainer.setMask(geomMask);

    // 스크롤 (스와이프)
    const totalContentH = RECIPES.length * (cardH + gap);
    const visibleH      = H - startY - bottomBarH;
    const maxScrollUp   = Math.max(0, totalContentH - visibleH);
    let   lastY         = 0;
    let   offsetY       = 0;

    this.input.on('pointerdown', (p) => { lastY = p.y; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      const dy = p.y - lastY;
      lastY    = p.y;
      offsetY  = Phaser.Math.Clamp(offsetY + dy, -maxScrollUp, 0);
      this._scrollContainer.setY(offsetY);
    });
  }

  /* ─── 레시피 카드 ─── */
  _buildRecipeCard(recipe, x, y, w, h) {
    const canCraft  = gameState.canCraft(recipe);
    const craftCount = gameState.getBuildingCount(recipe.id);
    const craftLimit = recipe.stackLimit || 3;
    const isMaxed = craftCount >= craftLimit;

    const bg = this.add.graphics();
    bg.fillStyle(isMaxed ? 0x1A4A2A : (canCraft ? CONFIG.COLORS.PANEL_L : 0x1A1A2A), 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    bg.lineStyle(2, isMaxed ? CONFIG.COLORS.MINT : (canCraft ? 0x2A5A3A : 0x2A2A3A), 1);
    bg.strokeRoundedRect(x, y, w, h, 12);
    this._scrollContainer.add(bg);

    const emojiTxt = this.add.text(x+34, y+36, recipe.emoji, { fontSize:'34px' }).setOrigin(0.5);
    this._scrollContainer.add(emojiTxt);

    const nameTxt = this.add.text(x+74, y+12, recipe.name, {
      fontFamily:'Jua', fontSize:'17px',
      color: isMaxed ? '#AAFFCC' : (canCraft ? '#FFFFFF' : '#667766'),
    });
    this._scrollContainer.add(nameTxt);

    const descTxt = this.add.text(x+74, y+34, recipe.description, {
      fontFamily:'Nunito', fontSize:'11px', color:'#88AABB',
      wordWrap:{ width: w-220 },
    });
    this._scrollContainer.add(descTxt);

    // 재료 표시
    const matY = y + 70;
    const matTypes = [
      { type:'plastic', emoji:'🥤', color:'#4FC3F7' },
      { type:'glass',   emoji:'🍶', color:'#80DEEA' },
      { type:'metal',   emoji:'🥫', color:'#B0BEC5' },
      { type:'paper',   emoji:'📄', color:'#FFCC80' },
    ];
    let matX = x + w - 290;
    for (const mat of matTypes) {
      const needed = recipe.ingredients[mat.type]||0;
      if (!needed) continue;
      const enough = (gameState.resources[mat.type]||0) >= needed;
      const matTxt = this.add.text(matX, matY, `${mat.emoji}×${needed}`, {
        fontFamily:'Nunito', fontSize:'13px',
        color: isMaxed ? '#AAAAAA' : (enough ? mat.color : '#FF6B6B'),
      });
      this._scrollContainer.add(matTxt);
      matX += matTxt.width + 12;
    }

    const co2Txt = this.add.text(x+w-12, y+70, `🌿 -${recipe.co2Saved}kg CO₂`, {
      fontFamily:'Nunito', fontSize:'11px', color:'#55FFAA',
    }).setOrigin(1, 0);
    this._scrollContainer.add(co2Txt);

    const effectTxt = this.add.text(x+10, y+96, `✨ ${recipe.effect}`, {
      fontFamily:'Nunito', fontSize:'11px', color:'#AAFFCC',
    });
    this._scrollContainer.add(effectTxt);

    const baseMitigation = Math.round(gameState.getRecipeMitigationBase(recipe.id) * 100);
    const basePurify = gameState.getRecipePurificationBase(recipe.id).toFixed(1);
    const passiveTxt = this.add.text(x+10, y+112, `🛡️ 오염 증가 완화 +${baseMitigation}%`, {
      fontFamily:'Nunito', fontSize:'10px', color:'#9ED6FF',
    });
    this._scrollContainer.add(passiveTxt);

    const autoGainTxt = this.add.text(x+10, y+126, `💧 정화 +${basePurify}/주기 · ${gameState.getRecipeAutoGainHint(recipe.id)}`, {
      fontFamily:'Nunito', fontSize:'9px', color:'#9FE7CC',
      wordWrap:{ width: w - 130 },
    });
    this._scrollContainer.add(autoGainTxt);

    if (isMaxed) {
      const doneTxt = this.add.text(x+w-12, y+h-28, '✅ 제작 최대치', {
        fontFamily:'Jua', fontSize:'14px', color:'#00FFB4',
      }).setOrigin(1, 0.5);
      this._scrollContainer.add(doneTxt);
      return;
    }

    const countTxt = this.add.text(x+w-12, y+h-28, `🧱 ${craftCount}/${craftLimit}`, {
      fontFamily:'Nunito', fontSize:'13px', color:'#AAFFCC',
    }).setOrigin(1, 0.5);
    this._scrollContainer.add(countTxt);

    // 제작 버튼
    const btnW=115, btnH=34;
    const btnX=x+w-btnW-10, btnY=y+h-btnH-10;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(canCraft ? CONFIG.COLORS.MINT : 0x334433, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
    if (canCraft) {
      btnBg.fillStyle(0xFFFFFF, 0.15);
      btnBg.fillRoundedRect(btnX+3, btnY+3, btnW-6, 10, 4);
    }
    this._scrollContainer.add(btnBg);

    const btnTxt = this.add.text(btnX+btnW/2, btnY+btnH/2,
      canCraft ? '🔨 제작' : '🔒 자원 부족', {
        fontFamily:'Jua', fontSize:'13px',
        color: canCraft ? '#FFFFFF' : '#556655',
      }
    ).setOrigin(0.5);
    this._scrollContainer.add(btnTxt);

    if (canCraft) {
      const zone = this.add.zone(btnX+btnW/2, btnY+btnH/2, btnW, btnH)
        .setInteractive({ useHandCursor:true });
      this._scrollContainer.add(zone);
      zone.on('pointerdown', () => this._doCraft(recipe, x+w/2, y+h/2));
    }
  }

  /* ─── 제작 실행 ─── */
  _doCraft(recipe, cx, cy) {
    const success = gameState.consumeResources(recipe.ingredients);
    if (!success) {
      this._popupText(cx, cy-20, '자원이 부족합니다!', '#FF6B6B');
      return;
    }

    const reducedAmount = gameState.addBuilding(recipe);

    try {
      const p = this.add.particles(cx, cy, 'particle', {
        lifespan:1000, speed:{ min:80, max:200 },
        scale:{ start:1.2, end:0 }, quantity:30,
        angle:{ min:0, max:360 },
        tint:[CONFIG.COLORS.MINT, CONFIG.COLORS.YELLOW, CONFIG.COLORS.CORAL],
      });
      this.time.delayedCall(500, () => p.destroy());
    } catch(e) {}

    this.cameras.main.flash(300, 0, 200, 100, false);
    this._popupText(cx, cy-30, `🎉 ${recipe.name} 완성!`, '#FFE66D', 22);
    this._popupText(cx, cy+20, `오염도 -${reducedAmount}%`, '#00FFB4', 16);

    this.time.delayedCall(1200, () => this.scene.restart());
  }

  /* ─── 뒤로가기 버튼 ─── */
  _buildBackButton(W, H) {
    const bg = this.add.graphics();
    bg.fillStyle(CONFIG.COLORS.PANEL, 0.97);
    bg.fillRect(0, H-66, W, 66);
    bg.lineStyle(1, CONFIG.COLORS.MINT, 0.3);
    bg.lineBetween(0, H-66, W, H-66);

    this.add.zone(W/2, H-33, W-40, 54)
      .setInteractive({ useHandCursor:true })
      .on('pointerdown', () => {
        gameState.save();
        this.scene.start('IslandScene');
      });

    this.add.text(W/2, H-33, '← 섬으로 돌아가기', {
      fontFamily:'Jua', fontSize:'17px', color:'#AAFFCC',
    }).setOrigin(0.5);
  }

  _popupText(x, y, msg, color='#FFFFFF', size=18) {
    const t = this.add.text(x, y, msg, {
      fontFamily:'Jua', fontSize:`${size}px`, color,
      stroke:'#1A3A2A', strokeThickness:4,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets:t, y:y-55, alpha:0,
      duration:1000, ease:'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}
