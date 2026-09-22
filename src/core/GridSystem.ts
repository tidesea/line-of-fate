import type { LevelDefinition } from "../config/levels.config";
import type { UnitState } from "./types";

type GridLayout = Pick<LevelDefinition, "cols" | "rows">;

export class GridSystem {
  static chebyshev(a: Pick<UnitState, "col" | "row"> | { col: number; row: number }, b: Pick<UnitState, "col" | "row"> | { col: number; row: number }) {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
  }

  static gridToWorld(col: number, row: number, layout: GridLayout) {
    return { x: col - (layout.cols - 1) / 2, y: 0, z: row - (layout.rows - 1) / 2 };
  }

  static inBounds(col: number, row: number, layout: GridLayout) {
    return col >= 0 && col < layout.cols && row >= 0 && row < layout.rows;
  }

  static key(col: number, row: number) {
    return `${col}:${row}`;
  }

  static isBlocked(col: number, row: number, units: UnitState[], level: LevelDefinition, movingId?: string, consumedCrates: string[] = []) {
    if (!this.inBounds(col, row, level)) return true;
    if (units.some(unit => unit.id !== movingId && unit.hp > 0 && unit.col === col && unit.row === row)) return true;
    return level.terrain.some(item => item.col === col && item.row === row && (
      item.kind === "wreck" || item.kind === "barricade" || (item.kind === "crate" && !consumedCrates.includes(this.key(col, row)))
    ));
  }

  static cellsWithin(origin: { col: number; row: number }, distance: number, layout: GridLayout) {
    const cells: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        if (this.chebyshev(origin, { col, row }) <= distance) cells.push({ col, row });
      }
    }
    return cells;
  }
}
