import { Crosshair, Radio, Shield, Skull } from "lucide-react";
import type { GameState } from "../core/types";

const phaseLabel = { briefing: "任务简报", deploy: "部署阶段", combat: "交战阶段", objective: "目标结算", supply: "补给阶段", over: "战役结束" };

export function TopBarHUD({ game }: { game: GameState }) {
  const humanActive = game.playerFaction === "human";
  return (
    <header className="top-hud">
      <div className="brand-lockup">
        <div className="brand-mark"><Crosshair size={21} strokeWidth={2.4} /></div>
        <div><strong>命运防线</strong><span>LINE OF FATE / 战区 07</span></div>
      </div>
      <div className="round-center">
        <span className="eyebrow">ROUND {String(game.round).padStart(2, "0")}</span>
        <strong>{phaseLabel[game.phase]}</strong>
        <div className="initiative-pips" aria-label="阶段进度">
          {["deploy", "combat", "supply"].map(phase => <i key={phase} title={phaseLabel[phase as keyof typeof phaseLabel]} className={game.phase === phase || (phase === "supply" && game.phase === "objective") ? "active" : ""} />)}
        </div>
      </div>
      <div className="resource-strip">
        <div className={`resource human ${humanActive ? "player" : ""}`}><Shield size={17} /><span><small>补给</small><b>{game.resources.human}</b></span></div>
        <div className="radio-signal"><Radio size={16} /><i /></div>
        <div className={`resource zombie ${!humanActive ? "player" : ""}`}><Skull size={17} /><span><small>变异</small><b>{game.resources.zombie}</b></span></div>
      </div>
    </header>
  );
}

