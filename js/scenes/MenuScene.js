/* ============================================================
   MenuScene.js - 시작 화면 (완전 재설계)
   ┌──────────────────────────────────────────────────┐
   │  게임 타이틀 + 배경 애니메이션                       │
   │  [🎬 시나리오]  [📖 게임 방법]  [🌱 게임 시작]       │
   └──────────────────────────────────────────────────┘
   시나리오 모달: 태평양 플라스틱 아일랜드 스토리 (슬라이드)
   게임방법 모달: 단계별 플레이 가이드
   ============================================================ */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this._activeModal = null;
  }

  create() {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    this._drawSky(W, H);
    this._drawOcean(W, H);
    this._drawIsland(W, H);
    this._drawTrashFloating(W, H);
    this._drawFog(W, H);
    this._buildTitle(W, H);
    this._buildButtons(W, H);
    this._animateWaves(W, H);
    this._animateTitle();
  }

  /* ══════════════════════════════════════
     배경 드로잉
  ══════════════════════════════════════ */
  _drawSky(W, H) {
    const g = this.add.graphics();
    const rows = 280;
    for (let i = 0; i < rows; i++) {
      const t  = i / rows;
      const r  = Math.round(Phaser.Math.Linear(0x22, 0x0E, t));
      const gv = Math.round(Phaser.Math.Linear(0x33, 0x1A, t));
      const b  = Math.round(Phaser.Math.Linear(0x44, 0x22, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b), 1);
      g.fillRect(0, i * (H * 0.52 / rows), W, H * 0.52 / rows + 1);
    }
    // 달
    g.fillStyle(0xDDFFCC, 0.10);
    g.fillCircle(W * 0.82, H * 0.09, 32);
    g.fillStyle(0xBBEEAA, 0.05);
    g.fillCircle(W * 0.82, H * 0.09, 50);
    // 별
    const stars = [
      [42,28],[92,14],[162,38],[232,10],[292,52],[352,18],
      [412,33],[462,7],[132,58],[322,46],[72,68],[202,24],
      [18,44],[440,52],[250,34],[380,62],[110,18],[470,40],
    ];
    stars.forEach(([x, y]) => {
      g.fillStyle(0xFFFFFF, 0.25 + Math.random() * 0.45);
      g.fillCircle(x, y, 1 + Math.random() * 1.2);
    });
  }

  _drawOcean(W, H) {
    const g = this.add.graphics();
    const oceanY = H * 0.48;
    const rows = 120;
    for (let i = 0; i < rows; i++) {
      const t  = i / rows;
      const r  = Math.round(Phaser.Math.Linear(0x0E, 0x08, t));
      const gv = Math.round(Phaser.Math.Linear(0x28, 0x14, t));
      const b  = Math.round(Phaser.Math.Linear(0x32, 0x1C, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b), 1);
      g.fillRect(0, oceanY + i * ((H - oceanY) / rows), W, (H - oceanY) / rows + 1);
    }
    // 기름막 수면
    g.fillStyle(0x0E2230, 0.55);
    g.fillRect(0, oceanY, W, 7);
  }

  _drawIsland(W, H) {
    const g = this.add.graphics();
    const iy = H * 0.50;

    // 그림자
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(W / 2 + 14, iy + 20, 345, 72);

    // 섬 본체
    g.fillStyle(0x483828, 1);
    g.fillEllipse(W / 2, iy, 345, 80);
    g.fillStyle(0x584838, 0.75);
    g.fillEllipse(W / 2 - 18, iy - 9, 285, 54);

    // 쓰레기 더미 (색상 블록)
    const heaps = [
      [W*0.27, iy-18, 56, 30, 0x3A5A2A, 0.7],
      [W*0.50, iy-23, 72, 32, 0x2A3A5A, 0.8],
      [W*0.71, iy-16, 52, 28, 0x5A3A2A, 0.7],
      [W*0.37, iy-31, 44, 24, 0x4A2A2A, 0.9],
      [W*0.61, iy-27, 50, 26, 0x2A4A3A, 0.8],
    ];
    heaps.forEach(([x, y, rw, rh, c, a]) => {
      g.fillStyle(c, a); g.fillEllipse(x, y, rw, rh);
    });

    // 쓰레기 조각
    const pieces = [
      [W*0.24,iy-13,0x4FC3F7],[W*0.34,iy-9,0xFFCC80],
      [W*0.54,iy-19,0xFF6B6B],[W*0.64,iy-11,0xB0BEC5],
      [W*0.74,iy-15,0x80DEEA],[W*0.41,iy-26,0xFFE66D],
      [W*0.57,iy-23,0x4FC3F7],[W*0.29,iy-21,0xA5D6A7],
    ];
    pieces.forEach(([x, y, c]) => {
      g.fillStyle(c, 0.6); g.fillRect(x, y, 7, 5);
    });

    // 죽은 나무
    this._deadTree(g, W*0.27, iy-28, 40);
    this._deadTree(g, W*0.65, iy-22, 34);
    this._deadTree(g, W*0.47, iy-31, 44);

    // 연기
    g.fillStyle(0x334444, 0.16);
    g.fillEllipse(W*0.38, iy-56, 82, 32);
    g.fillStyle(0x445555, 0.10);
    g.fillEllipse(W*0.60, iy-50, 62, 24);
  }

  _deadTree(g, x, y, h) {
    g.fillStyle(0x4A3A28, 1);
    g.fillRect(x - 4, y - h, 7, h);
    g.lineStyle(2.5, 0x4A3A28, 1);
    g.beginPath(); g.moveTo(x, y-h*0.70); g.lineTo(x-18, y-h);    g.strokePath();
    g.beginPath(); g.moveTo(x, y-h*0.55); g.lineTo(x+14, y-h*0.85); g.strokePath();
    g.beginPath(); g.moveTo(x, y-h*0.38); g.lineTo(x-10, y-h*0.54); g.strokePath();
  }

  _drawTrashFloating(W, H) {
    const g = this.add.graphics();
    const oy = H * 0.50;
    const items = [
      [W*0.08, oy+30, 0x4FC3F7,18,8],  [W*0.22, oy+55, 0xFFCC80,12,6],
      [W*0.78, oy+40, 0xB0BEC5,16,7],  [W*0.88, oy+65, 0xFF6B6B,10,5],
      [W*0.14, oy+90, 0x80DEEA,20,8],  [W*0.86, oy+95, 0xFFE66D,14,6],
      [W*0.05, oy+125,0x4FC3F7,11,5],  [W*0.93, oy+132,0xA5D6A7,15,6],
    ];
    items.forEach(([x,y,c,rw,rh]) => { g.fillStyle(c,0.42); g.fillEllipse(x,y,rw,rh); });
  }

  _drawFog(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x112233, 0.32);
    g.fillRect(0, H*0.44, W, 42);
    g.fillStyle(0x223344, 0.18);
    g.fillRect(0, H*0.46, W, 28);
  }

  /* ══════════════════════════════════════
     타이틀
  ══════════════════════════════════════ */
  _buildTitle(W, H) {
    this._badge = this.add.text(W/2, H*0.14, '🌏  태평양 · 플라스틱 아일랜드', {
      fontFamily: 'Nunito', fontSize: '12px', color: '#88CCAA',
      fontStyle: 'bold', letterSpacing: 2,
      backgroundColor: '#091A10DD', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setAlpha(0);

    this._title1 = this.add.text(W/2, H*0.25, 'Re:Born', {
      fontFamily: 'Jua', fontSize: '66px',
      color: '#FFFFFF', stroke: '#00C896', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this._title2 = this.add.text(W/2, H*0.37, 'Island', {
      fontFamily: 'Jua', fontSize: '50px',
      color: '#00E8A8', stroke: '#003322', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this._sub = this.add.text(W/2, H*0.45, '쓰레기 섬을 낙원으로 되돌리는 프로젝트', {
      fontFamily: 'Nunito', fontSize: '13px', color: '#77CCAA',
      fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(W-10, H-12, 'v1.0  ·  Phaser 3', {
      fontFamily: 'Nunito', fontSize: '10px', color: '#223322',
    }).setOrigin(1, 1);
  }

  /* ══════════════════════════════════════
     버튼 그룹
  ══════════════════════════════════════ */
  _buildButtons(W, H) {
    const baseY = H * 0.62;
    this._btnGroup = [];

    this._btnGroup.push(
      this._outlineBtn(W/2, baseY, 210, 50, '🎬  시나리오', '#4FC3F7', () => this._openScenarioModal(W,H))
    );
    this._btnGroup.push(
      this._outlineBtn(W/2, baseY + 70, 210, 50, '📖  게임 방법', '#FFE66D', () => this._openInstructionModal(W,H))
    );
    this._btnGroup.push(
      this._filledBtn(W/2, baseY + 152, 268, 62, '🌱  게임 시작', CONFIG.COLORS.MINT, () => this._startGame())
    );

    const hasSaveData = !!localStorage.getItem('reborn_island_save');
    const hasSessionProgress =
      gameState.score > 0 ||
      gameState.inventory.length > 0 ||
      gameState.craftedItems.length > 0 ||
      Object.values(gameState.resources).some((v) => v > 0);

    if (hasSaveData || hasSessionProgress) {
      this._btnGroup.push(
        this._outlineBtn(W/2, baseY + 234, 210, 44, '💾  이어하기', '#A5D6A7', () => {
          if (hasSaveData) gameState.load();
          this.scene.start('IslandScene');
        })
      );
    }
  }

  _outlineBtn(cx, cy, w, h, label, color, onClick) {
    const ci = parseInt(color.replace('#','0x'));
    const bg  = this.add.graphics().setAlpha(0);
    const draw = (hov) => {
      bg.clear();
      bg.lineStyle(hov ? 2 : 1.5, ci, hov ? 1 : 0.65);
      bg.fillStyle(ci, hov ? 0.16 : 0.07);
      bg.fillRoundedRect(cx-w/2, cy-h/2, w, h, 10);
      bg.strokeRoundedRect(cx-w/2, cy-h/2, w, h, 10);
    };
    draw(false);

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Nunito', fontSize: '16px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover',  () => draw(true));
    zone.on('pointerout',   () => draw(false));
    zone.on('pointerdown',  () => {
      this.tweens.add({ targets:[bg,txt], scaleX:0.95, scaleY:0.95, duration:80, yoyo:true, onComplete:onClick });
    });
    return { bg, txt };
  }

  _filledBtn(cx, cy, w, h, label, colorInt, onClick) {
    const bg  = this.add.graphics().setAlpha(0);
    const draw = (hovered = false, scale = 1) => {
      const sw = w * scale;
      const sh = h * scale;
      const sx = cx - sw / 2;
      const sy = cy - sh / 2;
      const haloPad = 8 * scale;

      bg.clear();
      bg.fillStyle(colorInt, hovered ? 0.28 : 0.22);
      bg.fillRoundedRect(sx - haloPad, sy - haloPad, sw + haloPad * 2, sh + haloPad * 2, 18);
      bg.fillStyle(colorInt, 1);
      bg.fillRoundedRect(sx, sy, sw, sh, 14);
      bg.fillStyle(0xFFFFFF, 0.18);
      bg.fillRoundedRect(sx + 5, sy + 5, Math.max(0, sw - 10), 18, 8);
    };
    draw(false, 1);

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Jua', fontSize: '24px', color:'#FFFFFF',
      stroke:'#004422', strokeThickness:4,
    }).setOrigin(0.5).setAlpha(0);

    const zone = this.add.zone(cx, cy, w+16, h+16).setInteractive({ useHandCursor: true });
    zone.on('pointerover',  () => {
      draw(true, 1.02);
      this.tweens.add({ targets:[txt], scaleX:1.04, scaleY:1.04, duration:110 });
    });
    zone.on('pointerout',   () => {
      draw(false, 1);
      this.tweens.add({ targets:[txt], scaleX:1, scaleY:1, duration:110 });
    });
    zone.on('pointerdown',  () => {
      draw(true, 0.95);
      this.tweens.add({
        targets:[txt], scaleX:0.95, scaleY:0.95, duration:80, yoyo:true,
        onComplete: () => {
          draw(true, 1.02);
          onClick();
        },
      });
    });
    return { bg, txt };
  }

  /* ══════════════════════════════════════
     애니메이션
  ══════════════════════════════════════ */
  _animateTitle() {
    const seq = [
      { target: this._badge,  delay: 200,  dy: 8 },
      { target: this._title1, delay: 500,  dy: 10 },
      { target: this._title2, delay: 750,  dy: 8 },
      { target: this._sub,    delay: 1000, dy: 0 },
    ];
    seq.forEach(({ target, delay, dy }) => {
      this.tweens.add({ targets: target, alpha: 1, y: target.y + dy, duration: 700, ease:'Power2.easeOut', delay });
    });

    // 타이틀 부유
    this.time.delayedCall(1300, () => {
      this.tweens.add({ targets:[this._title1, this._title2], y:'+=9', duration:2600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });

    // 버튼 순차 등장
    this._btnGroup.forEach((btn, i) => {
      this.time.delayedCall(1100 + i * 130, () => {
        this.tweens.add({ targets:[btn.bg, btn.txt], alpha:1, duration:420, ease:'Power2' });
      });
    });
  }

  _animateWaves(W, H) {
    const wave = this.add.graphics();
    let t = 0;
    this.time.addEvent({
      delay: 55, loop: true,
      callback: () => {
        wave.clear();
        wave.fillStyle(0x224455, 0.10);
        for (let i = 0; i < 6; i++) {
          const x = ((t * 0.5 + i * 85) % (W + 80)) - 40;
          wave.fillEllipse(x, H * 0.502, 90, 9);
        }
        t++;
      },
    });
  }

  /* ══════════════════════════════════════
     시나리오 모달
  ══════════════════════════════════════ */
  _openScenarioModal(W, H) {
    if (this._activeModal) return;
    const slides = [
      {
        emoji: '🌊',
        title: '태평양 한가운데…',
        body:
          '한반도보다 7배나 넓은\n거대한 쓰레기 섬이 존재합니다.\n\n이름하여\n"The Great Pacific\n Garbage Patch".',
        color: '#4FC3F7',
      },
      {
        emoji: '🗑️',
        title: '인류가 버린 것들',
        body:
          '매년 800만 톤의 플라스틱이\n바다로 흘러들어 옵니다.\n\n이 섬은 지금 이 순간에도\n조용히 커지고 있습니다.',
        color: '#FF8888',
      },
      {
        emoji: '🐠',
        title: '죽어가는 생태계',
        body:
          '100만 마리 이상의 바닷새와\n10만 마리의 해양 포유류가\n매년 플라스틱으로 희생됩니다.\n\n인간의 선택이 만든 재앙.',
        color: '#FFD93D',
      },
      {
        emoji: '🌱',
        title: '당신의 임무',
        body:
          '당신은 "Re:Born 프로젝트"의\n탐사대원으로 파견됩니다.\n\n쓰레기를 자원으로 바꾸고\n업사이클 건축물을 지어\n\n플라스틱 아일랜드를\n되살리세요!',
        color: '#00E8A8',
      },
    ];
    this._activeModal = this._modal(W, H, '🌊 시나리오', '#4FC3F7', slides);
  }

  /* ══════════════════════════════════════
     게임 방법 모달
  ══════════════════════════════════════ */
  _openInstructionModal(W, H) {
    if (this._activeModal) return;
    const slides = [
      {
        emoji: '🎒',
        title: '① 쓰레기 수거',
        body:
          '섬 곳곳에 흩어진 쓰레기를\n탭(클릭)하여 인벤토리에 담으세요.\n\n오염된 아이템은 검은 기운이\n나타납니다. 먼저 세척이 필요해요!',
        color: '#4FC3F7',
      },
      {
        emoji: '🧹',
        title: '② 세척 미니게임',
        body:
          '[세척] 버튼을 누르면 시작됩니다.\n\n원형 게이지가 가득 찰 때까지\n화면을 빠르게 탭하세요!\n\n⏱ 제한 시간은 단 3초!',
        color: '#80DEEA',
      },
      {
        emoji: '♻️',
        title: '③ 분류 미니게임',
        body:
          '[분류] 버튼을 누르면\n아이템이 위에서 떨어집니다.\n\n🥤 플라스틱  📄 종이\n🥫 금속     🍶 유리\n\n올바른 수거함에 드래그하세요!',
        color: '#00E8A8',
      },
      {
        emoji: '🔨',
        title: '④ 업사이클 제작',
        body:
          '분류해 모은 자원으로\n친환경 건축물을 만드세요.\n\n제작할수록 섬의 오염도↓\n섬이 점점 초록빛으로!',
        color: '#FFE66D',
      },
      {
        emoji: '🏝️',
        title: '⑤ 섬 복원 & 등급',
        body:
          '건축물이 늘수록 회색빛 섬이\n생명 넘치는 낙원으로 변합니다.\n\n🌱 새싹 수호자\n♻️ 에코 디자이너\n🌏 지구 복원가\n🌍 Re:Born Master',
        color: '#A5D6A7',
      },
    ];
    this._activeModal = this._modal(W, H, '📖 게임 방법', '#FFE66D', slides);
  }

  /* ══════════════════════════════════════
     공통 모달 팩토리
  ══════════════════════════════════════ */
  _modal(W, H, title, accentHex, slides) {
    const ac   = parseInt(accentHex.replace('#','0x'));
    let cur    = 0;
    const cont = this.add.container(0, 0).setDepth(200);

    /* 오버레이 */
    const ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.80);
    ov.fillRect(0, 0, W, H);
    cont.add(ov);

    /* 카드 */
    const cX=18, cY=H*0.09, cW=W-36, cH=H*0.82;
    const card = this.add.graphics();
    card.fillStyle(0x091A10, 1);
    card.fillRoundedRect(cX, cY, cW, cH, 20);
    card.lineStyle(2, ac, 0.55);
    card.strokeRoundedRect(cX, cY, cW, cH, 20);
    card.fillStyle(ac, 0.10);
    card.fillRoundedRect(cX, cY, cW, 68, { tl:20, tr:20, bl:0, br:0 });
    cont.add(card);

    /* 제목 */
    cont.add(this.add.text(W/2, cY+34, title, {
      fontFamily:'Jua', fontSize:'19px', color:accentHex,
    }).setOrigin(0.5));

    /* 닫기 */
    const closeX = this.add.text(cX+cW-16, cY+18, '✕', {
      fontFamily:'Nunito', fontSize:'18px', color:'#445544', fontStyle:'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    closeX.on('pointerover',  () => closeX.setColor('#FF8888'));
    closeX.on('pointerout',   () => closeX.setColor('#445544'));
    closeX.on('pointerdown',  () => this._closeModal(cont));
    cont.add(closeX);

    /* 슬라이드 영역 */
    const area = this.add.container(0, 0);
    cont.add(area);

    const render = (idx) => {
      area.removeAll(true);
      const s = slides[idx];
      const sy = cY + 80;

      area.add(this.add.text(W/2, sy+20, s.emoji, { fontSize:'60px' }).setOrigin(0.5));

      area.add(this.add.text(W/2, sy+100, s.title, {
        fontFamily:'Jua', fontSize:'20px', color:s.color,
        stroke:'#071007', strokeThickness:3,
      }).setOrigin(0.5));

      area.add(this.add.text(W/2, sy+144, s.body, {
        fontFamily:'Nunito', fontSize:'14.5px', color:'#BBEEBB',
        align:'center', lineSpacing:9,
        wordWrap:{ width: cW-52 },
      }).setOrigin(0.5, 0));

      /* 도트 */
      const dotY = cY + cH - 56;
      slides.forEach((_, di) => {
        const d = this.add.graphics();
        d.fillStyle(di===idx ? ac : 0x2A4A2A, 1);
        d.fillCircle(W/2 - (slides.length-1)*12 + di*24, dotY, di===idx ? 6 : 4);
        area.add(d);
      });

      /* 힌트 */
      area.add(this.add.text(W/2, cY+cH-26,
        idx === slides.length-1 ? '탭하면 닫힙니다' : '탭하여 다음으로', {
          fontFamily:'Nunito', fontSize:'11px', color:'#2A4A2A',
        }).setOrigin(0.5));
    };

    /* 이전/다음 */
    const prev = this._navBtn(cont, cX+26, cY+cH/2+20, '◀', accentHex, () => {
      if (cur > 0) { cur--; render(cur); upd(); }
    });
    const next = this._navBtn(cont, cX+cW-26, cY+cH/2+20, '▶', accentHex, () => {
      if (cur < slides.length-1) { cur++; render(cur); upd(); }
      else this._closeModal(cont);
    });
    const upd = () => {
      prev.setAlpha(cur > 0 ? 1 : 0.2);
      next.setText(cur === slides.length-1 ? '✓' : '▶');
    };

    /* 탭 전체 영역 → 슬라이드 전진 */
    const tap = this.add.zone(W/2, cY+cH/2+10, cW-70, cH-90).setInteractive();
    tap.on('pointerdown', () => {
      if (cur < slides.length-1) { cur++; render(cur); upd(); }
      else this._closeModal(cont);
    });
    cont.add(tap);

    render(0); upd();

    /* 등장 */
    cont.setAlpha(0);
    this.tweens.add({ targets:cont, alpha:1, duration:240, ease:'Power2' });

    return cont;
  }

  _navBtn(container, x, y, label, colorHex, onClick) {
    const ci = parseInt(colorHex.replace('#','0x'));
    const bg = this.add.graphics();
    bg.fillStyle(ci, 0.12); bg.fillCircle(x, y, 22);
    bg.lineStyle(1.5, ci, 0.45); bg.strokeCircle(x, y, 22);
    container.add(bg);
    const t = this.add.text(x, y, label, {
      fontFamily:'Nunito', fontSize:'15px', color:colorHex, fontStyle:'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    t.on('pointerdown', onClick);
    container.add(t);
    return t;
  }

  _closeModal(container) {
    this.tweens.add({
      targets: container, alpha:0, duration:200,
      onComplete: () => { container.destroy(); this._activeModal = null; },
    });
  }

  /* ══════════════════════════════════════
     게임 시작
  ══════════════════════════════════════ */
  _startGame() {
    this.cameras.main.fadeOut(550, 0, 10, 5);
    this.time.delayedCall(550, () => {
      gameState.newGame();
      this.scene.start('IslandScene');
    });
  }
}
