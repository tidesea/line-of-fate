import * as THREE from "three";
import { UNIT_DEFS } from "../config/units.config";
import type { UnitKey } from "../config/units.config";
import type { UnitState } from "../core/types";
import { unitSvgDataUrl } from "./unitSvg";

/**
 * v0.6 DEMO: units are camera-facing billboards (THREE.Sprite) textured from
 * procedural SVG → canvas. Sprites are never raycast — picking is cell-based
 * (see SceneManager), so big units can't steal clicks from neighbours.
 */

const textureCache = new Map<string, THREE.CanvasTexture>();
const TEX = 256;

export const unitTexture = (key: UnitKey, flip = false) => {
  const cacheKey = `${key}:${flip ? "L" : "R"}`;
  const hit = textureCache.get(cacheKey);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = TEX; canvas.height = TEX;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(cacheKey, tex);
  if (ctx) {
    // Placeholder glyph until the SVG decodes (usually < 1 frame).
    const def = UNIT_DEFS[key];
    ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(TEX / 2, TEX / 2, TEX * 0.3, 0, Math.PI * 2); ctx.fill();
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, TEX, TEX);
      ctx.save();
      if (flip) { ctx.translate(TEX, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, 0, TEX, TEX);
      ctx.restore();
      tex.needsUpdate = true;
    };
    img.src = unitSvgDataUrl(key);
  }
  tex.needsUpdate = true;
  return tex;
};

export const SPRITE_SCALE: Partial<Record<UnitKey, number>> = { abomination: 2.1, vehicle: 1.9, mother: 1.7, boomer: 1.55, crawler: 1.35 };

export class UnitBuilder {
  static build(unit: UnitState) {
    const def = UNIT_DEFS[unit.key];
    const group = new THREE.Group();
    group.name = `unit-${unit.id}`;
    group.userData = { unitId: unit.id, col: unit.col, row: unit.row, faction: unit.faction };

    // Faction ground disc + rim (reads well from the iso camera).
    const factionColor = unit.faction === "human" ? 0x3aa8ff : 0x9bd833;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 28),
      new THREE.MeshBasicMaterial({ color: unit.faction === "human" ? 0x0f2a3d : 0x1e2c10, transparent: true, opacity: 0.85 }),
    );
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; disc.name = "disc";
    group.add(disc);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.43, 32),
      new THREE.MeshBasicMaterial({ color: factionColor, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    );
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.016; rim.name = "rim";
    group.add(rim);

    const scale = SPRITE_SCALE[unit.key] ?? 1.45;
    const material = new THREE.SpriteMaterial({ map: unitTexture(unit.key, unit.faction === "zombie"), transparent: true, depthWrite: false, alphaTest: 0.05 });
    const sprite = new THREE.Sprite(material);
    sprite.name = "sprite";
    sprite.center.set(0.5, 0.06); // feet on the tile
    // Humans face right (toward zombies); zombie textures are pre-mirrored to face left.
    sprite.scale.set(scale, scale, 1);
    sprite.position.y = 0.02;
    sprite.renderOrder = 10;
    group.add(sprite);
    group.userData.baseScale = scale;
    group.userData.cost = def.cost;
    return group;
  }

  static sprite(group: THREE.Group) {
    return group.getObjectByName("sprite") as THREE.Sprite | undefined;
  }

  static dispose(group: THREE.Group) {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m.dispose());
      } else if (child instanceof THREE.Sprite) {
        child.material.dispose(); // texture is shared/cached
      }
    });
  }
}
