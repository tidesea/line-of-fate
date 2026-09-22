import * as THREE from "three";
import { UNIT_DEFS } from "../config/units.config";
import type { UnitState } from "../core/types";
import { MaterialLibrary as Mat } from "./MaterialLibrary";

const addMesh = (
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

/** Soft dark under-silhouette so units read against busy tiles without a full outline pass. */
const addSilhouettePad = (group: THREE.Group, radius: number) => {
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: 0x050806, transparent: true, opacity: 0.38, depthTest: false }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  pad.renderOrder = -1;
  group.add(pad);
  return pad;
};

export class UnitBuilder {
  static build(unit: UnitState) {
    const def = UNIT_DEFS[unit.key];
    const group = new THREE.Group();
    group.name = `unit-${unit.id}`;
    group.userData = { unitId: unit.id, grid: true, col: unit.col, row: unit.row, faction: unit.faction };

    const primary = unit.faction === "human" ? Mat.armor(def.color) : Mat.body(def.color, "zombie");
    const accent = Mat.accent(def.accent);
    const dark = Mat.dark(unit.faction);
    const skin = Mat.skin(unit.faction);
    const cloth = Mat.body(def.color, unit.faction);

    if (unit.key === "vehicle") {
      addMesh(group, new THREE.BoxGeometry(1.55, 0.28, 0.78), dark, [0, 0.25, 0]);
      addMesh(group, new THREE.BoxGeometry(1.18, 0.42, 0.66), primary, [0, 0.56, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.28, 0.34, 0.24, 8), primary, [0.24, 0.88, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 0.92, 8), accent, [0.72, 0.9, 0], [0, 0, Math.PI / 2]);
      [-0.48, 0, 0.48].forEach(x => {
        addMesh(group, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10), Mat.metal(0x1a1e22), [x, 0.18, 0.43], [Math.PI / 2, 0, 0]);
        addMesh(group, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10), Mat.metal(0x1a1e22), [x, 0.18, -0.43], [Math.PI / 2, 0, 0]);
      });
      addSilhouettePad(group, 0.85);
    } else if (unit.key === "abomination") {
      addMesh(group, new THREE.BoxGeometry(1.18, 1.18, 1.02), primary, [0, 0.73, 0], [0.06, 0, -0.04]);
      addMesh(group, new THREE.BoxGeometry(0.64, 0.92, 0.72), dark, [-0.35, 1.18, 0]);
      addMesh(group, new THREE.SphereGeometry(0.36, 8, 7), skin, [0.22, 1.55, 0]);
      addMesh(group, new THREE.TorusGeometry(0.34, 0.075, 6, 12, Math.PI * 1.2), accent, [0.72, 0.63, 0], [0, Math.PI / 2, 0]);
      [-0.33, 0.33].forEach(z => addMesh(group, new THREE.BoxGeometry(0.18, 0.08, 0.5), dark, [0.52, 0.93, z]));
      addSilhouettePad(group, 0.9);
    } else if (unit.key === "boomer") {
      addMesh(group, new THREE.SphereGeometry(0.58, 10, 8), primary, [0, 0.62, 0]);
      [[0.36, 0.88, 0.25], [-0.4, 0.62, 0.32], [0.2, 0.36, -0.44], [-0.2, 1.02, -0.32]].forEach(p =>
        addMesh(group, new THREE.DodecahedronGeometry(0.14), accent, p as [number, number, number]));
      addMesh(group, new THREE.SphereGeometry(0.24, 8, 7), skin, [0, 1.18, 0]);
      addSilhouettePad(group, 0.55);
    } else if (unit.key === "crawler") {
      addMesh(group, new THREE.BoxGeometry(0.55, 0.24, 0.7), primary, [0, 0.24, 0]);
      addMesh(group, new THREE.SphereGeometry(0.26, 8, 7), skin, [0.28, 0.34, 0]);
      [-0.28, 0.28].forEach(x => [-0.34, 0.34].forEach(z =>
        addMesh(group, new THREE.BoxGeometry(0.12, 0.12, 0.48), dark, [x, 0.13, z], [0, 0, x > 0 ? 0.25 : -0.25])));
      addSilhouettePad(group, 0.48);
    } else if (unit.key === "mother") {
      addMesh(group, new THREE.SphereGeometry(0.48, 10, 8), primary, [0, 0.72, 0]);
      addMesh(group, new THREE.SphereGeometry(0.32, 8, 7), skin, [0, 1.25, 0]);
      addMesh(group, new THREE.ConeGeometry(0.26, 0.7, 7), accent, [0, 1.63, 0]);
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        addMesh(group, new THREE.ConeGeometry(0.09, 0.64, 6), accent, [Math.cos(angle) * 0.4, 0.45, Math.sin(angle) * 0.4], [Math.PI / 2, 0, angle]);
      }
      addSilhouettePad(group, 0.55);
    } else {
      const zombie = unit.faction === "zombie";
      const armored = ["guard", "soldier", "specialist"].includes(unit.key);
      const bodyMat = armored ? primary : cloth;
      const bodyGeometry = unit.key === "civilian" || unit.key === "walker"
        ? new THREE.CapsuleGeometry(0.28, 0.42, 4, 8)
        : new THREE.BoxGeometry(0.58, 0.72, 0.44);
      addMesh(group, bodyGeometry, bodyMat, [0, 0.62, 0], zombie ? [0.08, 0, -0.06] : undefined);
      // Slightly larger heads for readable silhouettes (teen stylized, not chibi).
      addMesh(group, new THREE.SphereGeometry(0.27, 10, 8), skin, [0, 1.18, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.095, 0.095, 0.68, 7), dark, [-0.2, 0.18, 0]);
      addMesh(group, new THREE.CylinderGeometry(0.095, 0.095, 0.68, 7), dark, [0.2, 0.18, 0]);

      if (["guard", "soldier", "smoker", "specialist"].includes(unit.key)) {
        addMesh(group, new THREE.BoxGeometry(0.18, 0.15, 0.82), accent, [unit.faction === "human" ? 0.35 : -0.35, 0.78, 0], [0, Math.PI / 2, 0]);
      }
      if (unit.key === "civilian") addMesh(group, new THREE.CylinderGeometry(0.045, 0.075, 0.82, 6), accent, [0.36, 0.76, 0], [0, 0, -0.72]);
      if (unit.key === "soldier") addMesh(group, new THREE.SphereGeometry(0.29, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), dark, [0, 1.28, 0]);
      if (unit.key === "specialist") addMesh(group, new THREE.BoxGeometry(0.52, 0.26, 0.5), accent, [-0.18, 0.88, 0]);
      if (unit.key === "stalker") {
        addMesh(group, new THREE.ConeGeometry(0.12, 0.55, 5), accent, [0.35, 0.72, 0], [0, 0, -1.1]);
        addMesh(group, new THREE.ConeGeometry(0.12, 0.55, 5), accent, [-0.35, 0.72, 0], [0, 0, 1.1]);
      }
      if (unit.key === "walker" || unit.key === "smoker") {
        // Asymmetric shoulder lump for zombie silhouette contrast.
        addMesh(group, new THREE.SphereGeometry(0.14, 6, 5), Mat.body(def.accent, "zombie"), [zombie ? -0.28 : 0.28, 0.92, 0.08]);
      }
      addSilhouettePad(group, 0.48);
    }

    const baseRadius = def.size[0] > 1 ? 0.72 : 0.44;
    const base = addMesh(group, new THREE.CylinderGeometry(baseRadius, baseRadius, 0.09, 18), Mat.base(unit.faction), [0, 0.045, 0]);
    base.receiveShadow = true;
    // Outer faction ring for at-a-glance team readability.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(baseRadius + 0.06, 0.025, 6, 24),
      Mat.accent(unit.faction === "human" ? 0x7ad4ff : 0xb8f04a),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    ring.castShadow = false;
    group.add(ring);

    if (unit.faction === "zombie") group.rotation.y = Math.PI;
    return group;
  }

  static dispose(group: THREE.Group) {
    group.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      // Per-instance materials only — shared textures live in MaterialLibrary cache.
      materials.forEach(material => material.dispose());
    });
  }
}
