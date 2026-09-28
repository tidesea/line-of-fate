export type Faction = "human" | "zombie";

export type UnitKey =
  | "civilian"
  | "guard"
  | "marksman"
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
  // v0.6.0-demo 平衡：平民大砍；护卫 / 士兵 / 特警加强；新增 3 费「神射手」专职反尸；僵尸低费单位小幅下调。
  civilian: { key: "civilian", name: "武装平民", shortName: "平民", faction: "human", cost: 1, maxHp: 26, move: 2, minRange: 1, maxRange: 1, attack: 7, meleeAttack: 7, speed: 3, counters: 0, size: [1, 1], role: "临时填线", ability: "互相掩护 · 每个邻近友军减伤 8%（最多 2 个）", color: "#8a8f86", accent: "#ffd36b", glyph: "民" },
  guard: { key: "guard", name: "民兵护卫", shortName: "护卫", faction: "human", cost: 2, maxHp: 55, move: 2, minRange: 1, maxRange: 3, attack: 22, meleeAttack: 12, speed: 5, counters: 1, size: [1, 1], role: "压制控线", ability: "霰弹压制 · 两格射击 50% 击退；近身不衰减", color: "#2c5d7c", accent: "#f8fafc", glyph: "卫" },
  marksman: { key: "marksman", name: "猎尸神射手", shortName: "射手", faction: "human", cost: 3, maxHp: 45, move: 2, minRange: 2, maxRange: 5, attack: 30, meleeAttack: 6, speed: 4, counters: 0, size: [1, 1], role: "反尸狙击", ability: "爆头 · 对僵尸伤害 +25%，未移动再 +15%", color: "#4d6b3c", accent: "#ffe08a", glyph: "狙" },
  soldier: { key: "soldier", name: "正规军士兵", shortName: "士兵", faction: "human", cost: 4, maxHp: 95, move: 3, minRange: 1, maxRange: 4, attack: 36, meleeAttack: 14, speed: 5, counters: 1, size: [1, 1], role: "中坚火力", ability: "战术点射 · 未移动时 50% 暴击 ×1.5", color: "#3f7a4e", accent: "#a7d66d", glyph: "兵" },
  vehicle: { key: "vehicle", name: "装甲战斗车", shortName: "战车", faction: "human", cost: 7, maxHp: 230, move: 4, minRange: 2, maxRange: 5, attack: 48, meleeAttack: 22, speed: 2, counters: 1, size: [2, 1], role: "范围重炮", ability: "链式机炮 · 十字范围溅射 50%", color: "#47758c", accent: "#ffb547", glyph: "车" },
  specialist: { key: "specialist", name: "生化前线特警", shortName: "特警", faction: "human", cost: 6, maxHp: 175, move: 3, minRange: 1, maxRange: 2, attack: 34, meleeAttack: 34, speed: 6, counters: 2, size: [1, 1], role: "战场指挥", ability: "阵线督导 · 人类全军移动 +1，邻近友军伤害 +15%", color: "#0e7490", accent: "#facc15", glyph: "特" },
  crawler: { key: "crawler", name: "爬行尸", shortName: "爬尸", faction: "zombie", cost: 1, maxHp: 30, move: 4, minRange: 1, maxRange: 1, attack: 9, meleeAttack: 9, speed: 7, counters: 1, size: [1, 1], role: "高速炮灰", ability: "尸潮堆叠 · 阵亡治疗邻近僵尸 8", color: "#91d431", accent: "#dfff77", glyph: "爬" },
  walker: { key: "walker", name: "蹒跚腐尸", shortName: "腐尸", faction: "zombie", cost: 2, maxHp: 85, move: 2, minRange: 1, maxRange: 1, attack: 18, meleeAttack: 18, speed: 3, counters: 1, size: [1, 1], role: "感染前排", ability: "生化撕咬 · 命中施加感染（3 回合 × 6）", color: "#75b52a", accent: "#b9e255", glyph: "腐" },
  smoker: { key: "smoker", name: "烟鬼尸", shortName: "烟鬼", faction: "zombie", cost: 3, maxHp: 65, move: 3, minRange: 1, maxRange: 4, attack: 22, meleeAttack: 9, speed: 4, counters: 0, size: [1, 1], role: "毒雾射手", ability: "腐蚀浓烟 · 远程压制火力", color: "#9e7acc", accent: "#b7f34b", glyph: "烟" },
  boomer: { key: "boomer", name: "毒爆尸", shortName: "毒爆", faction: "zombie", cost: 3, maxHp: 50, move: 3, minRange: 1, maxRange: 2, attack: 45, meleeAttack: 0, speed: 5, counters: 0, size: [1, 1], role: "范围炸弹", ability: "酸液殉爆 · 半径两格 45 绝对伤害", color: "#a8df27", accent: "#fff04e", glyph: "爆" },
  stalker: { key: "stalker", name: "暗影掠食者", shortName: "猎手", faction: "zombie", cost: 4, maxHp: 55, move: 5, minRange: 1, maxRange: 1, attack: 34, meleeAttack: 34, speed: 8, counters: 1, size: [1, 1], role: "后排刺客", ability: "潜行跃迁 · 首次行动无视阻挡", color: "#5d347d", accent: "#f15b78", glyph: "影" },
  abomination: { key: "abomination", name: "缝合憎恶", shortName: "憎恶", faction: "zombie", cost: 6, maxHp: 320, move: 2, minRange: 1, maxRange: 1, attack: 32, meleeAttack: 32, speed: 1, counters: 2, size: [2, 2], role: "巨型堡垒", ability: "血腥铁钩 · 强制改变阵型", color: "#526b38", accent: "#b8c7ce", glyph: "憎" },
  mother: { key: "mother", name: "猩红母体", shortName: "母体", faction: "zombie", cost: 8, maxHp: 220, move: 3, minRange: 1, maxRange: 4, attack: 26, meleeAttack: 30, speed: 6, counters: 1, size: [1, 1], role: "繁衍主脑", ability: "全能杀戮 · 近战全伤，回合繁衍", color: "#ba3057", accent: "#ff8e66", glyph: "母" },
};

export const HUMAN_POOL: UnitKey[] = ["civilian", "guard", "marksman", "soldier", "vehicle", "specialist"];
export const ZOMBIE_POOL: UnitKey[] = ["crawler", "walker", "smoker", "boomer", "stalker", "abomination", "mother"];

export const factionPool = (faction: Faction) => faction === "human" ? HUMAN_POOL : ZOMBIE_POOL;
export const opposingFaction = (faction: Faction): Faction => faction === "human" ? "zombie" : "human";

