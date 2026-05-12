/* ============================================================
   DexScene.js - 업사이클 도감 씬
   플레이어가 제작한 건축물 기록을 보여주는 컬렉션 화면
   ============================================================ */

class DexScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DexScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = CONFIG;
    this._drawBackground(WIDTH, HEIGHT);
    this._buildHeader(WIDTH);
    this._buildGrid(WIDTH, HEIGHT);
    this._buildBackButton(WIDTH, HEIGHT);
  }

  _drawBackground(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x0A1A2A, 1);
    g.fillRect(0, 0, W, H);

    // 별 느낌 장식
    g.fillStyle(0xFFFFFF, 0.06);
    for (let i = 0; i < 30; i++) {
      g.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 4)
      );
    }
  }

  _buildHeader(W) {
    this.add.text(W / 2, 28, '📚 업사이클 도감', {
      ...CONFIG.TEXT.HEAD, fontSize: '22px',
    }).setOrigin(0.5);

    const total   = RECIPES.length;
    const crafted = gameState.getUniqueBuiltCount();
    const totalBuilt = Object.values(gameState.buildingCounts || {}).reduce((a, v) => a + v, 0);
    const pct     = Math.round((crafted / total) * 100);

    this.add.text(W / 2, 56, `${crafted} / ${total} 완성 (${pct}%) · 총 제작 ${totalBuilt}회`, {
      fontFamily: 'Nunito', fontSize: '14px', color: '#88DDAA',
    }).setOrigin(0.5);

    // 완성도 바
    const barX = 24, barY = 74, barW = W - 48, barH = 10;
    const bg = this.add.graphics();
    bg.fillStyle(0x1A3A2A, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 4);

    bg.fillStyle(CONFIG.COLORS.MINT, 1);
    bg.fillRoundedRect(barX, barY, barW * (crafted / total), barH, 4);
  }

  _buildGrid(W, H) {
    const startY = 96;
    const cols   = 2;
    const cardW  = (W - 32) / cols;
    const cardH  = 140;
    const gap    = 8;

    const container = this.add.container(0, 0);
    let offsetY = 0;

    RECIPES.forEach((recipe, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = 12 + col * (cardW + gap);
      const cy   = startY + row * (cardH + gap);
      const done = gameState.getBuildingCount(recipe.id) > 0;

      this._buildDexCard(container, recipe, cx, cy, cardW, cardH, done);
    });

    // 스크롤
    const rows   = Math.ceil(RECIPES.length / cols);
    const totalH = rows * (cardH + gap);
    const minY   = -(totalH - (H - startY - 70));
    let lastY = 0;

    this.input.on('pointerdown', (p) => { lastY = p.y; });
    this.input.on('pointermove',  (p) => {
      if (!p.isDown) return;
      const dy = p.y - lastY;
      lastY    = p.y;
      offsetY  = Phaser.Math.Clamp(offsetY + dy, Math.min(minY, 0), 0);
      container.setY(offsetY);
    });
  }

  _buildDexCard(container, recipe, x, y, w, h, done) {
    const bg = this.add.graphics();

    if (done) {
      // 완성 카드: 밝고 컬러풀
      bg.fillStyle(0x1A3A2A, 1);
      bg.fillRoundedRect(x, y, w, h, 10);
      bg.lineStyle(2, CONFIG.COLORS.MINT, 0.7);
      bg.strokeRoundedRect(x, y, w, h, 10);
    } else {
      // 미완성: 잠금 상태
      bg.fillStyle(0x111122, 1);
      bg.fillRoundedRect(x, y, w, h, 10);
      bg.lineStyle(1.5, 0x223322, 0.4);
      bg.strokeRoundedRect(x, y, w, h, 10);
    }
    container.add(bg);

    if (done) {
      const craftedData = gameState.craftedItems.find(c => c.id === recipe.id);
      const craftCount = gameState.getBuildingCount(recipe.id);

      // 이모지
      const emojiTxt = this.add.text(x + w / 2, y + 30, recipe.emoji, {
        fontSize: '34px',
      }).setOrigin(0.5);
      container.add(emojiTxt);

      // 이름
      container.add(
        this.add.text(x + w / 2, y + 64, recipe.name, {
          fontFamily: 'Jua', fontSize: '14px', color: '#AAFFCC',
        }).setOrigin(0.5)
      );

      // 효과
      container.add(
        this.add.text(x + w / 2, y + 84, `✨ ${recipe.effect}`, {
          fontFamily: 'Nunito', fontSize: '11px', color: '#88DDAA',
        }).setOrigin(0.5)
      );

      // 사용 재료
      const mats = Object.keys(recipe.ingredients).map(t =>
        BIN_DEFS.find(b => b.type === t)?.emoji || '?'
      ).join(' ');
      container.add(
        this.add.text(x + w / 2, y + 100, mats, {
          fontFamily: 'Nunito', fontSize: '16px',
        }).setOrigin(0.5)
      );

      container.add(
        this.add.text(x + w / 2, y + 116, `🧱 제작 ${craftCount}회`, {
          fontFamily: 'Nunito', fontSize: '10px', color: '#A5D6A7',
        }).setOrigin(0.5)
      );

      // 제작일
      if (craftedData?.craftedAt) {
        container.add(
          this.add.text(x + w / 2, y + 130, `📅 ${craftedData.craftedAt}`, {
            fontFamily: 'Nunito', fontSize: '9px', color: '#556655',
          }).setOrigin(0.5)
        );
      }

      // CO2 절약
      container.add(
        this.add.text(x + w - 8, y + 10, `🌿-${recipe.co2Saved}kg`, {
          fontFamily: 'Nunito', fontSize: '10px', color: '#55FF99',
        }).setOrigin(1, 0)
      );

    } else {
      // 잠금 상태
      container.add(
        this.add.text(x + w / 2, y + 38, '🔒', { fontSize: '36px' }).setOrigin(0.5)
      );
      container.add(
        this.add.text(x + w / 2, y + 80, recipe.name, {
          fontFamily: 'Nunito', fontSize: '13px', color: '#334433',
        }).setOrigin(0.5)
      );
      container.add(
        this.add.text(x + w / 2, y + 100, '미완성', {
          fontFamily: 'Nunito', fontSize: '11px', color: '#334433',
        }).setOrigin(0.5)
      );
    }
  }

  _buildBackButton(W, H) {
    const bg = this.add.graphics();
    bg.fillStyle(CONFIG.COLORS.PANEL, 0.95);
    bg.fillRect(0, H - 60, W, 60);
    bg.lineStyle(1, CONFIG.COLORS.MINT, 0.3);
    bg.lineBetween(0, H - 60, W, H - 60);

    this.add.zone(W / 2, H - 30, W - 40, 50)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('IslandScene'));

    this.add.text(W / 2, H - 30, '← 섬으로 돌아가기', {
      fontFamily: 'Jua', fontSize: '17px', color: '#AAFFCC',
    }).setOrigin(0.5);
  }
}
