import * as THREE from "three";

/**
 * Shared procedural textures + material factories for stylized (toon-ish) units.
 * Textures are app-lifetime shared; materials are created per call so emissive /
 * active feedback can be mutated without cross-unit bleed.
 */

const texCache = new Map<string, THREE.Texture>();

function canvasTexture(
  key: string,
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
  options?: { repeat?: number },
) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const repeat = options?.repeat ?? 1;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

/** 4-step cel ramp for MeshToonMaterial (RGBA so DataTexture format matches). */
function toonGradient(): THREE.DataTexture {
  const key = "toon-gradient";
  const hit = texCache.get(key);
  if (hit) return hit as THREE.DataTexture;
  const data = new Uint8Array([
    90, 90, 90, 255,
    140, 140, 140, 255,
    200, 200, 200, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

function paintNoise(ctx: CanvasRenderingContext2D, size: number, base: string, speck: string, density: number) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < density; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 2.4;
    ctx.fillStyle = speck;
    ctx.globalAlpha = 0.18 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function armorMap() {
  return canvasTexture("armor-v1", 64, (ctx, size) => {
    ctx.fillStyle = "#c8d0d8";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#6a7580";
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        ctx.strokeRect(x + 1, y + 1, 14, 14);
        ctx.fillStyle = (x + y) % 32 === 0 ? "#dde4ea" : "#b4bec8";
        ctx.fillRect(x + 3, y + 3, 10, 10);
      }
    }
    ctx.fillStyle = "#8a949e";
    for (let y = 8; y < size; y += 16) {
      for (let x = 8; x < size; x += 16) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, { repeat: 2 });
}

function clothMap() {
  return canvasTexture("cloth-v1", 64, (ctx, size) => {
    ctx.fillStyle = "#d0d8e0";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#9aa6b0";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { repeat: 2 });
}

function fleshMap() {
  return canvasTexture("flesh-v1", 64, (ctx, size) => {
    paintNoise(ctx, size, "#a8b86a", "#5a6e32", 220);
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 18; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 4 + Math.random() * 10;
      const h = 2 + Math.random() * 5;
      ctx.fillStyle = Math.random() > 0.5 ? "#6d3a3a" : "#4e6a28";
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { repeat: 1.5 });
}

function metalMap() {
  return canvasTexture("metal-v1", 64, (ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, "#e8ecef");
    g.addColorStop(0.5, "#9aa4ae");
    g.addColorStop(1, "#d5dbe0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#6f7a84";
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 8) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 12, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { repeat: 2 });
}

function groundMap() {
  return canvasTexture("ground-v1", 64, (ctx, size) => {
    paintNoise(ctx, size, "#8a8574", "#5c5848", 280);
    ctx.strokeStyle = "#4a463a";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.globalAlpha = 1;
  }, { repeat: 1 });
}

function humanSkinMap() {
  return canvasTexture("skin-human-v1", 32, (ctx, size) => {
    paintNoise(ctx, size, "#ffc89b", "#e8a878", 60);
  });
}

export class MaterialLibrary {
  static get gradientMap() {
    return toonGradient();
  }

  static get textures() {
    return {
      armor: armorMap(),
      cloth: clothMap(),
      flesh: fleshMap(),
      metal: metalMap(),
      ground: groundMap(),
      humanSkin: humanSkinMap(),
    };
  }

  static toon(
    color: THREE.ColorRepresentation,
    opts: {
      emissive?: THREE.ColorRepresentation;
      emissiveIntensity?: number;
      map?: THREE.Texture | null;
    } = {},
  ) {
    return new THREE.MeshToonMaterial({
      color,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0.14,
      gradientMap: this.gradientMap,
      map: opts.map ?? null,
    });
  }

  static body(color: THREE.ColorRepresentation, faction: "human" | "zombie") {
    const map = faction === "human" ? this.textures.cloth : this.textures.flesh;
    return this.toon(color, {
      map,
      emissive: faction === "zombie" ? 0x1a2e08 : 0x061018,
      emissiveIntensity: faction === "zombie" ? 0.12 : 0.08,
    });
  }

  static armor(color: THREE.ColorRepresentation) {
    return this.toon(color, { map: this.textures.armor, emissiveIntensity: 0.1 });
  }

  static skin(faction: "human" | "zombie") {
    if (faction === "human") {
      return this.toon(0xffc89b, { map: this.textures.humanSkin, emissiveIntensity: 0.05 });
    }
    return this.toon(0x90a95d, {
      map: this.textures.flesh,
      emissive: 0x2a3a10,
      emissiveIntensity: 0.18,
    });
  }

  static accent(color: THREE.ColorRepresentation) {
    return this.toon(color, { emissive: color, emissiveIntensity: 0.28 });
  }

  static dark(faction: "human" | "zombie") {
    return this.toon(faction === "human" ? 0x172b3a : 0x263516, {
      map: this.textures.metal,
      emissiveIntensity: 0.06,
    });
  }

  static metal(color: THREE.ColorRepresentation = 0x8a949e) {
    return this.toon(color, { map: this.textures.metal, emissiveIntensity: 0.08 });
  }

  static base(faction: "human" | "zombie") {
    const color = faction === "human" ? 0x1f9ef6 : 0x87c928;
    return this.toon(color, { emissive: color, emissiveIntensity: 0.55 });
  }

  static tile(color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshLambertMaterial({
      color,
      map: this.textures.ground,
      emissive,
      emissiveIntensity,
    });
  }

  static foundation() {
    return new THREE.MeshLambertMaterial({ color: 0x1a1e1a, map: this.textures.ground });
  }
}
