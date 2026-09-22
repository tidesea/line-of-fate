"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FastForward, Flag, Info, Maximize2, Minus, Plus, RotateCcw, Swords } from "lucide-react";
import type { Faction, UnitKey } from "./config/units.config";
import { factionPool, opposingFaction, UNIT_DEFS } from "./config/units.config";
import { LEVEL_LIST, LEVELS } from "./config/levels.config";
import { AIDecisionTree } from "./ai/AIDecisionTree";
import { SoundSynthesizer } from "./audio/SoundSynthesizer";
import { CombatEngine } from "./core/CombatEngine";
import { BalanceEngine } from "./core/BalanceEngine";
import { GridSystem } from "./core/GridSystem";
import { ObjectiveManager } from "./core/ObjectiveManager";
import { ResourceManager } from "./core/ResourceManager";
import { StorageManager } from "./core/StorageManager";
import { TurnManager } from "./core/TurnManager";
import type { FloatingAnchor, GameState, UnitState } from "./core/types";
import { SceneView } from "./render/SceneView";
import { CardHandUI } from "./ui/CardHandUI";
import { FloatingHUD } from "./ui/FloatingHUD";
import { TopBarHUD } from "./ui/TopBarHUD";

type Cell = { col: number; row: number };

const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const weightedHand = (faction: Faction, count: number): UnitKey[] => {
  const pool = factionPool(faction);
  return Array.from({ length: count }, () => {
    const roll = Math.random();
    const tier = roll < 0.5 ? pool.filter(key => UNIT_DEFS[key].cost <= 2) : roll < 0.85 ? pool.filter(key => UNIT_DEFS[key].cost <= 4) : pool.filter(key => UNIT_DEFS[key].cost >= 6);
    const options = tier.length ? tier : pool;
    return options[Math.floor(Math.random() * options.length)];
  });
};

const blankGame = (): GameState => ({
  phase: "briefing", round: 1, level: 5, playerFaction: "human", resources: { human: 5, zombie: 5 }, units: [], hand: [], selectedCard: null,
  initiative: [], initiativeIndex: 0, activeUnitId: null, actionMoved: false, nexus: { faction: null, unitId: null, rounds: 0 },
  outposts: [],
  consumedCrates: [], winner: null, log: ["等待指挥官选择阵营。"],
});

const addLog = (logs: string[], message: string) => [message, ...logs].slice(0, 5);

const nextLivingTurn = (state: GameState, units = state.units): GameState => {
  let index = state.initiativeIndex + 1;
  while (index < state.initiative.length && !units.some(unit => unit.id === state.initiative[index] && unit.hp > 0)) index += 1;
  if (index >= state.initiative.length) return { ...state, units, phase: "objective", initiativeIndex: index, activeUnitId: null, actionMoved: false };
  return { ...state, units, initiativeIndex: index, activeUnitId: state.initiative[index], actionMoved: false };
};

const findFreeAdjacent = (origin: Cell, state: GameState) => {
  const level = LEVELS[state.level];
  return GridSystem.cellsWithin(origin, 1, level).find(cell =>
    GridSystem.chebyshev(origin, cell) === 1 && !GridSystem.isBlocked(cell.col, cell.row, state.units, level, undefined, state.consumedCrates)
  ) || null;
};

