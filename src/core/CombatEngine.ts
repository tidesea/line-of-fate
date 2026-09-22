import { UNIT_DEFS } from "../config/units.config";
import { GridSystem } from "./GridSystem";
import type { UnitState } from "./types";

export interface AttackResult {
  damage: number;
  counterDamage: number;
  critical: boolean;
  meleePenalty: boolean;
  knockback: boolean;
}

export class CombatEngine {
  static resolve(attacker: UnitState, defender: UnitState, units: UnitState[]): AttackResult {
    const attackDef = UNIT_DEFS[attacker.key];
    const defendDef = UNIT_DEFS[defender.key];
    const distance = GridSystem.chebyshev(attacker, defender);
    const meleePenalty = attackDef.maxRange > 1 && distance === 1 && attacker.key !== "mother" && attacker.key !== "vehicle";
    const critical = attacker.key === "soldier" && !attacker.moved && Math.random() < 0.4;
    let base = distance === 1 && attacker.key === "mother" ? attackDef.meleeAttack : attackDef.attack;
    if (meleePenalty) base *= 0.5;
    if (critical) base *= 1.5;

    if (defender.key === "civilian") {
      const allies = units.filter(unit => unit.id !== defender.id && unit.faction === "human" && unit.hp > 0 && GridSystem.chebyshev(unit, defender) === 1).length;
      base *= 1 - Math.min(allies, 3) * 0.15;
    }

    const damage = Math.max(1, Math.floor(base));
    const survives = defender.hp - damage > 0;
    const counterDamage = distance === 1 && survives && defender.countersLeft > 0 && !meleePenalty
      ? Math.floor(defendDef.meleeAttack * 0.7)
      : 0;

    return {
      damage,
      counterDamage,
      critical,
      meleePenalty,
      knockback: attacker.key === "guard" && distance === 2 && Math.random() < 0.35,
    };
  }
}

