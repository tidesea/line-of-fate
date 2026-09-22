import * as THREE from "three";
import { gsap } from "gsap";
import type { LevelDefinition } from "../config/levels.config";
import { GridSystem } from "../core/GridSystem";
import type { UnitState } from "../core/types";
import { MaterialLibrary as Mat } from "./MaterialLibrary";
import { UnitBuilder } from "./UnitBuilder";

type Cell = { col: number; row: number };

export class BoardRenderer {
  private readonly tiles = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>>();
  private readonly unitGroups = new Map<string, THREE.Group>();
  private readonly terrainGroups = new Map<string, THREE.Group>();
  private readonly boardRoot = new THREE.Group();

  constructor(private scene: THREE.Scene, private level: LevelDefinition) {
    scene.add(this.boardRoot);
    this.buildTiles();
    this.buildTerrain();
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
    const ids = new Set(units.filter(unit => unit.hp > 0).map(unit => unit.id));
    this.unitGroups.forEach((group, id) => {
      if (!ids.has(id)) {
        UnitBuilder.dispose(group); this.boardRoot.remove(group); this.unitGroups.delete(id);
      }
    });

    units.filter(unit => unit.hp > 0).forEach(unit => {
      let group = this.unitGroups.get(unit.id);
      if (!group) {
        group = UnitBuilder.build(unit);
        const world = GridSystem.gridToWorld(unit.col, unit.row, this.level);
        group.position.set(world.x, 0.08, world.z);
        group.scale.setScalar(0.01);
        this.boardRoot.add(group);
        this.unitGroups.set(unit.id, group);
        gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.36, ease: "back.out(1.8)" });
      } else {
        const world = GridSystem.gridToWorld(unit.col, unit.row, this.level);
        gsap.to(group.position, { x: world.x, z: world.z, duration: 0.38, ease: "power2.out" });
      }
      group.userData = { ...group.userData, grid: true, col: unit.col, row: unit.row, unitId: unit.id, faction: unit.faction, hp: unit.hp };
      const isActive = unit.id === activeUnitId;
      gsap.to(group.scale, { x: isActive ? 1.1 : 1, y: isActive ? 1.1 : 1, z: isActive ? 1.1 : 1, duration: 0.2 });
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const material = child.material;
        if (Array.isArray(material)) return;
        if ("emissiveIntensity" in material && typeof material.emissiveIntensity === "number") {
          // Preserve accent/base punch: bump slightly when selected.
          const base = material.userData?.baseEmissiveIntensity as number | undefined;
          if (base === undefined) material.userData.baseEmissiveIntensity = material.emissiveIntensity;
          const rest = (material.userData.baseEmissiveIntensity as number) ?? 0.14;
          material.emissiveIntensity = isActive ? Math.min(0.85, rest + 0.32) : rest;
        }
      });
      group.renderOrder = unit.faction === playerFaction ? 2 : 1;
    });

    this.terrainGroups.forEach((group, key) => {
      if (group.userData.terrain === "crate") group.visible = !consumedCrates.includes(key);
    });
  }

  setHighlights(cells: Cell[], attacks: Cell[], hover: Cell | null) {
    const moves = new Set(cells.map(c => GridSystem.key(c.col, c.row)));
    const targets = new Set(attacks.map(c => GridSystem.key(c.col, c.row)));
    const hoverKey = hover ? GridSystem.key(hover.col, hover.row) : "";
    this.tiles.forEach((tile, key) => {
      const material = tile.material;
      if (targets.has(key)) { material.emissive.set(0xff334d); material.emissiveIntensity = 0.82; }
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
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
      }
    });
    this.scene.remove(this.boardRoot);
  }
}
