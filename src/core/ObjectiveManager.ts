import type { Faction } from "../config/units.config";
import { LEVELS } from "../config/levels.config";
import type { GameState, OutpostState } from "./types";

export class ObjectiveManager {
  static settle(state: GameState) {
    const target = LEVELS[state.level].nexus;
    const occupant = state.units.find(unit => unit.hp > 0 && unit.col === target.col && unit.row === target.row);
    const nexus = occupant
      ? state.nexus.unitId === occupant.id
        ? { faction: occupant.faction, unitId: occupant.id, rounds: state.nexus.rounds + 1 }
        : { faction: occupant.faction, unitId: occupant.id, rounds: 1 }
      : { faction: null, unitId: null, rounds: 0 };

    const outposts = state.outposts.map(post => this.settleOutpost(post, state));
    return { nexus, outposts, winner: nexus.rounds >= 5 ? nexus.faction : null };
  }

  private static settleOutpost(post: OutpostState, state: GameState): OutpostState {
    const occupant = state.units.find(unit => unit.hp > 0 && unit.col === post.col && unit.row === post.row);
    if (!occupant) return { ...post, progressFaction: null, progress: 0 };
    if (post.owner === occupant.faction) return { ...post, progressFaction: occupant.faction, progress: 2 };
    const progress = post.progressFaction === occupant.faction ? post.progress + 1 : 1;
    if (progress >= 2) return { ...post, owner: occupant.faction, progressFaction: occupant.faction, progress: 2 };
    return { ...post, progressFaction: occupant.faction, progress };
  }

  static resetIfOccupantMoved(state: GameState, unitId: string, destination: { col: number; row: number }) {
    if (state.nexus.unitId !== unitId) return state.nexus;
    const target = LEVELS[state.level].nexus;
    if (destination.col === target.col && destination.row === target.row) return state.nexus;
    return { faction: null as Faction | null, unitId: null, rounds: 0 };
  }
}
