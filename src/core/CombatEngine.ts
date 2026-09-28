import { UNIT_DEFS } from "../config/units.config";
import { GridSystem } from "./GridSystem";
import type { UnitState } from "./types";

export interface AttackResult {
  damage: number;
  counterDamage: number;
  critical: boolean;
  meleePenalty: boolean;
  knockback: boolean;
  headshot: boolean;
}

/** Tunables surfaced for docs / tests. */
export const COMBAT_TUNING = {
  civilianCoverPerAlly: 0.08,
  civilianCoverMaxAllies: 2,
  soldierCritChance: 0.5,
  guardKnockbackChance: 0.5,
  marksmanVsZombie: 1.25,
  marksmanStillBonus: 1.15,
  specialistAuraBonus: 1.15,
  counterRatio: 0.7,
} as const;

export class CombatEngine {
  static resolve(attacker: UnitState, defender: UnitState, units: UnitState[]): AttackResult {
    const attackDef = UNIT_DEFS[attacker.key];
    const defendDef = UNIT_DEFS[defender.key];
    const distance = GridSystem.chebyshev(attacker, defender);
    // Guards (shotgun) don't suffer point-blank penalty — they're the human melee-line answer.
    const meleePenalty = attackDef.maxRange > 1 && distance === 1 && !["mother", "vehicle", "guard", "specialist"].includes(attacker.key);
    const critical = attacker.key === "soldier" && !attacker.moved && Math.random() < COMBAT_TUNING.soldierCritChance;
    let base = distance === 1 && attacker.key === "mother" ? attackDef.meleeAttack : attackDef.attack;
    if (meleePenalty) base *= 0.5;
    if (critical) base *= 1.5;

    const headshot = attacker.key === "marksman" && defender.faction === "zombie";
    if (headshot) base *= COMBAT_TUNING.marksmanVsZombie * (attacker.moved ? 1 : COMBAT_TUNING.marksmanStillBonus);

    if (attacker.faction === "human" && attacker.key !== "specialist" && units.some(unit => unit.key === "specialist" && unit.hp > 0 && unit.faction === "human" && GridSystem.chebyshev(unit, attacker) === 1)) {
      base *= COMBAT_TUNING.specialistAuraBonus;
    }

    if (defender.key === "civilian") {
      const allies = units.filter(unit => unit.id !== defender.id && unit.faction === "human" && unit.hp > 0 && GridSystem.chebyshev(unit, defender) === 1).length;
      base *= 1 - Math.min(allies, COMBAT_TUNING.civilianCoverMaxAllies) * COMBAT_TUNING.civilianCoverPerAlly;
    }

    const damage = Math.max(1, Math.floor(base));
    const survives = defender.hp - damage > 0;
    const counterDamage = distance === 1 && survives && defender.countersLeft > 0 && !meleePenalty
      ? Math.floor(defendDef.meleeAttack * COMBAT_TUNING.counterRatio)
      : 0;

    return {
      damage,
      counterDamage,
      critical,
      meleePenalty,
      headshot,
      knockback: attacker.key === "guard" && distance === 2 && Math.random() < COMBAT_TUNING.guardKnockbackChance,
    };
  }
}
