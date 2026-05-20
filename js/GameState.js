/* ============================================================
   GameState.js - 전역 게임 상태 관리자
   ★ difficulty 필드 + gameOver 플래그 + getDifficultyConfig() 추가
   ============================================================ */

class GameState {
  constructor() {
    this._reset();
  }

  _reset() {
    this.resources      = { plastic: 0, glass: 0, metal: 0, paper: 0 };
    this.inventory      = [];
    this.pollution      = CONFIG.POLLUTION.START;
    this.buildings      = [];
    this.buildingCounts = {};

    this.score        = 0;
    this.combo        = 0;
    this.maxCombo     = 0;
    this.ecoFeverMode    = false;
    this.ecoFeverEndTime = 0;

    this.totalRecycled = 0;
    this.savedCO2      = 0;
    this.craftedItems  = [];

    this.playStartTime = Date.now();

    /* ★ 난이도 & 게임오버 */
    this.difficulty = 'normal';   // 'easy' | 'normal' | 'hard'
    this.gameOver   = false;      // true = 강제 종료 엔딩
  }

  newGame() {
    this._reset();
    localStorage.removeItem('reborn_island_save');
  }

  /* ★ 현재 난이도 설정 반환 */
  getDifficultyConfig() {
    const key = (this.difficulty || 'normal').toUpperCase();
    return CONFIG.DIFFICULTY[key] || CONFIG.DIFFICULTY.NORMAL;
  }

  /* ─── 자원 추가 ─── */
  addResource(type, amount = 1) {
    if (this.resources.hasOwnProperty(type)) {
      this.resources[type] += amount;
      this.totalRecycled += amount;
      const co2Map = { plastic: 0.3, glass: 0.5, metal: 0.8, paper: 0.2 };
      this.savedCO2 += (co2Map[type] || 0.1) * amount;
    }
  }

  consumeResources(ingredients) {
    for (const [type, qty] of Object.entries(ingredients)) {
      if (!this.resources.hasOwnProperty(type) || this.resources[type] < qty) return false;
    }
    for (const [type, qty] of Object.entries(ingredients)) {
      this.resources[type] -= qty;
    }
    return true;
  }

  canCraft(recipe) {
    for (const [type, qty] of Object.entries(recipe.ingredients)) {
      if ((this.resources[type] || 0) < qty) return false;
    }
    return this.getBuildingCount(recipe.id) < (recipe.stackLimit || 3);
  }

  addScore(points) {
    const now = Date.now();
    if (this.ecoFeverMode && now < this.ecoFeverEndTime) {
      this.score += points * CONFIG.COMBO.ECO_FEVER_MULTIPLIER;
    } else {
      if (this.ecoFeverMode) this.ecoFeverMode = false;
      this.score += points;
    }
  }

  increaseCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo >= CONFIG.COMBO.ECO_FEVER_THRESHOLD && !this.ecoFeverMode) {
      this.ecoFeverMode    = true;
      this.ecoFeverEndTime = Date.now() + CONFIG.COMBO.ECO_FEVER_DURATION;
    }
  }

  resetCombo() {
    this.combo        = 0;
    this.ecoFeverMode = false;
  }

  reducePollution(amount) {
    this.pollution = Math.max(CONFIG.POLLUTION.MIN, this.pollution - amount);
  }

  increasePollution(amount) {
    const mitigation = this.getTotalPollutionMitigation();
    const scaled     = amount * (1 - mitigation);
    this.pollution   = Math.min(CONFIG.POLLUTION.MAX, this.pollution + scaled);
  }

  shouldTriggerPollutionGameOver() {
    const cfg = this.getDifficultyConfig();
    return cfg.gameOver && this.pollution >= CONFIG.POLLUTION.GAMEOVER_AT;
  }

  addBuilding(recipe) {
    this.buildings.push(recipe.id);
    this.buildingCounts[recipe.id] = (this.buildingCounts[recipe.id] || 0) + 1;
    const count        = this.buildingCounts[recipe.id];
    const restoreScale = Math.pow(0.72, Math.max(0, count - 1));
    const restore      = Math.max(1, Math.round(recipe.islandEffect.colorRestore * 0.7 * restoreScale));
    this.craftedItems.push({
      id: recipe.id, name: recipe.name, emoji: recipe.emoji,
      usedTypes: Object.keys(recipe.ingredients), effect: recipe.effect,
      count, craftedAt: new Date().toLocaleDateString('ko-KR'),
    });
    this.reducePollution(restore);
    this.score += CONFIG.SCORE.CRAFT_BONUS;
    return restore;
  }

  getBuildingCount(id)   { return this.buildingCounts[id] || 0; }
  getUniqueBuiltCount()  { return Object.keys(this.buildingCounts).length; }

  getTotalPollutionMitigation() {
    let total = 0;
    for (const [id, count] of Object.entries(this.buildingCounts)) {
      const base = this.getRecipeMitigationBase(id);
      for (let i = 0; i < count; i++) total += base * Math.pow(0.72, i);
    }
    if (this.getBuildingCount('solar_lamp')    > 0 && this.getBuildingCount('windmill')        > 0) total += 0.08;
    if (this.getBuildingCount('water_purifier') > 0 && this.getBuildingCount('greenhouse')      > 0) total += 0.06;
    if (this.getBuildingCount('eco_house')      > 0 && this.getBuildingCount('solar_lamp')      > 0) total += 0.05;
    return Math.min(0.55, total);
  }

  getAutoResourceTicks() {
    const weighted = [];
    const push = (type, n) => { for (let i=0;i<n;i++) weighted.push(type); };
    const c = (id) => this.getBuildingCount(id);
    push('metal',   c('windmill') * 3);
    push('paper',   c('greenhouse') * 2);
    push('glass',   c('water_purifier') * 3);
    push('plastic', c('solar_lamp') * 2);
    push('paper',   c('paper_garden') * 2);
    push('metal',   c('eco_bench'));
    push('plastic', c('eco_house') * 2);
    if (!weighted.length) return [];
    const totalBuildings = Object.values(this.buildingCounts).reduce((a,v)=>a+v,0);
    const extra = Math.min(2, Math.floor(totalBuildings / 4));
    const result = [];
    for (let i=0; i<1+extra; i++) result.push(weighted[Math.floor(Math.random()*weighted.length)]);
    if (c('water_purifier')>0 && c('greenhouse')>0) result.push(Math.random()<0.5?'glass':'paper');
    return result;
  }

  getRecipeMitigationBase(id) {
    return { solar_lamp:0.06, eco_bench:0.03, paper_garden:0.04, windmill:0.10,
             greenhouse:0.07, water_purifier:0.12, eco_house:0.08 }[id] || 0;
  }

  getRecipePurificationBase(id) {
    return { solar_lamp:0.35, eco_bench:0.22, paper_garden:0.30, windmill:0.60,
             greenhouse:0.52, water_purifier:0.85, eco_house:0.75 }[id] || 0;
  }

  getRecipeAutoGainHint(id) {
    return { solar_lamp:'25초마다 플라스틱 수급 확률 증가',
             eco_bench:'25초마다 금속 수급 확률 소폭 증가',
             paper_garden:'25초마다 종이 수급 확률 증가',
             windmill:'25초마다 금속 수급 확률 크게 증가',
             greenhouse:'25초마다 종이 수급 확률 증가',
             water_purifier:'25초마다 유리 수급 확률 크게 증가',
             eco_house:'25초마다 플라스틱 수급 확률 증가' }[id] || '패시브 효과 없음';
  }

  getActiveSynergyLabels() {
    const labels = [];
    if (this.getBuildingCount('solar_lamp')>0    && this.getBuildingCount('windmill')>0)        labels.push('💡+🌀 스마트 그리드');
    if (this.getBuildingCount('water_purifier')>0 && this.getBuildingCount('greenhouse')>0)     labels.push('💧+🌿 블루-그린 루프');
    if (this.getBuildingCount('eco_house')>0      && this.getBuildingCount('solar_lamp')>0)     labels.push('🏠+💡 에너지 자립 주거');
    return labels;
  }

  getPurificationPerTick() {
    let total = 0;
    for (const [id, count] of Object.entries(this.buildingCounts)) {
      const base = this.getRecipePurificationBase(id);
      for (let i=0;i<count;i++) total += base * Math.pow(0.72,i);
    }
    if (this.getBuildingCount('solar_lamp')>0    && this.getBuildingCount('windmill')>0)    total += 0.5;
    if (this.getBuildingCount('water_purifier')>0 && this.getBuildingCount('greenhouse')>0) total += 0.8;
    if (this.getBuildingCount('eco_house')>0      && this.getBuildingCount('solar_lamp')>0) total += 0.6;
    return total;
  }

  isPollutionStabilized() {
    const u = this.getUniqueBuiltCount();
    const s = this.getActiveSynergyLabels().length;
    return u >= RECIPES.length || (u >= 5 && s >= 2 && this.pollution <= 20);
  }

  /* ★ 게임오버 엔딩 포함 5+1 단계 */
  getEndingByPollution() {
    if (this.gameOver) {
      return {
        title: '☠️ 게임오버',
        emoji: '☠️',
        color: '#FF0000',
        desc:  '오염도가 150%에 도달했습니다.\n섬은 완전히 침몰했습니다.\n\n더 빨리 건물을 지어 오염을 막아야 했어요.',
        isGameOver: true,
      };
    }
    const p = this.pollution;
    if (p <= 5)  return { title:'완전 복원 엔딩',  emoji:'🌍', color:'#FFE66D', desc:'플라스틱 아일랜드를 생태섬으로 되돌렸습니다.' };
    if (p <= 20) return { title:'희망의 섬 엔딩',  emoji:'🌏', color:'#00C896', desc:'오염을 안정화하고 회복 궤도에 올렸습니다.' };
    if (p <= 45) return { title:'버틴 섬 엔딩',    emoji:'♻️', color:'#4FC3F7', desc:'붕괴는 막았지만 아직 큰 정화가 필요합니다.' };
    if (p <= 70) return { title:'위태로운 섬 엔딩', emoji:'⚠️', color:'#FFB74D', desc:'일부 성과는 있었지만 오염이 우세합니다.' };
    return       { title:'침식된 섬 엔딩',    emoji:'💀', color:'#FF6B6B', desc:'정화 속도가 오염 확산을 넘지 못했습니다.' };
  }

  getGrade()    { return this.getEndingByPollution(); }

  getPlayTime() {
    const ms  = Date.now() - this.playStartTime;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}분 ${sec}초`;
  }

  save() {
    const data = {
      resources: this.resources, pollution: this.pollution,
      score: this.score, totalRecycled: this.totalRecycled,
      savedCO2: this.savedCO2, craftedItems: this.craftedItems,
      buildings: this.buildings, buildingCounts: this.buildingCounts,
      difficulty: this.difficulty,
    };
    try { localStorage.setItem('reborn_island_save', JSON.stringify(data)); }
    catch (e) { console.warn('저장 실패:', e); }
  }

  load() {
    try {
      const raw = localStorage.getItem('reborn_island_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(this, data);
      if (!this.buildingCounts || typeof this.buildingCounts !== 'object') {
        this.buildingCounts = {};
        (this.buildings || []).forEach(id => {
          this.buildingCounts[id] = (this.buildingCounts[id] || 0) + 1;
        });
      }
      if (!this.difficulty) this.difficulty = 'normal';
      return true;
    } catch (e) { console.warn('불러오기 실패:', e); return false; }
  }
}

const gameState = new GameState();
