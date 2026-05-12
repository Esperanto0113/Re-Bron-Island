/* ============================================================
   TrashItem.js - 쓰레기 아이템 데이터 모델
   게임 세계의 모든 쓰레기 아이템을 표현합니다.
   ============================================================ */

let _trashIdCounter = 0; // 고유 ID 카운터

class TrashItem {
  /**
   * @param {string} type   - 'plastic' | 'glass' | 'metal' | 'paper'
   * @param {boolean} isDirty - 오염된 아이템인지 여부
   */
  constructor(type, isDirty) {
    this.id      = _trashIdCounter++;
    this.type    = type;
    this.isDirty = isDirty;
    this.weight  = +(Math.random() * 0.5 + 0.5).toFixed(2); // 0.50 ~ 1.00 kg
    this.washed  = false; // 세척 완료 여부
  }

  /* ─── 타입별 기본 색상 (0x 정수) ─── */
  getColor() {
    return {
      plastic: CONFIG.COLORS.PLASTIC,
      glass:   CONFIG.COLORS.GLASS,
      metal:   CONFIG.COLORS.METAL,
      paper:   CONFIG.COLORS.PAPER,
    }[this.type] || 0xCCCCCC;
  }

  /* ─── 오염 색 ─── */
  getDirtyColor() {
    return CONFIG.COLORS.DIRTY;
  }

  /* ─── 표시 색 (더티 여부 반영) ─── */
  displayColor() {
    return (this.isDirty && !this.washed) ? this.getDirtyColor() : this.getColor();
  }

  /* ─── 한국어 이름 ─── */
  getKoreanName() {
    return { plastic: '플라스틱', glass: '유리', metal: '금속', paper: '종이' }[this.type] || '?';
  }

  /* ─── 이모지 ─── */
  getEmoji() {
    return { plastic: '🥤', glass: '🍶', metal: '🥫', paper: '📄' }[this.type] || '🗑️';
  }

  /* ─── CO2 절약량 (kg) ─── */
  getCO2Saved() {
    return { plastic: 0.3, glass: 0.5, metal: 0.8, paper: 0.2 }[this.type] || 0.1;
  }

  /* ─── 아이템 상태 텍스트 ─── */
  getStatusText() {
    if (this.isDirty && !this.washed) return '오염됨 🚫';
    return '세척완료 ✅';
  }
}

/* ─── 팩토리 함수 ─── */
/**
 * 랜덤 또는 지정 타입의 TrashItem을 생성합니다.
 * @param {string} [type]    - 타입 지정 (미입력 시 랜덤)
 * @param {boolean} [isDirty] - 오염 여부 (미입력 시 확률로 결정)
 * @returns {TrashItem}
 */
function createTrashItem(type, isDirty) {
  const t = type || Phaser.Utils.Array.GetRandom(CONFIG.TRASH_TYPES);
  const d = isDirty !== undefined ? isDirty : Math.random() < CONFIG.WASH.DIRTY_CHANCE;
  return new TrashItem(t, d);
}

/* ─── 분리수거함 정의 ─── */
const BIN_DEFS = [
  { type: 'plastic', label: '플라스틱', color: CONFIG.COLORS.PLASTIC, emoji: '🥤' },
  { type: 'paper',   label: '종이',     color: CONFIG.COLORS.PAPER,   emoji: '📄' },
  { type: 'metal',   label: '금속',     color: CONFIG.COLORS.METAL,   emoji: '🥫' },
  { type: 'glass',   label: '유리',     color: CONFIG.COLORS.GLASS,   emoji: '🍶' },
];
