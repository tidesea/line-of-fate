import { factionPool, UNIT_DEFS } from "../config/units.config";
import type { Faction, UnitKey } from "../config/units.config";
import type { GameState, UnitState } from "../core/types";
import { GridSystem } from "../core/GridSystem";
import type { LevelDefinition } from "../config/levels.config";

export class AIDecisionTree {
  static chooseDeployment(state: GameState, faction: Faction): UnitKey | null {
    const affordable = factionPool(faction).filter(key => UNIT_DEFS[key].cost <= state.resources[faction]);
    if (!affordable.length) return null;
    const nexusThreat = state.nexus.faction && state.nexus.faction !== faction;
    const preferred = nexusThreat
      ? affordable.filter(key => ["guard", "marksman", "soldier", "boomer", "stalker", "abomination"].includes(key))
      : affordable;
    const base = preferred.length ? preferred : affordable;
    // Don't spam 1-cost fodder once we can afford real units.
    const pool = state.resources[faction] >= 3 && base.some(key => UNIT_DEFS[key].cost > 1) ? base.filter(key => UNIT_DEFS[key].cost > 1) : base;
    if (state.resources[faction] >= 6) return pool.slice().sort((a, b) => UNIT_DEFS[b].cost - UNIT_DEFS[a].cost)[0];
    const meleeCount = state.units.filter(u => u.faction === faction && UNIT_DEFS[u.key].maxRange === 1).length;
    const rangedCount = state.units.filter(u => u.faction === faction && UNIT_DEFS[u.key].maxRange > 1).length;
    const shaped = pool.filter(key => meleeCount <= rangedCount ? UNIT_DEFS[key].maxRange === 1 : UNIT_DEFS[key].maxRange > 1);
    const finalPool = shaped.length ? shaped : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  static chooseDeployCell(state: GameState, faction: Faction, level: LevelDefinition) {
    const columns = faction === "human" ? [1, 0] : [level.cols - 2, level.cols - 1];
    const center = level.nexus.row;
    const rows = Array.from({ length: level.rows }, (_, index) => center + (index % 2 === 0 ? Math.ceil(index / 2) : -Math.ceil(index / 2))).filter(row => row >= 0 && row < level.rows);
    for (const row of rows) for (const col of columns) {
      if (!GridSystem.isBlocked(col, row, state.units, level, undefined, state.consumedCrates)) return { col, row };
    }
    return null;
  }

  static chooseTarget(unit: UnitState, enemies: UnitState[], level: LevelDefinition) {
    return enemies.slice().sort((a, b) => this.score(unit, b, level) - this.score(unit, a, level))[0] || null;
  }

  private static score(unit: UnitState, target: UnitState, level: LevelDefinition) {
    const def = UNIT_DEFS[unit.key];
    const dist = GridSystem.chebyshev(unit, target);
    const hill = target.col === level.nexus.col && target.row === level.nexus.row ? 100 : 0;
    const killable = target.hp <= def.attack ? 50 : 0;
    const threat = ["soldier", "marksman", "specialist", "vehicle", "boomer", "mother"].includes(target.key) ? 30 : 0;
    return hill + killable + threat - dist * 3;
  }

  static chooseMove(unit: UnitState, target: UnitState, state: GameState, level: LevelDefinition) {
    const def = UNIT_DEFS[unit.key];
    const candidates = GridSystem.cellsWithin(unit, def.move, level).filter(cell =>
      GridSystem.chebyshev(unit, cell) > 0 && !GridSystem.isBlocked(cell.col, cell.row, state.units, level, unit.id, state.consumedCrates)
    );
    const ranged = def.maxRange > 1;
    const currentDist = GridSystem.chebyshev(unit, target);
    if (ranged && currentDist === 1) {
      return candidates.sort((a, b) => GridSystem.chebyshev(b, target) - GridSystem.chebyshev(a, target))[0] || null;
    }
    if (!state.units.some(u => u.hp > 0 && u.col === level.nexus.col && u.row === level.nexus.row)) {
      const nexusCell = candidates.find(c => c.col === level.nexus.col && c.row === level.nexus.row);
      if (nexusCell) return nexusCell;
    }
    return candidates.sort((a, b) => {
      const da = GridSystem.chebyshev(a, target);
      const db = GridSystem.chebyshev(b, target);
      const ideal = ranged ? Math.max(def.minRange, def.maxRange - 1) : 1;
      return Math.abs(da - ideal) - Math.abs(db - ideal);
    })[0] || null;
  }
}
