/* ============================================================
   GameState.js - 전역 게임 상태 관리자
   모든 씬이 공유하는 단일 상태 객체 (싱글톤)
   ============================================================ */

class GameState {
  constructor() {
    this._reset();
  }

  /* ─── 초기화 ─── */
  _reset() {
    // 보유 자원
    this.resources = { plastic: 0, glass: 0, metal: 0, paper: 0 };

    // 수거한 쓰레기 임시 보관함 (세척·분류 전)
    this.inventory = []; // TrashItem 배열

    // 섬 상태
    this.pollution = CONFIG.POLLUTION.MAX; // 100 = 최악, 0 = 완전 복구
    this.buildings = [];                   // 건축된 건물 목록
    this.buildingCounts = {};              // 건물별 제작 횟수

    // 점수
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.ecoFeverMode = false;
    this.ecoFeverEndTime = 0;

    // 통계
    this.totalRecycled  = 0; // 총 재활용 아이템 수
    this.savedCO2       = 0; // 절약한 CO2 (kg)
    this.craftedItems   = []; // 제작한 건물 기록 (도감용)

    // 플레이 시간
    this.playStartTime  = Date.now();
  }

  /* ─── 새 게임 ─── */
  newGame() {
    this._reset();
    localStorage.removeItem('reborn_island_save');
  }

  /* ─── 자원 추가 ─── */
  addResource(type, amount = 1) {
    if (this.resources.hasOwnProperty(type)) {
      this.resources[type] += amount;
      this.totalRecycled += amount;
      // 타입별 CO2 절약량
      const co2Map = { plastic: 0.3, glass: 0.5, metal: 0.8, paper: 0.2 };
      this.savedCO2 += (co2Map[type] || 0.1) * amount;
    }
  }

  /* ─── 자원 소모 (제작 시) ─── */
  consumeResources(ingredients) {
    for (const [type, qty] of Object.entries(ingredients)) {
      if (!this.resources.hasOwnProperty(type) || this.resources[type] < qty) {
        return false; // 자원 부족
      }
    }
    for (const [type, qty] of Object.entries(ingredients)) {
      this.resources[type] -= qty;
    }
    return true;
  }

  /* ─── 자원 충분한지 확인 ─── */
  canCraft(recipe) {
    for (const [type, qty] of Object.entries(recipe.ingredients)) {
      if ((this.resources[type] || 0) < qty) return false;
    }
    const limit = recipe.stackLimit || 3;
    return this.getBuildingCount(recipe.id) < limit;
  }

  /* ─── 점수 추가 (에코 피버 배율 적용) ─── */
  addScore(points) {
    const now = Date.now();
    if (this.ecoFeverMode && now < this.ecoFeverEndTime) {
      this.score += points * CONFIG.COMBO.ECO_FEVER_MULTIPLIER;
    } else {
      if (this.ecoFeverMode) this.ecoFeverMode = false; // 피버 시간 종료
      this.score += points;
    }
  }

