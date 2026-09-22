import type { Faction } from "../config/units.config";
import type { OutpostState, UnitState } from "./types";
import { UNIT_DEFS } from "../config/units.config";

export class ResourceManager {
  static income(faction: Faction, outposts: OutpostState[]) {
    return 1 + outposts.filter(post => post.owner === faction).length;
  }

  static killBounty(killer: UnitState, victim: UnitState) {
    if (killer.faction !== "zombie" || victim.faction !== "human") return 0;
    return Math.floor(UNIT_DEFS[victim.key].cost * 0.5);
  }
}

