import type { UnitDefinition } from "../config/units.config";
import type { LevelDefinition } from "../config/levels.config";

const ABILITY_MULTIPLIER: Partial<Record<UnitDefinition["key"], number>> = {
  civilian: 0.8, guard: 1.1, marksman: 1.18, soldier: 1.15, vehicle: 1.18, specialist: 1.28,
  crawler: 1.08, walker: 1.12, smoker: 1.1, boomer: 0.72, stalker: 1.16,
  abomination: 1.12, mother: 1.35,
};

export interface LevelBalance {
  playerStart: number;
  enemyStart: number;
  enemyDeployCap: number;
  terrainDensity: number;
  threatIndex: number;
  threatLabel: string;
}

export class BalanceEngine {
  static unitPower(def: UnitDefinition) {
    const durability = def.maxHp * 0.32;
    const offense = def.attack * (1 + def.maxRange * 0.12);
    const mobility = def.move * 3.5 + def.speed * 2;
    const reaction = def.counters * 7;
    const footprintPenalty = def.size[0] * def.size[1] > 1 ? 0.9 : 1;
    return Math.round((durability + offense + mobility + reaction) * (ABILITY_MULTIPLIER[def.key] ?? 1) * footprintPenalty);
  }

  static efficiency(def: UnitDefinition) {
    return Number((this.unitPower(def) / def.cost).toFixed(1));
  }

  static forLevel(level: LevelDefinition): LevelBalance {
    const playerStart = 6 + Math.floor((level.id - 1) / 8);
    const enemyStart = 5 + Math.floor((level.id - 1) / 4);
    const enemyDeployCap = Math.min(5, 2 + Math.floor((level.id - 1) / 5));
    const blocking = level.terrain.filter(item => item.kind === "wreck" || item.kind === "barricade").length;
    const terrainDensity = blocking / (level.cols * level.rows);
    const threatIndex = Math.round(100 + (level.id - 1) * 4.5 + (enemyStart - playerStart) * 8 + terrainDensity * 180);
    const threatLabel = threatIndex < 120 ? "常规" : threatIndex < 155 ? "紧张" : threatIndex < 190 ? "高危" : "极限";
    return { playerStart, enemyStart, enemyDeployCap, terrainDensity, threatIndex, threatLabel };
  }
}