const applyAttack = (state: GameState, attackerId: string, defenderId: string) => {
  const attacker = state.units.find(unit => unit.id === attackerId && unit.hp > 0);
  const defender = state.units.find(unit => unit.id === defenderId && unit.hp > 0);
  if (!attacker || !defender) return state;
  const attackDef = UNIT_DEFS[attacker.key];
  const distance = GridSystem.chebyshev(attacker, defender);
  if (distance < attackDef.minRange || distance > attackDef.maxRange) return state;

  let units = state.units.map(unit => ({ ...unit, statuses: unit.statuses.map(status => ({ ...status })) }));
  const resources = { ...state.resources };
  let nexus = state.nexus;
  let log = state.log;

  if (attacker.key === "boomer") {
    units = units.map(unit => {
      if (unit.id === attacker.id) return { ...unit, hp: 0 };
      if (unit.faction === "human" && GridSystem.chebyshev(attacker, unit) <= 2) return { ...unit, hp: unit.hp - 55 };
      return unit;
    });
    if (nexus.unitId && (units.find(unit => unit.id === nexus.unitId)?.hp ?? 0) <= 0) nexus = { faction: null, unitId: null, rounds: 0 };
    resources.zombie += 1;
    log = addLog(log, `${attackDef.name}酸液殉爆，范围造成 55 点伤害。`);
    SoundSynthesizer.play("EXPLODE");
    return { ...state, units, resources, nexus, log };
  }

  const result = CombatEngine.resolve(attacker, defender, units);
  units = units.map(unit => {
    if (unit.id === defender.id) {
      const statuses = attacker.key === "walker" ? [...unit.statuses, { type: "infection" as const, rounds: 3, value: 8 }] : unit.statuses;
      return { ...unit, hp: unit.hp - result.damage, countersLeft: result.counterDamage ? Math.max(0, unit.countersLeft - 1) : unit.countersLeft, statuses };
    }
    if (unit.id === attacker.id && result.counterDamage) return { ...unit, hp: unit.hp - result.counterDamage };
    return unit;
  });

  if (attacker.key === "vehicle") {
    units = units.map(unit => unit.faction !== attacker.faction && unit.id !== defender.id && GridSystem.chebyshev(unit, defender) === 1
      ? { ...unit, hp: unit.hp - Math.floor(result.damage * 0.5) } : unit);
  }

  let updatedDefender = units.find(unit => unit.id === defender.id)!;
  const updatedAttacker = units.find(unit => unit.id === attacker.id)!;
  if (result.knockback && updatedDefender.hp > 0) {
    const dc = Math.sign(defender.col - attacker.col); const dr = Math.sign(defender.row - attacker.row);
    const destination = { col: defender.col + dc, row: defender.row + dr };
    if (!GridSystem.isBlocked(destination.col, destination.row, units, LEVELS[state.level], defender.id, state.consumedCrates)) {
      units = units.map(unit => unit.id === defender.id ? { ...unit, ...destination } : unit);
      nexus = ObjectiveManager.resetIfOccupantMoved({ ...state, nexus }, defender.id, destination);
      updatedDefender = units.find(unit => unit.id === defender.id)!;
    }
  }

  const killedDefender = updatedDefender.hp <= 0;
  const killedAttacker = updatedAttacker.hp <= 0;
  if (killedDefender) {
    resources[attacker.faction] += ResourceManager.killBounty(attacker, defender);
    if (defender.faction === "zombie") resources.zombie += 1;
    if (defender.key === "crawler") units = units.map(unit => unit.faction === "zombie" && unit.hp > 0 && GridSystem.chebyshev(unit, defender) === 1 ? { ...unit, hp: Math.min(UNIT_DEFS[unit.key].maxHp, unit.hp + 10) } : unit);
    if (attacker.key === "mother" && defender.faction === "human") {
      units.push({ id: uid(), key: "crawler", faction: "zombie", col: defender.col, row: defender.row, hp: 35, countersLeft: 1, moved: true, acted: true, deployedRound: state.round, statuses: [] });
    }
  }
  if (killedAttacker && attacker.faction === "zombie") resources.zombie += 1;
  if ((killedDefender && nexus.unitId === defender.id) || (killedAttacker && nexus.unitId === attacker.id)) nexus = { faction: null, unitId: null, rounds: 0 };

  log = addLog(log, `${attackDef.shortName} → ${UNIT_DEFS[defender.key].shortName}：${result.damage} 伤害${result.critical ? " · 暴击" : ""}${result.meleePenalty ? " · 贴身衰减" : ""}${result.counterDamage ? ` · 反击 ${result.counterDamage}` : ""}`);
  SoundSynthesizer.play(attackDef.maxRange > 1 ? "SHOOT" : "HIT");
  return { ...state, units, resources, nexus, log };
};

