export type TerrainKind = "wreck" | "barricade" | "outpost" | "crate" | "blight";

export interface TerrainObject {
  col: number;
  row: number;
  kind: TerrainKind;
}

export interface LevelDefinition {
  id: number;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  nexus: { col: number; row: number };
  complexity: 1 | 2 | 3 | 4 | 5;
  terrain: TerrainObject[];
}

type LevelSpec = [number, string, string, number, number, 1 | 2 | 3 | 4 | 5];

const LEVEL_SPECS: LevelSpec[] = [
  [1, "新手接触平原", "开放地形 · 熟悉部署、射程与反击", 15, 9, 1],
  [2, "遗弃哨站", "首个驻地 · 建立资源优势", 15, 9, 1],
  [3, "双线公路", "废车掩体 · 上下翼穿插", 15, 9, 1],
  [4, "锈蚀工厂", "狭窄通道 · 近战封锁", 15, 9, 2],
  [5, "破损补给线", "空投争夺 · 双驻地运营", 17, 9, 2],
  [6, "干涸河床", "低地毒区 · 路线取舍", 17, 9, 2],
  [7, "货运坟场", "密集车阵 · 远程视线受限", 17, 9, 2],
  [8, "断桥封锁区", "纵深增加 · 三路争夺", 17, 11, 2],
  [9, "孢子集市", "腐化地带 · 交叉火力", 19, 11, 3],
  [10, "地铁前庭", "双层路障 · 中心绞杀", 19, 11, 3],
  [11, "沉陷居住区", "废墟集群 · 侧翼突袭", 19, 11, 3],
  [12, "发电站环廊", "长距离推进 · 多点驻守", 21, 11, 3],
  [13, "污染水库", "宽阔毒池 · 补给稀缺", 21, 13, 3],
  [14, "联运枢纽", "四向交通线 · 多目标决策", 23, 13, 4],
  [15, "旧城十字", "高密掩体 · 近远程混战", 23, 13, 4],
  [16, "隔离研究所", "封锁带 · 英雄单位决战", 23, 13, 4],
  [17, "黑雨工业带", "超大纵深 · 毒区连锁", 25, 15, 4],
  [18, "母巢外缘", "多驻地 · 尸潮持续增援", 25, 15, 5],
  [19, "最后防区", "重度障碍 · 全兵种会战", 27, 15, 5],
  [20, "命运断层", "终局战场 · 五路混合地形", 27, 15, 5],
];

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const generateTerrain = (id: number, cols: number, rows: number, complexity: number): TerrainObject[] => {
  if (id === 1) return [];
  const random = mulberry32(id * 7919 + cols * 131 + rows * 17);
  const nexus = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  const terrain: TerrainObject[] = [];
  const occupied = new Set<string>();
  const key = (col: number, row: number) => `${col}:${row}`;
  const canPlace = (col: number, row: number) => {
    if (col <= 1 || col >= cols - 2 || row < 0 || row >= rows) return false;
    if (Math.max(Math.abs(col - nexus.col), Math.abs(row - nexus.row)) <= 1) return false;
    return !occupied.has(key(col, row));
  };
  const add = (col: number, row: number, kind: TerrainKind) => {
    if (!canPlace(col, row)) return false;
    occupied.add(key(col, row));
    terrain.push({ col, row, kind });
    return true;
  };

  const outpostCount = id < 5 ? 1 : id < 10 ? 2 : id < 15 ? 3 : 4;
  const outpostSlots = [
    { col: Math.floor(cols * 0.28), row: nexus.row },
    { col: Math.ceil(cols * 0.72), row: nexus.row },
    { col: nexus.col, row: Math.max(1, Math.floor(rows * 0.22)) },
    { col: nexus.col, row: Math.min(rows - 2, Math.ceil(rows * 0.78)) },
  ];
  outpostSlots.slice(0, outpostCount).forEach(cell => add(cell.col, cell.row, "outpost"));

  const crateCount = id < 4 ? 1 : id < 13 ? 2 : 3;
  const crateSlots = [
    { col: nexus.col - 2, row: nexus.row },
    { col: nexus.col + 2, row: nexus.row },
    { col: nexus.col, row: nexus.row - 2 },
  ];
  crateSlots.slice(0, crateCount).forEach(cell => add(cell.col, cell.row, "crate"));

  const targetObstacleCount = Math.round(cols * rows * (0.015 + complexity * 0.018));
  const kinds: TerrainKind[] = id >= 6 ? ["wreck", "barricade", "barricade", "blight"] : ["wreck", "barricade", "barricade"];
  let guard = 0;
  while (terrain.filter(item => item.kind !== "outpost" && item.kind !== "crate").length < targetObstacleCount && guard < 900) {
    guard += 1;
    const col = 2 + Math.floor(random() * Math.max(1, nexus.col - 3));
    const row = Math.floor(random() * rows);
    const mirrorCol = cols - 1 - col;
    const kind = kinds[Math.floor(random() * kinds.length)];
    add(col, row, kind);
    if (terrain.filter(item => item.kind !== "outpost" && item.kind !== "crate").length < targetObstacleCount) add(mirrorCol, row, kind);
  }
  return terrain;
};

export const LEVEL_LIST: LevelDefinition[] = LEVEL_SPECS.map(([id, name, subtitle, cols, rows, complexity]) => ({
  id,
  name,
  subtitle,
  cols,
  rows,
  nexus: { col: Math.floor(cols / 2), row: Math.floor(rows / 2) },
  complexity,
  terrain: generateTerrain(id, cols, rows, complexity),
}));

export const LEVELS: Record<number, LevelDefinition> = Object.fromEntries(LEVEL_LIST.map(level => [level.id, level]));

