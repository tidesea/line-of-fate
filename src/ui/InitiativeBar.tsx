import { UNIT_DEFS } from "../config/units.config";
import type { GameState } from "../core/types";
import { unitSvgDataUrl } from "../render/unitSvg";

/**
 * Speed-interleaved initiative strip: both factions share one queue sorted by speed.
 * Done units are dimmed, the acting unit is enlarged, and the queue ends in the supply phase.
 */
export function InitiativeBar({ game, onHover }: { game: GameState; onHover: (id: string | null) => void }) {
  const entries = game.initiative
    .map((id, index) => ({ id, index, unit: game.units.find(unit => unit.id === id) }))
    .filter(entry => entry.unit);
  const remaining = entries.filter(entry => entry.index >= game.initiativeIndex && (entry.unit?.hp ?? 0) > 0).length;
  return (
    <div className="initiative-bar" aria-label="行动序列">
      <div className="initiative-label"><b>行动序列</b><small>按速度交错 · 剩余 {remaining}</small></div>
      <div className="initiative-track">
        {entries.map(({ id, index, unit }) => {
          if (!unit) return null;
          const def = UNIT_DEFS[unit.key];
          const dead = unit.hp <= 0;
          const done = index < game.initiativeIndex;
          const active = id === game.activeUnitId;
          const mine = unit.faction === game.playerFaction;
          return (
            <div
              key={id}
              className={`init-chip ${unit.faction} ${active ? "active" : ""} ${done ? "done" : ""} ${dead ? "dead" : ""} ${mine ? "mine" : "enemy"}`}
              title={`${def.name} · 速度 ${def.speed}${dead ? " · 阵亡" : ""}`}
              onMouseEnter={() => onHover(id)}
              onMouseLeave={() => onHover(null)}
            >
              <img src={unitSvgDataUrl(unit.key)} alt={def.shortName} />
              <span className="spd">{def.speed}</span>
              {dead && <span className="x">✖</span>}
            </div>
          );
        })}
        <div className={`init-chip supply ${game.phase === "objective" ? "active" : ""}`} title="全部行动结束后进入补给 / 生产阶段">
          <span>📦</span><small>补给</small>
        </div>
      </div>
    </div>
  );
}
