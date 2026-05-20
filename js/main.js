/* ============================================================
   main.js - Phaser 3 게임 진입점
   ★ TutorialScene 추가됨
   ============================================================ */

const phaserConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0A2A1A',

  scale: {
    mode:         Phaser.Scale.FIT,
    autoCenter:   Phaser.Scale.CENTER_BOTH,
    width:        CONFIG.WIDTH,
    height:       CONFIG.HEIGHT,
    expandParent: false,
    min: { width: 240, height: 427 },
    max: { width: 960, height: 1708 },
  },

  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },

  scene: [
    BootScene,
    MenuScene,
    IslandScene,
    WashScene,
    SortScene,
    CraftScene,
    DexScene,
    EndingScene,
    //TutorialScene,   // ★ 추가
  ],

  input: { activePointers: 2 },

  render: {
    antialias:        true,
    pixelArt:         false,
    roundPixels:      false,
    transparent:      false,
    clearBeforeRender:true,
  },

  parent: 'game-container',
};

window.addEventListener('DOMContentLoaded', () => {
  const loadingEl = document.getElementById('loading-screen');
  const game = new Phaser.Game(phaserConfig);

  game.events.once('ready', () => {
    if (loadingEl) {
      loadingEl.style.transition = 'opacity 0.5s';
      loadingEl.style.opacity    = '0';
      setTimeout(() => loadingEl.remove(), 500);
    }
  });

  window.__game      = game;
  window.__gameState = gameState;
});