  /* ─── 콤보 증가 ─── */
  increaseCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // 10콤보 이상 → 에코 피버 모드
    if (this.combo >= CONFIG.COMBO.ECO_FEVER_THRESHOLD && !this.ecoFeverMode) {
      this.ecoFeverMode = true;
      this.ecoFeverEndTime = Date.now() + CONFIG.COMBO.ECO_FEVER_DURATION;
    }
  }

  /* ─── 콤보 초기화 ─── */
  resetCombo() {
    this.combo = 0;
    this.ecoFeverMode = false;
  }

  /* ─── 오염도 감소 ─── */
  reducePollution(amount) {
    this.pollution = Math.max(CONFIG.POLLUTION.MIN, this.pollution - amount);
  }

  /* ─── 오염도 증가 (실패 패널티) ─── */
  increasePollution(amount) {
    const mitigation = this.getTotalPollutionMitigation();
    const scaled = amount * (1 - mitigation);
    this.pollution = Math.min(CONFIG.POLLUTION.MAX, this.pollution + scaled);
  }

  /* ─── 건물 추가 ─── */
  addBuilding(recipe) {
    this.buildings.push(recipe.id);
    this.buildingCounts[recipe.id] = (this.buildingCounts[recipe.id] || 0) + 1;
    const count = this.buildingCounts[recipe.id];
    const restoreScale = Math.pow(0.72, Math.max(0, count - 1));
    const instantRestore = Math.max(1, Math.round(recipe.islandEffect.colorRestore * 0.7 * restoreScale));

    this.craftedItems.push({
      id:          recipe.id,
      name:        recipe.name,
      emoji:       recipe.emoji,
      usedTypes:   Object.keys(recipe.ingredients),
      effect:      recipe.effect,
      count,
      craftedAt:   new Date().toLocaleDateString('ko-KR'),
    });
    this.reducePollution(instantRestore);
    this.score += CONFIG.SCORE.CRAFT_BONUS;
    return instantRestore;
  }

  getBuildingCount(recipeId) {
    return this.buildingCounts[recipeId] || 0;
  }

  getUniqueBuiltCount() {
    return Object.keys(this.buildingCounts).length;
  }

  getTotalPollutionMitigation() {
    let total = 0;
    for (const [id, count] of Object.entries(this.buildingCounts)) {
      const base = this.getRecipeMitigationBase(id);
      for (let i = 0; i < count; i++) {
        total += base * Math.pow(0.72, i);
      }
    }

    // 조합 시너지
    if (this.getBuildingCount('solar_lamp') > 0 && this.getBuildingCount('windmill') > 0) total += 0.08;
    if (this.getBuildingCount('water_purifier') > 0 && this.getBuildingCount('greenhouse') > 0) total += 0.06;
    if (this.getBuildingCount('eco_house') > 0 && this.getBuildingCount('solar_lamp') > 0) total += 0.05;

    return Math.min(0.55, total);
  }

  getAutoResourceTicks() {
    const weighted = [];
    const pushWeighted = (type, count) => {
      for (let i = 0; i < count; i++) weighted.push(type);
    };

    const c = (id) => this.getBuildingCount(id);
    pushWeighted('metal', c('windmill') * 3);
    pushWeighted('paper', c('greenhouse') * 2);
    pushWeighted('glass', c('water_purifier') * 3);
    pushWeighted('plastic', c('solar_lamp') * 2);
    pushWeighted('paper', c('paper_garden') * 2);
    pushWeighted('metal', c('eco_bench'));
    pushWeighted('plastic', c('eco_house') * 2);

    if (weighted.length === 0) return [];

    // 기본 1회 + 스택 점감 보너스(최대 +2)
    const totalBuildings = Object.values(this.buildingCounts).reduce((a, v) => a + v, 0);
    const extra = Math.min(2, Math.floor(totalBuildings / 4));
    const gainCount = 1 + extra;
    const result = [];
    for (let i = 0; i < gainCount; i++) {
      result.push(weighted[Math.floor(Math.random() * weighted.length)]);
    }

    // 조합 시너지 추가 지급
    if (c('water_purifier') > 0 && c('greenhouse') > 0) result.push(Math.random() < 0.5 ? 'glass' : 'paper');
    return result;
  }

  getRecipeMitigationBase(recipeId) {
    return {
      solar_lamp: 0.06,
      eco_bench: 0.03,
      paper_garden: 0.04,
      windmill: 0.10,
      greenhouse: 0.07,
      water_purifier: 0.12,
      eco_house: 0.08,
    }[recipeId] || 0;
  }

  getRecipePurificationBase(recipeId) {
    return {
      solar_lamp: 0.35,
      eco_bench: 0.22,
      paper_garden: 0.30,
      windmill: 0.60,
      greenhouse: 0.52,
      water_purifier: 0.85,
      eco_house: 0.75,
    }[recipeId] || 0;
  }

  getRecipeAutoGainHint(recipeId) {
    return {
      solar_lamp: '25초마다 플라스틱 수급 확률 증가',
      eco_bench: '25초마다 금속 수급 확률 소폭 증가',
      paper_garden: '25초마다 종이 수급 확률 증가',
      windmill: '25초마다 금속 수급 확률 크게 증가',
      greenhouse: '25초마다 종이 수급 확률 증가',
      water_purifier: '25초마다 유리 수급 확률 크게 증가',
      eco_house: '25초마다 플라스틱 수급 확률 증가',
    }[recipeId] || '패시브 효과 없음';
  }

  getActiveSynergyLabels() {
    const labels = [];
    if (this.getBuildingCount('solar_lamp') > 0 && this.getBuildingCount('windmill') > 0) {
      labels.push('💡+🌀 스마트 그리드');
    }
    if (this.getBuildingCount('water_purifier') > 0 && this.getBuildingCount('greenhouse') > 0) {
      labels.push('💧+🌿 블루-그린 루프');
    }
    if (this.getBuildingCount('eco_house') > 0 && this.getBuildingCount('solar_lamp') > 0) {
      labels.push('🏠+💡 에너지 자립 주거');
    }
    return labels;
  }

  getPurificationPerTick() {
    let total = 0;
    for (const [id, count] of Object.entries(this.buildingCounts)) {
      const base = this.getRecipePurificationBase(id);
      for (let i = 0; i < count; i++) {
        total += base * Math.pow(0.72, i);
      }
    }

    if (this.getBuildingCount('solar_lamp') > 0 && this.getBuildingCount('windmill') > 0) total += 0.5;
    if (this.getBuildingCount('water_purifier') > 0 && this.getBuildingCount('greenhouse') > 0) total += 0.8;
    if (this.getBuildingCount('eco_house') > 0 && this.getBuildingCount('solar_lamp') > 0) total += 0.6;
    return total;
  }

  isPollutionStabilized() {
    const uniqueBuilt = this.getUniqueBuiltCount();
    const synergyCount = this.getActiveSynergyLabels().length;
    return uniqueBuilt >= RECIPES.length || (uniqueBuilt >= 5 && synergyCount >= 2 && this.pollution <= 20);
  }

  getEndingByPollution() {
    const p = this.pollution;
    if (p <= 5) {
      return { title: '완전 복원 엔딩', emoji: '🌍', color: '#FFE66D', desc: '플라스틱 아일랜드를 생태섬으로 되돌렸습니다.' };
    }
    if (p <= 20) {
      return { title: '희망의 섬 엔딩', emoji: '🌏', color: '#00C896', desc: '오염을 안정화하고 회복 궤도에 올렸습니다.' };
    }
    if (p <= 45) {
      return { title: '버틴 섬 엔딩', emoji: '♻️', color: '#4FC3F7', desc: '붕괴는 막았지만 아직 큰 정화가 필요합니다.' };
    }
    if (p <= 70) {
      return { title: '위태로운 섬 엔딩', emoji: '⚠️', color: '#FFB74D', desc: '일부 성과는 있었지만 오염이 우세합니다.' };
    }
    return { title: '침식된 섬 엔딩', emoji: '💀', color: '#FF6B6B', desc: '정화 속도가 오염 확산을 넘지 못했습니다.' };
  }

  /* ─── 등급 계산 ─── */
  getGrade() {
    return this.getEndingByPollution();
  }

  /* ─── 플레이 시간 ─── */
  getPlayTime() {
    const ms = Date.now() - this.playStartTime;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}분 ${sec}초`;
  }

  /* ─── 저장 (localStorage) ─── */
  save() {
    const data = {
      resources:    this.resources,
      pollution:    this.pollution,
      score:        this.score,
      totalRecycled:this.totalRecycled,
      savedCO2:     this.savedCO2,
      craftedItems: this.craftedItems,
      buildings:    this.buildings,
      buildingCounts:this.buildingCounts,
    };
    try {
      localStorage.setItem('reborn_island_save', JSON.stringify(data));
    } catch (e) {
      console.warn('저장 실패:', e);
    }
  }

  /* ─── 불러오기 ─── */
  load() {
    try {
      const raw = localStorage.getItem('reborn_island_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(this, data);
      if (!this.buildingCounts || typeof this.buildingCounts !== 'object') {
        this.buildingCounts = {};
        (this.buildings || []).forEach((id) => {
          this.buildingCounts[id] = (this.buildingCounts[id] || 0) + 1;
        });
      }
      return true;
    } catch (e) {
      console.warn('불러오기 실패:', e);
      return false;
    }
  }
}

/* 전역 싱글톤 인스턴스 - 모든 씬에서 gameState 로 접근 */
const gameState = new GameState();
