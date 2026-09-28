"use client";

import { useEffect, useRef } from "react";
import type { LevelDefinition } from "../config/levels.config";
import type { CombatFx, FloatingAnchor, UnitState } from "../core/types";
import { SceneManager } from "./SceneManager";

type Cell = { col: number; row: number };

interface Props {
  level: LevelDefinition;
  units: UnitState[];
  activeUnitId: string | null;
  playerFaction: string;
  consumedCrates: string[];
  moveCells: Cell[];
  attackCells: Cell[];
  hoverCell: Cell | null;
  zoom: number;
  fx: CombatFx | null;
  onCellClick: (cell: Cell) => void;
  onHover: (cell: Cell | null) => void;
  onProjection: (anchors: FloatingAnchor[]) => void;
  onZoomChange: (zoom: number) => void;
}

export function SceneView(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const manager = useRef<SceneManager | null>(null);
  const callbacks = useRef({ click: props.onCellClick, hover: props.onHover, projection: props.onProjection, zoom: props.onZoomChange });

  useEffect(() => {
    callbacks.current = { click: props.onCellClick, hover: props.onHover, projection: props.onProjection, zoom: props.onZoomChange };
  }, [props.onCellClick, props.onHover, props.onProjection, props.onZoomChange]);

  useEffect(() => {
    if (!host.current) return;
    const scene = new SceneManager(
      host.current,
      props.level,
      cell => callbacks.current.click(cell),
      cell => callbacks.current.hover(cell),
      anchors => callbacks.current.projection(anchors),
      zoom => callbacks.current.zoom(zoom),
    );
    manager.current = scene;
    return () => { scene.dispose(); manager.current = null; };
  }, [props.level]);

  useEffect(() => {
    manager.current?.sync(props.units, props.activeUnitId, props.playerFaction, props.consumedCrates, props.moveCells, props.attackCells, props.hoverCell, props.zoom, props.fx);
  }, [props.units, props.activeUnitId, props.playerFaction, props.consumedCrates, props.moveCells, props.attackCells, props.hoverCell, props.zoom, props.fx]);

  return <div ref={host} className="scene-host" aria-label={`${props.level.cols} 列 × ${props.level.rows} 行战术棋盘`} />;
}
