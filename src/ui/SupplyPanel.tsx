import { ChevronRight, Package } from "lucide-react";
import type { Faction } from "../config/units.config";
import { UNIT_DEFS } from "../config/units.config";
import type { GameState, SupplyReport } from "../core/types";
import { unitSvgDataUrl } from "../render/unitSvg";

const NAME: Record<Faction, string> = { human: "人类补给", zombie: "僵尸变异" };

/** Between-round supply / production phase — makes income & reinforcements explicit. */
export function SupplyPanel({ report, game, onContinue }: { report: SupplyReport; game: GameState; onContinue: () => void }) {
  const factions: Faction[] = game.playerFaction === "human" ? ["human", "zombie"] : ["zombie", "human"];
  return (
    <div className="supply-layer">
      <section className="supply-card">
        <span className="modal-code"><Package size={13} /> ROUND {String(report.round).padStart(2, "0")} COMPLETE // SUPPLY PHASE</span>
        <h2>补给 / 生产阶段</h2>
        <p className="supply-sub">本回合所有单位已行动完毕。结算收入与增援，然后进入第 {report.round + 1} 回合部署。</p>
        <div className="supply-grid">
          {factions.map(faction => {
            const income = report.income[faction];
            return (
              <div className={`supply-col ${faction} ${faction === game.playerFaction ? "mine" : ""}`} key={faction}>
                <header><b>{NAME[faction]}</b>{faction === game.playerFaction && <small>你</small>}</header>
                <ul>
                  <li><span>基础收入</span><b>+{income.base}</b></li>
                  <li><span>驻地</span><b>+{income.outposts}</b></li>
                  <li><span>据点控制</span><b>+{income.nexus}</b></li>
                </ul>
                <div className="supply-total"><span>合计</span><b>+{income.total}</b><em>现有 {game.resources[faction]}</em></div>
                <div className="supply-loss">本回合阵亡 <b>{report.losses[faction]}</b></div>
              </div>
            );
          })}
        </div>
        <div className="supply-events">
          <span>🎯 据点：<b>{report.nexusLine}</b></span>
          {report.infectionDamage > 0 && <span>☣ 感染结算：<b>{report.infectionDamage}</b> 伤害</span>}
          {report.spawned > 0 && <span>🧬 母体繁衍：<b>+{report.spawned}</b> 爬尸</span>}
        </div>
        {report.newCards.length > 0 && <div className="supply-cards">
          <small>新到手牌</small>
          <div>{report.newCards.map((key, index) => <span key={`${key}-${index}`}><img src={unitSvgDataUrl(key)} alt="" />{UNIT_DEFS[key].shortName}<b>{UNIT_DEFS[key].cost}</b></span>)}</div>
        </div>}
        <button className="launch" onClick={onContinue}>进入第 {report.round + 1} 回合部署 <ChevronRight /></button>
      </section>
    </div>
  );
}
