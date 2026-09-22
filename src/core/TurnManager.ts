import { UNIT_DEFS } from "../config/units.config";
import type { Faction } from "../config/units.config";
import type { UnitState } from "./types";

export class TurnManager {
  static createInitiative(units: UnitState[], playerFaction: Faction) {
    return units
      .filter(unit => unit.hp > 0)
      .slice()
      .sort((a, b) => {
        const speed = UNIT_DEFS[b.key].speed - UNIT_DEFS[a.key].speed;
        if (speed !== 0) return speed;
        if (a.faction === playerFaction && b.faction !== playerFaction) return -1;
        if (b.faction === playerFaction && a.faction !== playerFaction) return 1;
        return (a.col - b.col) || (a.row - b.row);
      })
      .map(unit => unit.id);
  }
}