export default function GameApp() {
  const [game, setGame] = useState<GameState>(blankGame);
  const [levelChoice, setLevelChoice] = useState(5);
  const [factionChoice, setFactionChoice] = useState<Faction>("human");
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const [anchors, setAnchors] = useState<FloatingAnchor[]>([]);
  const [zoom, setZoom] = useState(1);
  const aiDeployRound = useRef(0);
  const recordedBattle = useRef(false);
  const level = LEVELS[game.level];
  const selectedLevel = LEVELS[levelChoice];
  const selectedBalance = BalanceEngine.forLevel(selectedLevel);
  const activeUnit = game.units.find(unit => unit.id === game.activeUnitId && unit.hp > 0) || null;
  const playerTurn = game.phase === "combat" && activeUnit?.faction === game.playerFaction;

  const moveCells = useMemo(() => {
    if (!playerTurn || !activeUnit || game.actionMoved) return [];
    const move = UNIT_DEFS[activeUnit.key].move + (activeUnit.faction === "human" && game.units.some(u => u.faction === "human" && u.key === "specialist" && u.hp > 0) ? 1 : 0);
    return GridSystem.cellsWithin(activeUnit, move, level).filter(cell => {
      if (GridSystem.chebyshev(activeUnit, cell) === 0) return false;
      const crate = level.terrain.some(t => t.kind === "crate" && t.col === cell.col && t.row === cell.row && !game.consumedCrates.includes(GridSystem.key(t.col, t.row)));
      if (crate && activeUnit.faction === "human") return !game.units.some(u => u.hp > 0 && u.col === cell.col && u.row === cell.row);
      return !GridSystem.isBlocked(cell.col, cell.row, game.units, level, activeUnit.id, game.consumedCrates);
    });
  }, [playerTurn, activeUnit, game.actionMoved, game.units, game.consumedCrates, level]);

  const attackCells = useMemo(() => {
    if (!playerTurn || !activeUnit) return [];
    const def = UNIT_DEFS[activeUnit.key];
    return game.units.filter(unit => unit.hp > 0 && unit.faction !== activeUnit.faction).filter(unit => {
      const distance = GridSystem.chebyshev(activeUnit, unit);
      return distance >= def.minRange && distance <= def.maxRange;
    }).map(unit => ({ col: unit.col, row: unit.row }));
  }, [playerTurn, activeUnit, game.units]);

  const startGame = useCallback(() => {
    const chosen = LEVELS[levelChoice];
    const balance = BalanceEngine.forLevel(chosen);
    const outposts = chosen.terrain.filter(item => item.kind === "outpost").map(item => ({ col: item.col, row: item.row, owner: null, progressFaction: null, progress: 0 }));
    const resources = factionChoice === "human"
      ? { human: balance.playerStart, zombie: balance.enemyStart }
      : { human: balance.enemyStart, zombie: balance.playerStart };
    setGame({
      ...blankGame(), phase: "deploy", level: levelChoice, playerFaction: factionChoice, resources, hand: weightedHand(factionChoice, 4), outposts,
      log: [`作战开始：你指挥${factionChoice === "human" ? "人类先锋军" : "僵尸军团"}。`, "先部署单位，再进入交战。"],
    });
    aiDeployRound.current = 0; recordedBattle.current = false; setZoom(1); SoundSynthesizer.play("CLICK");
  }, [factionChoice, levelChoice]);

  const deployAI = useCallback(() => {
    setGame(current => {
      if (current.phase !== "deploy") return current;
      const faction = opposingFaction(current.playerFaction);
      const next = { ...current, resources: { ...current.resources }, units: current.units.slice() };
      const deploymentCap = BalanceEngine.forLevel(LEVELS[next.level]).enemyDeployCap;
      for (let attempt = 0; attempt < deploymentCap; attempt += 1) {
        const key = AIDecisionTree.chooseDeployment(next, faction);
        const cell = AIDecisionTree.chooseDeployCell(next, faction, LEVELS[next.level]);
        if (!key || !cell) break;
        const def = UNIT_DEFS[key];
        next.resources[faction] -= def.cost;
        next.units.push({ id: uid(), key, faction, ...cell, hp: def.maxHp, countersLeft: def.counters, moved: false, acted: false, deployedRound: next.round, statuses: [] });
        next.log = addLog(next.log, `敌方部署：${def.name}。`);
        if (next.resources[faction] < 1) break;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (game.phase === "deploy" && aiDeployRound.current !== game.round) {
      aiDeployRound.current = game.round;
      const timer = window.setTimeout(deployAI, 380);
      return () => window.clearTimeout(timer);
    }
  }, [game.phase, game.round, deployAI]);

  const startCombat = useCallback(() => {
    setGame(current => {
      if (current.phase !== "deploy" || !current.units.some(unit => unit.faction === current.playerFaction && unit.hp > 0)) return { ...current, log: addLog(current.log, "至少部署一个单位才能进入交战。") };
      const units = current.units.filter(unit => unit.hp > 0).map(unit => ({ ...unit, countersLeft: UNIT_DEFS[unit.key].counters, moved: false, acted: false }));
      const initiative = TurnManager.createInitiative(units, current.playerFaction);
      return { ...current, units, phase: "combat", selectedCard: null, initiative, initiativeIndex: 0, activeUnitId: initiative[0] || null, actionMoved: false, log: addLog(current.log, "行动序列已锁定，交战开始。") };
    });
    SoundSynthesizer.play("CLICK");
  }, []);

  const finishPlayerAction = useCallback(() => setGame(current => nextLivingTurn(current)), []);

  const moveUnit = useCallback((state: GameState, unitId: string, cell: Cell) => {
    const consumedCrates = state.consumedCrates.slice();
    const resources = { ...state.resources };
    const unit = state.units.find(item => item.id === unitId)!;
    const crateKey = GridSystem.key(cell.col, cell.row);
    const terrain = LEVELS[state.level].terrain.find(t => t.col === cell.col && t.row === cell.row);
    const isCrate = terrain?.kind === "crate" && !consumedCrates.includes(crateKey);
    if (isCrate && unit.faction === "human") { consumedCrates.push(crateKey); resources.human += 3; SoundSynthesizer.play("CAPTURE"); }
    const blightDamage = terrain?.kind === "blight" ? 15 : 0;
    const units = state.units.map(item => item.id === unitId ? { ...item, ...cell, hp: item.hp - blightDamage, moved: true } : item);
    const nexus = ObjectiveManager.resetIfOccupantMoved(state, unitId, cell);
    return { ...state, units, resources, consumedCrates, nexus, actionMoved: true, log: addLog(state.log, `${UNIT_DEFS[unit.key].shortName}移动至 ${cell.col},${cell.row}${isCrate ? "，拾取空投 +3 补给" : ""}${blightDamage ? "，毒地伤害 15" : ""}。`) };
  }, []);

  const handleCellClick = useCallback((cell: Cell) => {
    setGame(current => {
      if (current.phase === "deploy" && current.selectedCard !== null) {
        const key = current.hand[current.selectedCard];
        const def = UNIT_DEFS[key];
        const currentLevel = LEVELS[current.level];
        const legalColumn = current.playerFaction === "human" ? cell.col <= 1 : cell.col >= currentLevel.cols - 2;
        if (!legalColumn || GridSystem.isBlocked(cell.col, cell.row, current.units, currentLevel, undefined, current.consumedCrates)) {
          return { ...current, log: addLog(current.log, "部署失败：请选择己方两列内的空置地块。") };
        }
        if (current.resources[current.playerFaction] < def.cost) return current;
        const hand = current.hand.filter((_, index) => index !== current.selectedCard);
        SoundSynthesizer.play("DEPLOY");
        return {
          ...current,
          resources: { ...current.resources, [current.playerFaction]: current.resources[current.playerFaction] - def.cost },
          units: [...current.units, { id: uid(), key, faction: current.playerFaction, ...cell, hp: def.maxHp, countersLeft: def.counters, moved: false, acted: false, deployedRound: current.round, statuses: [] }],
          hand, selectedCard: null, log: addLog(current.log, `部署完成：${def.name}。`),
        };
      }

      const active = current.units.find(unit => unit.id === current.activeUnitId && unit.hp > 0);
      if (current.phase !== "combat" || !active || active.faction !== current.playerFaction) return current;
      const enemy = current.units.find(unit => unit.hp > 0 && unit.faction !== active.faction && unit.col === cell.col && unit.row === cell.row);
      if (enemy) {
        const def = UNIT_DEFS[active.key]; const distance = GridSystem.chebyshev(active, enemy);
        if (distance < def.minRange || distance > def.maxRange) return { ...current, log: addLog(current.log, "目标超出有效射程。") };
        return nextLivingTurn(applyAttack(current, active.id, enemy.id));
      }
      const canMove = !current.actionMoved && moveCells.some(candidate => candidate.col === cell.col && candidate.row === cell.row);
      return canMove ? moveUnit(current, active.id, cell) : current;
    });
  }, [moveCells, moveUnit]);

  useEffect(() => {
    if (game.phase !== "combat" || !activeUnit || activeUnit.faction === game.playerFaction) return;
    const timer = window.setTimeout(() => {
      setGame(current => {
        const unit = current.units.find(item => item.id === current.activeUnitId && item.hp > 0);
        if (!unit) return nextLivingTurn(current);
        if (unit.statuses.some(status => status.type === "stun" && status.rounds > 0)) return nextLivingTurn({ ...current, log: addLog(current.log, `${UNIT_DEFS[unit.key].shortName}处于瘫痪，跳过行动。`) });
        const enemies = current.units.filter(item => item.hp > 0 && item.faction !== unit.faction);
        const target = AIDecisionTree.chooseTarget(unit, enemies, LEVELS[current.level]);
        if (!target) return nextLivingTurn(current);
        const def = UNIT_DEFS[unit.key];
        let working = current;
        let acting = unit;
        let distance = GridSystem.chebyshev(acting, target);
        if (distance < def.minRange || distance > def.maxRange) {
          const cell = AIDecisionTree.chooseMove(acting, target, working, LEVELS[working.level]);
          if (cell) { working = moveUnit(working, acting.id, cell); acting = working.units.find(item => item.id === unit.id)!; distance = GridSystem.chebyshev(acting, target); }
        }
        const targetHp = working.units.find(item => item.id === target.id)?.hp ?? 0;
        if (distance >= def.minRange && distance <= def.maxRange && targetHp > 0) working = applyAttack(working, acting.id, target.id);
        return nextLivingTurn(working);
      });
    }, 620);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.activeUnitId, activeUnit, game.playerFaction, moveUnit]);

  useEffect(() => {
    if (game.phase !== "objective") return;
    const timer = window.setTimeout(() => {
      setGame(current => {
        const settled = ObjectiveManager.settle(current);
        if (settled.winner) {
          SoundSynthesizer.play("VICTORY");
          return { ...current, ...settled, phase: "over", log: addLog(current.log, `${settled.winner === "human" ? "人类" : "僵尸"}连续控制中央据点五回合，战役结束。`) };
        }

        let units = current.units.map(unit => {
          const infection = unit.statuses.filter(status => status.type === "infection").reduce((sum, status) => sum + (status.value || 8), 0);
          return { ...unit, hp: unit.hp - infection, statuses: unit.statuses.map(status => ({ ...status, rounds: status.rounds - 1 })).filter(status => status.rounds > 0) };
        });
        let working: GameState = { ...current, ...settled, units };
        units.filter(unit => unit.key === "mother" && unit.hp > 0).forEach(mother => {
          const cell = findFreeAdjacent(mother, working);
          if (cell) {
            const spawn: UnitState = { id: uid(), key: "crawler", faction: "zombie", ...cell, hp: 35, countersLeft: 1, moved: false, acted: false, deployedRound: current.round + 1, statuses: [] };
            units = [...units, spawn]; working = { ...working, units };
          }
        });
        const resources = {
          human: current.resources.human + ResourceManager.income("human", settled.outposts),
          zombie: current.resources.zombie + ResourceManager.income("zombie", settled.outposts),
        };
        const hand = [...current.hand, ...weightedHand(current.playerFaction, Math.max(0, 4 - current.hand.length))];
        return { ...working, units, resources, hand, phase: "deploy", round: current.round + 1, initiative: [], initiativeIndex: 0, activeUnitId: null, actionMoved: false, selectedCard: null, log: addLog(current.log, `第 ${current.round} 回合结算。据点：${settled.nexus.faction ? `${settled.nexus.faction === "human" ? "人类" : "僵尸"} ${settled.nexus.rounds}/5` : "无人控制"}。`) };
      });
    }, 720);
    return () => window.clearTimeout(timer);
  }, [game.phase]);

  useEffect(() => {
    if (game.phase === "over" && game.winner && !recordedBattle.current) {
      recordedBattle.current = true;
      StorageManager.recordBattle(game.playerFaction, game.winner, game.level, game.round);
      try { localStorage.removeItem("FATE_DEFENSE_BATTLE_CACHE"); } catch { /* ignore */ }
    } else if (game.phase !== "briefing" && game.phase !== "over") {
      try { localStorage.setItem("FATE_DEFENSE_BATTLE_CACHE", JSON.stringify(game)); } catch { /* ignore */ }
    }
  }, [game]);

  const selectedCard = game.selectedCard === null ? null : UNIT_DEFS[game.hand[game.selectedCard]];
  const objectiveOwner = game.nexus.faction === "human" ? "人类" : game.nexus.faction === "zombie" ? "僵尸" : "争夺中";

  return (
    <main className={`game-shell faction-${game.playerFaction}`}>
      <TopBarHUD game={game} />
      <section className="battle-layout">
        <aside className="mission-panel">
          <div className="panel-kicker"><Flag size={15} />战略目标</div>
          <h2>中央据点</h2>
          <div className={`nexus-meter ${game.nexus.faction || "neutral"}`}>
            <div>{Array.from({ length: 5 }).map((_, index) => <i className={index < game.nexus.rounds ? "filled" : ""} key={index} />)}</div>
            <strong>{objectiveOwner}</strong><span>{game.nexus.rounds}/5 回合</span>
          </div>
          <p>连续控制中央六角平台五个整回合即可胜出；离开、被击退或阵亡会立刻清零。</p>
          {game.outposts.length > 0 && <div className="outpost-list">{game.outposts.map(post => <div key={`${post.col}-${post.row}`}><span>驻地 {post.col},{post.row}</span><b>{post.owner ? (post.owner === "human" ? "人类" : "僵尸") : `${post.progress}/2`}</b></div>)}</div>}
        </aside>

        <div className="battle-stage">
          <SceneView level={level} units={game.units} activeUnitId={game.activeUnitId} playerFaction={game.playerFaction} consumedCrates={game.consumedCrates} moveCells={moveCells} attackCells={attackCells} hoverCell={hoverCell} zoom={zoom} onCellClick={handleCellClick} onHover={setHoverCell} onProjection={setAnchors} onZoomChange={setZoom} />
          <FloatingHUD anchors={anchors} units={game.units} activeId={game.activeUnitId} />
          <div className="stage-caption"><span>LEVEL {String(level.id).padStart(2, "0")} · {level.name}</span><b>{hoverCell ? `格位 ${String(hoverCell.col).padStart(2, "0")} · ${String(hoverCell.row).padStart(2, "0")}` : `${level.cols}×${level.rows} · ${level.subtitle}`}</b></div>
          <div className="zoom-controls" aria-label="战场缩放">
            <button onClick={() => setZoom(value => Math.max(.72, Number((value - .15).toFixed(2))))} aria-label="缩小战场"><Minus size={16} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(value => Math.min(2.4, Number((value + .15).toFixed(2))))} aria-label="放大战场"><Plus size={16} /></button>
            <button onClick={() => setZoom(1)} aria-label="重置缩放"><Maximize2 size={15} /></button>
            <small>双指缩放</small>
          </div>
          {selectedCard && <div className="deployment-tip"><span>{selectedCard.glyph}</span><div><b>部署 {selectedCard.name}</b><small>点击己方高亮部署线中的空格</small></div></div>}
          {playerTurn && activeUnit && <div className="turn-callout"><span>当前行动</span><b>{UNIT_DEFS[activeUnit.key].name}</b><small>{game.actionMoved ? "已移动 · 选择射程内敌人或结束行动" : "蓝格移动 · 红格攻击"}</small></div>}
        </div>

        <aside className="intel-panel">
          <div className="panel-kicker"><Info size={15} />战场情报</div>
          <div className="unit-counts"><div><span>人类单位</span><b>{game.units.filter(u => u.faction === "human" && u.hp > 0).length}</b></div><div><span>僵尸单位</span><b>{game.units.filter(u => u.faction === "zombie" && u.hp > 0).length}</b></div></div>
          <div className="combat-log">{game.log.map((line, index) => <p className={index === 0 ? "latest" : ""} key={`${line}-${index}`}><i />{line}</p>)}</div>
        </aside>
      </section>

      <footer className="command-deck">
        <div className="deck-label"><span>TACTICAL HAND</span><b>{game.phase === "deploy" ? "选择卡牌并部署" : game.phase === "combat" ? "行动序列执行中" : "战场指令"}</b></div>
        <CardHandUI cards={game.hand} resources={game.resources[game.playerFaction]} selected={game.selectedCard} disabled={game.phase !== "deploy"} onSelect={index => { setGame(current => ({ ...current, selectedCard: current.selectedCard === index ? null : index })); SoundSynthesizer.play("CLICK"); }} />
        <div className="deck-actions">
          {game.phase === "deploy" && <button className="primary-action" onClick={startCombat}><Swords size={18} />进入交战<ChevronRight size={17} /></button>}
          {playerTurn && <button className="primary-action" onClick={finishPlayerAction}><FastForward size={18} />结束行动<ChevronRight size={17} /></button>}
          {!playerTurn && game.phase !== "deploy" && <div className="waiting"><i />{game.phase === "combat" ? "敌方行动中" : "正在结算"}</div>}
        </div>
      </footer>

      {game.phase === "briefing" && <div className="modal-layer"><section className="briefing-card">
        <span className="modal-code">OPERATION // FATE LINE</span><h1>命运防线</h1><p>部署你的卡牌单位，在 15 × 9 的微缩战场上控制中央据点。五个回合，决定谁能活着守住这条线。</p>
        <div className="choice-block"><label>选择阵营</label><div className="faction-choice"><button className={factionChoice === "human" ? "active human" : "human"} onClick={() => setFactionChoice("human")}><ShieldIcon />人类先锋军<small>阵地、射程、后勤</small></button><button className={factionChoice === "zombie" ? "active zombie" : "zombie"} onClick={() => setFactionChoice("zombie")}><SkullIcon />僵尸军团<small>尸潮、感染、滚雪球</small></button></div></div>
        <div className="choice-block level-picker"><label>战场 · 20 关</label><div className="level-grid">{LEVEL_LIST.map(item => <button className={levelChoice === item.id ? "active" : ""} key={item.id} onClick={() => setLevelChoice(item.id)}><b>{String(item.id).padStart(2, "0")}</b><span>{item.name}</span></button>)}</div></div>
        <div className="level-readout">
          <div><small>地图</small><b>{selectedLevel.cols} × {selectedLevel.rows}</b></div>
          <div><small>地形实体</small><b>{selectedLevel.terrain.length}</b></div>
          <div><small>起始点数</small><b>{selectedBalance.playerStart} : {selectedBalance.enemyStart}</b></div>
          <div><small>威胁指数</small><b>{selectedBalance.threatIndex} · {selectedBalance.threatLabel}</b></div>
        </div>
        <button className="launch" onClick={startGame}>开始部署 <ChevronRight /></button>
      </section></div>}

      {game.phase === "over" && <div className="modal-layer"><section className={`result-card ${game.winner === game.playerFaction ? "victory" : "defeat"}`}>
        <span className="modal-code">BATTLE REPORT // ROUND {game.round}</span><h1>{game.winner === game.playerFaction ? "防线守住了" : "阵线失守"}</h1><p>{game.winner === "human" ? "人类先锋军" : "僵尸军团"}完成了中央据点的五回合连续控制。</p><div className="result-stats"><span>回合<b>{game.round}</b></span><span>幸存单位<b>{game.units.filter(u => u.faction === game.playerFaction && u.hp > 0).length}</b></span><span>据点控制<b>5/5</b></span></div><button className="launch" onClick={() => setGame(blankGame())}><RotateCcw size={18} />重新作战</button>
      </section></div>}
    </main>
  );
}

function ShieldIcon() { return <span className="faction-emblem human">人</span>; }
function SkullIcon() { return <span className="faction-emblem zombie">尸</span>; }
