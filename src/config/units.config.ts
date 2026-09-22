export type Faction = "human" | "zombie";

export type UnitKey =
  | "civilian"
  | "guard"
  | "soldier"
  | "vehicle"
  | "specialist"
  | "crawler"
  | "walker"
  | "smoker"
  | "boomer"
  | "stalker"
  | "abomination"
  | "mother";

export interface UnitDefinition {
  key: UnitKey;
  name: string;
  shortName: string;
  faction: Faction;
  cost: number;
  maxHp: number;
  move: number;
  minRange: number;
  maxRange: number;
  attack: number;
  meleeAttack: number;
  speed: number;
  counters: number;
  size: [number, number];
  role: string;
  ability: string;
  color: string;
  accent: string;
  glyph: string;
}

export const UNIT_DEFS: Record<UnitKey, UnitDefinition> = {
  civilian: { key: "civilian", name: "武装平民", shortName: "平民", faction: "human", cost: 1, maxHp: 45, move: 3, minRange: 1, maxRange: 1, attack: 12, meleeAttack: 12, speed: 4, counters: 2, size: [1, 1], role: "前排肉盾", ability: "草木皆兵 · 邻近友军提供减伤", color: "#36a8ff", accent: "#ffd36b", glyph: "民" },
  guard: { key: "guard", name: "民兵护卫", shortName: "护卫", faction: "human", cost: 2, maxHp: 30, move: 2, minRange: 1, maxRange: 3, attack: 18, meleeAttack: 8, speed: 5, counters: 0, size: [1, 1], role: "压制控线", ability: "霰弹压制 · 两格射击可能击退", color: "#50c7ff", accent: "#f8fafc", glyph: "卫" },
  soldier: { key: "soldier", name: "正规军士兵", shortName: "士兵", faction: "human", cost: 4, maxHp: 75, move: 3, minRange: 1, maxRange: 4, attack: 32, meleeAttack: 12, speed: 5, counters: 0, size: [1, 1], role: "中坚火力", ability: "战术点射 · 未移动时有机会暴击", color: "#2f8fc4", accent: "#a7d66d", glyph: "兵" },
  vehicle: { key: "vehicle", name: "装甲战斗车", shortName: "战车", faction: "human", cost: 7, maxHp: 220, move: 4, minRange: 2, maxRange: 5, attack: 45, meleeAttack: 22, speed: 2, counters: 1, size: [2, 1], role: "范围重炮", ability: "链式机炮 · 十字范围溅射", color: "#47758c", accent: "#ffb547", glyph: "车" },
  specialist: { key: "specialist", name: "生化前线特警", shortName: "特警", faction: "human", cost: 6, maxHp: 160, move: 3, minRange: 1, maxRange: 2, attack: 28, meleeAttack: 28, speed: 6, counters: 1, size: [1, 1], role: "战场指挥", ability: "阵线督导 · 人类全军移动力 +1", color: "#0e7490", accent: "#facc15", glyph: "特" },
  crawler: { key: "crawler", name: "爬行尸", shortName: "爬尸", faction: "zombie", cost: 1, maxHp: 35, move: 4, minRange: 1, maxRange: 1, attack: 10, meleeAttack: 10, speed: 7, counters: 1, size: [1, 1], role: "高速炮灰", ability: "尸潮堆叠 · 阵亡治疗邻近僵尸", color: "#91d431", accent: "#dfff77", glyph: "爬" },
  walker: { key: "walker", name: "蹒跚腐尸", shortName: "腐尸", faction: "zombie", cost: 2, maxHp: 85, move: 2, minRange: 1, maxRange: 1, attack: 18, meleeAttack: 18, speed: 3, counters: 1, size: [1, 1], role: "感染前排", ability: "生化撕咬 · 命中施加感染", color: "#75b52a", accent: "#b9e255", glyph: "腐" },
  smoker: { key: "smoker", name: "烟鬼尸", shortName: "烟鬼", faction: "zombie", cost: 3, maxHp: 65, move: 3, minRange: 1, maxRange: 4, attack: 24, meleeAttack: 9, speed: 4, counters: 0, size: [1, 1], role: "毒雾射手", ability: "腐蚀浓烟 · 远程压制火力", color: "#9e7acc", accent: "#b7f34b", glyph: "烟" },
  boomer: { key: "boomer", name: "毒爆尸", shortName: "毒爆", faction: "zombie", cost: 3, maxHp: 50, move: 3, minRange: 1, maxRange: 2, attack: 55, meleeAttack: 0, speed: 5, counters: 0, size: [1, 1], role: "范围炸弹", ability: "酸液殉爆 · 半径两格绝对伤害", color: "#a8df27", accent: "#fff04e", glyph: "爆" },
  stalker: { key: "stalker", name: "暗影掠食者", shortName: "猎手", faction: "zombie", cost: 4, maxHp: 55, move: 5, minRange: 1, maxRange: 1, attack: 38, meleeAttack: 38, speed: 8, counters: 1, size: [1, 1], role: "后排刺客", ability: "潜行跃迁 · 首次行动无视阻挡", color: "#5d347d", accent: "#f15b78", glyph: "影" },
  abomination: { key: "abomination", name: "缝合憎恶", shortName: "憎恶", faction: "zombie", cost: 6, maxHp: 340, move: 2, minRange: 1, maxRange: 1, attack: 32, meleeAttack: 32, speed: 1, counters: 2, size: [2, 2], role: "巨型堡垒", ability: "血腥铁钩 · 强制改变阵型", color: "#526b38", accent: "#b8c7ce", glyph: "憎" },
  mother: { key: "mother", name: "猩红母体", shortName: "母体", faction: "zombie", cost: 8, maxHp: 220, move: 3, minRange: 1, maxRange: 4, attack: 26, meleeAttack: 30, speed: 6, counters: 1, size: [1, 1], role: "繁衍主脑", ability: "全能杀戮 · 近战全伤，回合繁衍", color: "#ba3057", accent: "#ff8e66", glyph: "母" },
};

export const HUMAN_POOL: UnitKey[] = ["civilian", "guard", "soldier", "vehicle", "specialist"];
export const ZOMBIE_POOL: UnitKey[] = ["crawler", "walker", "smoker", "boomer", "stalker", "abomination", "mother"];

export const factionPool = (faction: Faction) => faction === "human" ? HUMAN_POOL : ZOMBIE_POOL;
export const opposingFaction = (faction: Faction): Faction => faction === "human" ? "zombie" : "human";

