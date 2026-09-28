import type { Faction, UnitKey } from "../config/units.config";

export type GamePhase = "briefing" | "deploy" | "combat" | "objective" | "supply" | "over";

export interface StatusEffect {
  type: "infection" | "stun" | "smoke";
  rounds: number;
  value?: number;
}

export interface UnitState {
  id: string;
  key: UnitKey;
  faction: Faction;
  col: number;
  row: number;
  hp: number;
  countersLeft: number;
  moved: boolean;
  acted: boolean;
  deployedRound: number;
  statuses: StatusEffect[];
}

export interface OutpostState {
  col: number;
  row: number;
  owner: Faction | null;
  progressFaction: Faction | null;
  progress: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  level: number;
  playerFaction: Faction;
  resources: Record<Faction, number>;
  units: UnitState[];
  hand: UnitKey[];
  selectedCard: number | null;
  initiative: string[];
  initiativeIndex: number;
  activeUnitId: string | null;
  actionMoved: boolean;
  nexus: { faction: Faction | null; unitId: string | null; rounds: number };
  outposts: OutpostState[];
  consumedCrates: string[];
  winner: Faction | null;
  log: string[];
  /** Latest combat event for attack / death feedback (seq increments per event). */
  fx: CombatFx | null;
  /** Filled when entering the supply phase between rounds. */
  supply: SupplyReport | null;
}

export interface CombatFx {
  seq: number;
  attackerId: string;
  attackerKey: UnitKey;
  attackerFaction: Faction;
  from: { col: number; row: number };
  hits: Array<{ id: string; key: UnitKey; faction: Faction; col: number; row: number; damage: number; killed: boolean }>;
  counter?: { damage: number; killed: boolean };
  kind: "shot" | "melee" | "explode";
  tag?: string;
}

export interface SupplyReport {
  round: number;
  income: Record<Faction, { base: number; outposts: number; nexus: number; total: number }>;
  infectionDamage: number;
  spawned: number;
  nexusLine: string;
  losses: Record<Faction, number>;
  newCards: UnitKey[];
}

export interface FloatingAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}
