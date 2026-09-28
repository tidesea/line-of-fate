import * as THREE from "three";
import { gsap } from "gsap";
import type { LevelDefinition } from "../config/levels.config";
import { GridSystem } from "../core/GridSystem";
import type { CombatFx, UnitState } from "../core/types";
import { UNIT_DEFS } from "../config/units.config";
import { MaterialLibrary as Mat } from "./MaterialLibrary";
import { UnitBuilder } from "./UnitBuilder";

type Cell = { col: number; row: number };

export class BoardRenderer {
  private readonly tiles = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>>();
  private readonly unitGroups = new Map<string, THREE.Group>();
  private readonly terrainGroups = new Map<string, THREE.Group>();
  private readonly boardRoot = new THREE.Group();
  private readonly fxRoot = new THREE.Group();
  private readonly selectionRing: THREE.Mesh;
  private readonly selectionMarker: THREE.Sprite;
  private activeGroup: THREE.Group | null = null;
  private lastFxSeq = -1;

  constructor(private scene: THREE.Scene, private level: LevelDefinition) {
    scene.add(this.boardRoot);
    this.boardRoot.add(this.fxRoot);
    this.buildTiles();
    this.buildTerrain();

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.44, 0.54, 40),
      new THREE.MeshBasicMaterial({ color: 0xffc24a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.renderOrder = 5;
    this.selectionRing.visible = false;
    this.boardRoot.add(this.selectionRing);

    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(54, 14); ctx.lineTo(32, 52); ctx.closePath();
      ctx.stroke(); ctx.fill();
    }
    const markerTex = new THREE.CanvasTexture(canvas);
    markerTex.colorSpace = THREE.SRGBColorSpace;
    this.selectionMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, transparent: true, depthTest: false }));
    this.selectionMarker.scale.set(0.34, 0.34, 1);
    this.selectionMarker.renderOrder = 60;
    this.selectionMarker.visible = false;
    this.boardRoot.add(this.selectionMarker);
  }

  private buildTiles() {
    const tileGeometry = new THREE.BoxGeometry(0.92, 0.14, 0.92);
    for (let row = 0; row < this.level.rows; row += 1) for (let col = 0; col < this.level.cols; col += 1) {
      const isNexus = col === this.level.nexus.col && row === this.level.nexus.row;
      const color = isNexus
        ? 0xd89b32
        : col <= 1
          ? 0x2a5a7a
          : col >= this.level.cols - 2
            ? 0x4a662e
            : (row + col) % 2
              ? 0x5e5a4a
              : 0x6e6956;
      const material = Mat.tile(color, isNexus ? 0x6e3f12 : 0x000000, isNexus ? 0.52 : 0);
      const tile = new THREE.Mesh(tileGeometry.clone(), material);
      const world = GridSystem.gridToWorld(col, row, this.level);
      tile.position.set(world.x, -0.07, world.z);
      tile.receiveShadow = true;
      tile.userData = { grid: true, col, row, tile: true, baseColor: color, nexus: isNexus };
      this.boardRoot.add(tile);
      this.tiles.set(GridSystem.key(col, row), tile);
    }

    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(this.level.cols + 0.8, 0.35, this.level.rows + 0.8),
      Mat.foundation(),
    );
    foundation.position.y = -0.3;
    foundation.receiveShadow = true;
    this.boardRoot.add(foundation);

    // Subtle grid lines for readability (teen audience — clear tactical board).
    const gridPoints: number[] = [];
    const halfW = this.level.cols / 2;
    const halfH = this.level.rows / 2;
    for (let c = 0; c <= this.level.cols; c += 1) {
      const x = c - halfW;
      gridPoints.push(x, 0.01, -halfH, x, 0.01, halfH);
    }
    for (let r = 0; r <= this.level.rows; r += 1) {
      const z = r - halfH;
      gridPoints.push(-halfW, 0.01, z, halfW, 0.01, z);
    }
    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
    const grid = new THREE.LineSegments(
      gridGeom,
      new THREE.LineBasicMaterial({ color: 0xb8c4a8, transparent: true, opacity: 0.22 }),
    );
    this.boardRoot.add(grid);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.075, 8, 28),
      Mat.toon(0xffc24a, { emissive: 0xff8a00, emissiveIntensity: 0.85 }),
    );
    const nexusWorld = GridSystem.gridToWorld(this.level.nexus.col, this.level.nexus.row, this.level);
    ring.position.set(nexusWorld.x, 0.13, nexusWorld.z);
    ring.rotation.x = Math.PI / 2;
    this.boardRoot.add(ring);
  }

  private buildTerrain() {
    this.level.terrain.forEach(item => {
      const group = new THREE.Group();
      const world = GridSystem.gridToWorld(item.col, item.row, this.level);
      group.position.set(world.x, 0, world.z);
      group.userData = { grid: true, col: item.col, row: item.row, terrain: item.kind };
      if (item.kind === "wreck") {
        const shell = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.52), Mat.metal(0x8c4b2d));
        shell.position.y = 0.28; shell.rotation.y = 0.18; shell.castShadow = true; group.add(shell);
        [-0.28, 0.28].forEach(x => [-0.28, 0.28].forEach(z => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8), Mat.metal(0x171b1e));
          wheel.position.set(x, 0.13, z); wheel.rotation.x = Math.PI / 2; group.add(wheel);
        }));
      } else if (item.kind === "barricade") {
        [-0.22, 0.22].forEach(x => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), Mat.toon(0xb87942, { map: Mat.textures.metal }));
          post.position.set(x, 0.28, 0); post.rotation.z = x > 0 ? 0.2 : -0.2; group.add(post);
        });
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.12), Mat.toon(0xe0a56a, { map: Mat.textures.metal }));
        rail.position.y = 0.37; group.add(rail);
      } else if (item.kind === "crate") {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.56, 0.56, 0.56),
          Mat.toon(0xf6c83f, { emissive: 0x7d5600, emissiveIntensity: 0.28, map: Mat.textures.armor }),
        );
        crate.position.y = 0.32; crate.castShadow = true; group.add(crate);
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.62), Mat.metal(0x333c3f));
        band.position.y = 0.32; group.add(band);
      } else if (item.kind === "outpost") {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.12, 10), Mat.metal(0x7b8079));
        pad.position.y = 0.08; group.add(pad);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.72, 8), Mat.metal(0xc6c9c6));
        mast.position.y = 0.48; group.add(mast);
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
          Mat.metal(0x9ea7aa),
        );
        dish.position.set(0.12, 0.76, 0); dish.rotation.z = -0.8; group.add(dish);
      } else if (item.kind === "blight") {
        const poolMat = Mat.toon(0x69b41f, { emissive: 0x3b7f13, emissiveIntensity: 0.55 });
        poolMat.transparent = true;
        poolMat.opacity = 0.82;
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.46, 0.06, 12), poolMat);
        pool.position.y = 0.05; group.add(pool);
        const bubble = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.09, 0),
          Mat.toon(0xc9f45f, { emissive: 0x8acb25, emissiveIntensity: 0.75 }),
        );
        bubble.position.set(0.16, 0.12, -0.09); group.add(bubble);
      }
      group.traverse(child => { if (child instanceof THREE.Mesh) child.castShadow = true; });
      this.boardRoot.add(group);
      this.terrainGroups.set(GridSystem.key(item.col, item.row), group);
    });
  }

  syncUnits(units: UnitState[], activeUnitId: string | null, playerFaction: string, consumedCrates: string[]) {
    const alive = units.filter(unit => unit.hp > 0);
    const ids = new Set(alive.map(unit => unit.id));
    this.unitGroups.forEach((group, id) => {
      if (!ids.has(id)) { this.unitGroups.delete(id); this.killGroup(group); }
    });

    let activeGroup: THREE.Group | null = null;
    alive.forEach(unit => {
      let group = this.unitGroups.get(unit.id);
      const world = GridSystem.gridToWorld(unit.col, unit.row, this.level);
      if (!group) {
        group = UnitBuilder.build(unit);
        group.position.set(world.x, 0.01, world.z);
        group.scale.setScalar(0.01);
        this.boardRoot.add(group);
        this.unitGroups.set(unit.id, group);
        gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.36, ease: "back.out(1.8)" });
      } else if (group.userData.col !== unit.col || group.userData.row !== unit.row) {
        gsap.to(group.position, { x: world.x, z: world.z, duration: 0.38, ease: "power2.out" });
      }
      group.userData = { ...group.userData, col: unit.col, row: unit.row, unitId: unit.id, faction: unit.faction, hp: unit.hp };
      const isActive = unit.id === activeUnitId;
      if (isActive) activeGroup = group;
      const sprite = UnitBuilder.sprite(group);
      if (sprite) {
        const base = (group.userData.baseScale as number) ?? 1;
        const target = isActive ? base * 1.12 : base;
        gsap.to(sprite.scale, { x: target, y: target, duration: 0.2 });
        // Dim non-player units slightly? No — keep full colour; only low HP gets a tint.
        const ratio = unit.hp / UNIT_DEFS[unit.key].maxHp;
        if (!group.userData.flashing) sprite.material.color.set(ratio < 0.3 ? 0xffb0b0 : 0xffffff);
      }
      group.renderOrder = unit.faction === playerFaction ? 2 : 1;
    });

    // Selected-unit ring + floating marker (clear "who is acting").
    this.activeGroup = activeGroup;
    this.selectionRing.visible = !!activeGroup;
    this.selectionMarker.visible = !!activeGroup;
    const activeUnit = alive.find(unit => unit.id === activeUnitId);
    if (activeUnit) {
      const color = activeUnit.faction === playerFaction ? 0xffc24a : 0xff5a5a;
      (this.selectionRing.material as THREE.MeshBasicMaterial).color.set(color);
      this.selectionMarker.material.color.set(color);
    }

    this.terrainGroups.forEach((group, key) => {
      if (group.userData.terrain === "crate") group.visible = !consumedCrates.includes(key);
    });
  }

  /** Death: flash, topple, fade, then dispose. */
  private killGroup(group: THREE.Group) {
    const sprite = UnitBuilder.sprite(group);
    const cross = this.makeTextSprite("✖", "#ff4b4b", 0.7);
    cross.position.set(0, 0.7, 0);
    group.add(cross);
    if (sprite) {
      sprite.material.color.set(0xff6060);
      gsap.to(sprite.material, { rotation: group.userData.faction === "zombie" ? -1.3 : 1.3, duration: 0.45, ease: "power2.in" });
      gsap.to(sprite.material, { opacity: 0, duration: 0.5, delay: 0.35 });
    }
    gsap.to(cross.position, { y: 1.3, duration: 0.8 });
    gsap.to(cross.material, { opacity: 0, duration: 0.4, delay: 0.5 });
    gsap.to(group.position, { y: -0.15, duration: 0.8, delay: 0.2, onComplete: () => {
      UnitBuilder.dispose(group); this.boardRoot.remove(group);
    } });
  }

  private makeTextSprite(text: string, color: string, size = 0.55) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "900 72px system-ui, 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 12; ctx.strokeStyle = "rgba(0,0,0,.9)";
      ctx.strokeText(text, 128, 64);
      ctx.fillStyle = color; ctx.fillText(text, 128, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    sprite.scale.set(size * 2, size, 1);
    sprite.renderOrder = 50;
    return sprite;
  }

  private disposeSprite(sprite: THREE.Sprite) {
    sprite.material.map?.dispose();
    sprite.material.dispose();
    sprite.parent?.remove(sprite);
  }

  private flash(id: string) {
    const group = this.unitGroups.get(id);
    const sprite = group && UnitBuilder.sprite(group);
    if (!group || !sprite) return;
    group.userData.flashing = true;
    sprite.material.color.set(0xff3030);
    gsap.fromTo(sprite.position, { x: -0.08 }, { x: 0, duration: 0.3, ease: "elastic.out(1.2, 0.3)" });
    window.setTimeout(() => { sprite.material.color.set(0xffffff); group.userData.flashing = false; }, 220);
  }

  /** Attack feedback: tracer / lunge / blast, target flash, floating damage. */
  playFx(fx: CombatFx) {
    if (fx.seq === this.lastFxSeq) return;
    this.lastFxSeq = fx.seq;
    const from = GridSystem.gridToWorld(fx.from.col, fx.from.row, this.level);
    const human = fx.attackerFaction === "human";
    const tracerColor = human ? 0xffd166 : 0xa6ff3b;

    if (fx.kind === "explode") {
      const blast = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.35, 40), new THREE.MeshBasicMaterial({ color: 0xc6ff3b, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      blast.rotation.x = -Math.PI / 2; blast.position.set(from.x, 0.05, from.z);
      this.fxRoot.add(blast);
      gsap.to(blast.scale, { x: 7, y: 7, z: 7, duration: 0.55, ease: "power2.out" });
      gsap.to(blast.material, { opacity: 0, duration: 0.55, onComplete: () => { blast.geometry.dispose(); blast.material.dispose(); this.fxRoot.remove(blast); } });
    }

    fx.hits.forEach((hit, index) => {
      const to = GridSystem.gridToWorld(hit.col, hit.row, this.level);
      if (fx.kind === "shot") {
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x, 0.55, from.z), new THREE.Vector3(to.x, 0.5, to.z)]);
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: tracerColor, transparent: true, opacity: 1, depthTest: false }));
        line.renderOrder = 40;
        this.fxRoot.add(line);
        gsap.to(line.material, { opacity: 0, duration: 0.45, delay: 0.1, onComplete: () => { geometry.dispose(); line.material.dispose(); this.fxRoot.remove(line); } });
      } else if (fx.kind === "melee" && index === 0) {
        const attacker = this.unitGroups.get(fx.attackerId);
        const sprite = attacker && UnitBuilder.sprite(attacker);
        if (sprite) {
          const dx = Math.sign(to.x - from.x) * 0.3; const dz = Math.sign(to.z - from.z) * 0.3;
          gsap.fromTo(sprite.position, { x: 0, z: 0 }, { x: dx, z: dz, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" });
        }
      }
      this.flash(hit.id);
      const label = hit.killed ? `-${hit.damage} 击杀` : `-${hit.damage}`;
      const text = this.makeTextSprite(label, hit.killed ? "#ff4b4b" : fx.tag ? "#ffe14b" : "#ffffff", hit.killed ? 0.5 : 0.42);
      text.position.set(to.x, 1.15, to.z);
      this.fxRoot.add(text);
      gsap.to(text.position, { y: 1.85, duration: 1.1, ease: "power1.out" });
      gsap.to(text.material, { opacity: 0, duration: 0.4, delay: 0.8, onComplete: () => this.disposeSprite(text) });
    });

    if (fx.counter && fx.counter.damage > 0) {
      this.flash(fx.attackerId);
      const text = this.makeTextSprite(`反击 -${fx.counter.damage}`, "#ff9d4b", 0.36);
      text.position.set(from.x, 1.1, from.z);
      this.fxRoot.add(text);
      gsap.to(text.position, { y: 1.7, duration: 1.1, delay: 0.25 });
      gsap.to(text.material, { opacity: 0, duration: 0.4, delay: 1.0, onComplete: () => this.disposeSprite(text) });
    }
  }

  /** Per-frame animation for selection ring / marker. */
  tick(time: number) {
    if (!this.activeGroup) return;
    const p = this.activeGroup.position;
    this.selectionRing.position.set(p.x, 0.03, p.z);
    const pulse = 1 + Math.sin(time * 5) * 0.08;
    this.selectionRing.scale.set(pulse, pulse, pulse);
    const height = ((this.activeGroup.userData.baseScale as number) ?? 1) * 1.15 + 0.35;
    this.selectionMarker.position.set(p.x, height + Math.sin(time * 4) * 0.08, p.z);
  }

  setHighlights(cells: Cell[], attacks: Cell[], hover: Cell | null, active: Cell | null = null) {
    const activeKey = active ? GridSystem.key(active.col, active.row) : "";
    const moves = new Set(cells.map(c => GridSystem.key(c.col, c.row)));
    const targets = new Set(attacks.map(c => GridSystem.key(c.col, c.row)));
    const hoverKey = hover ? GridSystem.key(hover.col, hover.row) : "";
    this.tiles.forEach((tile, key) => {
      const material = tile.material;
      if (key === activeKey) { material.emissive.set(0xffa51f); material.emissiveIntensity = 0.7; }
      else if (targets.has(key)) { material.emissive.set(0xff334d); material.emissiveIntensity = 0.82; }
      else if (moves.has(key)) { material.emissive.set(0x1fb9ff); material.emissiveIntensity = 0.52; }
      else if (key === hoverKey) { material.emissive.set(0xffffff); material.emissiveIntensity = 0.38; }
      else if (tile.userData.nexus) { material.emissive.set(0x6e3f12); material.emissiveIntensity = 0.52; }
      else { material.emissive.set(0x000000); material.emissiveIntensity = 0; }
    });
  }

  getUnitGroups() { return this.unitGroups; }

  dispose() {
    this.unitGroups.forEach(group => UnitBuilder.dispose(group));
    this.boardRoot.traverse(child => {
      if (child instanceof THREE.Sprite) { child.material.map?.dispose(); child.material.dispose(); return; }
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
      }
    });
    this.scene.remove(this.boardRoot);
  }
}
