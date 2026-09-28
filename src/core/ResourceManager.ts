import type { Faction } from "../config/units.config";
import type { OutpostState, UnitState } from "./types";
import { UNIT_DEFS } from "../config/units.config";

export interface IncomeBreakdown {
  base: number;
  outposts: number;
  nexus: number;
  total: number;
}

/** v0.6.0-demo economy: flat base 2 (was 1) so mid-cost units are reachable every round. */
export const ECONOMY = {
  baseIncome: 2,
  perOutpost: 1,
  nexusHoldBonus: 1,
  zombieBountyRatio: 0.5,
  humanBountyPerKill: 0,
  crateSupply: 3,
  zombieDeathRefund: 1,
} as const;

export class ResourceManager {
  static incomeBreakdown(faction: Faction, outposts: OutpostState[], nexusFaction: Faction | null = null): IncomeBreakdown {
    const base = ECONOMY.baseIncome;
    const posts = outposts.filter(post => post.owner === faction).length * ECONOMY.perOutpost;
    const nexus = nexusFaction === faction ? ECONOMY.nexusHoldBonus : 0;
    return { base, outposts: posts, nexus, total: base + posts + nexus };
  }

  static income(faction: Faction, outposts: OutpostState[], nexusFaction: Faction | null = null) {
    return this.incomeBreakdown(faction, outposts, nexusFaction).total;
  }

  static killBounty(killer: UnitState, victim: UnitState) {
    if (killer.faction !== "zombie" || victim.faction !== "human") return 0;
    // Civilians give no bounty (so feeding 1-cost bodies doesn't snowball zombies).
    return Math.floor(UNIT_DEFS[victim.key].cost * ECONOMY.zombieBountyRatio);
  }
}
