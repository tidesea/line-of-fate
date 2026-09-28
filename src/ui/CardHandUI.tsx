import { UNIT_DEFS } from "../config/units.config";
import type { UnitKey } from "../config/units.config";
import { BalanceEngine } from "../core/BalanceEngine";
import { unitSvgDataUrl } from "../render/unitSvg";

interface Props {
  cards: UnitKey[];
  resources: number;
  selected: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
}

export function CardHandUI({ cards, resources, selected, disabled, onSelect }: Props) {
  return (
    <div className="card-hand" aria-label="部署手牌">
      {cards.map((key, index) => {
        const def = UNIT_DEFS[key];
        const power = BalanceEngine.unitPower(def);
        const locked = disabled || def.cost > resources;
        return (
          <button
            className={`unit-card ${selected === index ? "selected" : ""} ${locked ? "locked" : ""}`}
            key={`${key}-${index}`}
            onClick={() => !locked && onSelect(index)}
            disabled={locked}
            title={`${def.ability}｜综合战力 ${power}｜每费效率 ${BalanceEngine.efficiency(def)}`}
            style={{ "--unit-color": def.color, "--unit-accent": def.accent } as React.CSSProperties}
          >
            <span className="cost">{def.cost}</span>
            <span className="unit-glyph"><img src={unitSvgDataUrl(key)} alt={def.glyph} /></span>
            <span className="card-copy"><b>{def.shortName}</b><small>{def.role}</small></span>
            <span className="card-stats"><i>HP {def.maxHp}</i><i>ATK {def.attack}</i><i>PWR {power}</i></span>
          </button>
        );
      })}
      {Array.from({ length: Math.max(0, 4 - cards.length) }).map((_, index) => <div className="empty-card" key={index}>已部署</div>)}
    </div>
  );
}
