import type { Faction, UnitKey } from "../config/units.config";

export interface SaveData {
  version: "3.0.0";
  updatedTimestamp: number;
  playerProfile: { selectedFaction: Faction; totalWins: number; totalLosses: number; dnaTokens: number };
  unlockedCards: { human: UnitKey[]; zombie: UnitKey[] };
  campaignProgress: { humanHighestLevel: number; zombieHighestLevel: number; levelRecords: Record<string, { completed: boolean; stars: number; fastestWinRound: number }> };
  userSettings: { musicVolume: number; sfxVolume: number; showFloatingDamage: boolean; fastCombatMode: boolean };
}

const KEY = "FATE_DEFENSE_SAVE_v3";

const defaults = (): SaveData => ({
  version: "3.0.0",
  updatedTimestamp: Date.now(),
  playerProfile: { selectedFaction: "human", totalWins: 0, totalLosses: 0, dnaTokens: 0 },
  unlockedCards: { human: ["civilian", "guard", "soldier", "vehicle", "specialist"], zombie: ["crawler", "walker", "smoker", "boomer", "stalker", "abomination", "mother"] },
  campaignProgress: { humanHighestLevel: 1, zombieHighestLevel: 1, levelRecords: {} },
  userSettings: { musicVolume: 0.35, sfxVolume: 0.65, showFloatingDamage: true, fastCombatMode: false },
});

export class StorageManager {
  static load(): SaveData {
    if (typeof window === "undefined") return defaults();
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<SaveData> | null;
      if (!parsed || parsed.version !== "3.0.0" || !parsed.playerProfile || !parsed.unlockedCards || !parsed.campaignProgress || !parsed.userSettings) return defaults();
      return parsed as SaveData;
    } catch {
      return defaults();
    }
  }

  static save(data: SaveData) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(KEY, JSON.stringify({ ...data, updatedTimestamp: Date.now() })); } catch { /* storage may be unavailable */ }
  }

  static recordBattle(playerFaction: Faction, winner: Faction, level: number, round: number) {
    const data = this.load();
    data.playerProfile.selectedFaction = playerFaction;
    const won = playerFaction === winner;
    if (won) {
      data.playerProfile.totalWins += 1;
      data.playerProfile.dnaTokens += Math.max(1, 4 - Math.floor(round / 5));
      data.campaignProgress.levelRecords[`${playerFaction}-${level}`] = { completed: true, stars: round <= 8 ? 3 : round <= 12 ? 2 : 1, fastestWinRound: round };
      if (playerFaction === "human") data.campaignProgress.humanHighestLevel = Math.max(data.campaignProgress.humanHighestLevel, level);
      else data.campaignProgress.zombieHighestLevel = Math.max(data.campaignProgress.zombieHighestLevel, level);
    } else data.playerProfile.totalLosses += 1;
    this.save(data);
  }
}

