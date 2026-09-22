import { UNIT_DEFS } from "../config/units.config";
import type { FloatingAnchor, UnitState } from "../core/types";

export function FloatingHUD({ anchors, units, activeId }: { anchors: FloatingAnchor[]; units: UnitState[]; activeId: string | null }) {
  return (
    <div className="floating-hud" aria-hidden="true">
      {anchors.map(anchor => {
        const unit = units.find(item => item.id === anchor.id);
        if (!unit || !anchor.visible) return null;
        const def = UNIT_DEFS[unit.key];
        return (
          <div className={`unit-anchor ${unit.faction} ${unit.id === activeId ? "active" : ""}`} key={unit.id} style={{ transform: `translate(${anchor.x}px, ${anchor.y}px)` }}>
            <span>{def.shortName}</span>
            <div><i style={{ width: `${Math.max(0, unit.hp / def.maxHp) * 100}%` }} /></div>
            {unit.statuses.length > 0 && <em>{unit.statuses.map(s => s.type === "infection" ? "感染" : s.type === "stun" ? "瘫痪" : "烟雾").join(" · ")}</em>}
          </div>
        );
      })}
    </div>
  );
}

