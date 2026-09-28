/**
 * Procedural SVG sprites for every unit (pure strings, no DOM / three deps).
 * Humans are told apart by headgear + armband + uniform colour, not just weapons:
 *   平民 flat cap + grey work clothes + bat        护卫 riot helmet w/ visor + white armband + shotgun
 *   射手 wide-brim boonie + scope armband + long rifle   士兵 combat helmet + rank stripes + rifle
 *   特警 beret w/ badge + star armband + SMG       战车 armoured vehicle
 * Zombies use hunched / asymmetric / blob silhouettes.
 */
import type { UnitKey } from "../config/units.config";

const shadow = `<ellipse cx="64" cy="118" rx="34" ry="8" fill="rgba(0,0,0,.45)"/>`;
const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${shadow}${inner}</svg>`;
const OUT = `stroke="#0b0f0c" stroke-width="3" stroke-linejoin="round"`;

interface HumanLook { uniform: string; pants: string; armband: string; armMark?: string; hat: string; weapon: string; skin?: string }
const human = (l: HumanLook) => wrap(`
  <g ${OUT}>
    <rect x="47" y="88" width="13" height="26" rx="3" fill="${l.pants}"/>
    <rect x="68" y="88" width="13" height="26" rx="3" fill="${l.pants}"/>
    <rect x="40" y="52" width="48" height="42" rx="9" fill="${l.uniform}"/>
    <rect x="31" y="55" width="13" height="30" rx="5" fill="${l.uniform}"/>
    <rect x="84" y="55" width="13" height="30" rx="5" fill="${l.uniform}"/>
    <rect x="31" y="62" width="13" height="9" fill="${l.armband}"/>
    <circle cx="64" cy="38" r="17" fill="${l.skin ?? "#f1c8a0"}"/>
  </g>
  <circle cx="58" cy="39" r="2.4" fill="#1b1b1b"/><circle cx="70" cy="39" r="2.4" fill="#1b1b1b"/>
  ${l.armMark ?? ""}
  ${l.weapon}
  ${l.hat}`);

interface ZombieLook { body: string; skin: string; extra: string; eye?: string }
const zombie = (l: ZombieLook) => wrap(`
  <g ${OUT}>
    <rect x="46" y="90" width="14" height="24" rx="3" fill="#2b3320" transform="rotate(-9 53 102)"/>
    <rect x="68" y="90" width="14" height="24" rx="3" fill="#2b3320" transform="rotate(11 75 102)"/>
    <path d="M40 56 Q64 44 88 60 L84 96 Q64 104 44 94 Z" fill="${l.body}"/>
    <path d="M40 60 L20 72 L24 80 L44 70 Z" fill="${l.skin}"/>
    <path d="M86 62 L106 70 L102 78 L84 72 Z" fill="${l.skin}"/>
    <circle cx="62" cy="40" r="17" fill="${l.skin}"/>
  </g>
  <circle cx="55" cy="38" r="3.4" fill="${l.eye ?? "#ff3b3b"}"/><circle cx="68" cy="40" r="2.4" fill="${l.eye ?? "#ff3b3b"}"/>
  <path d="M54 48 L58 51 L62 48 L66 51 L70 48" stroke="#1a1a12" stroke-width="2" fill="none"/>
  ${l.extra}`);

export const UNIT_SVG: Record<UnitKey, () => string> = {
  civilian: () => human({
    uniform: "#8a8f86", pants: "#4a4f56", armband: "#ffd36b",
    hat: `<path d="M45 30 Q64 16 83 30 L90 33 L45 33 Z" fill="#6b4f35" ${OUT}/>`,
    weapon: `<rect x="93" y="40" width="7" height="44" rx="3" fill="#c79a5a" ${OUT} transform="rotate(18 96 62)"/>`,
  }),
  guard: () => human({
    uniform: "#2c5d7c", pants: "#1d2b36", armband: "#f8fafc",
    armMark: `<path d="M34 66 H41 M37.5 63 V70" stroke="#d61f2c" stroke-width="2.4"/>`,
    hat: `<path d="M44 38 Q44 16 64 16 Q84 16 84 38 Z" fill="#1c2c38" ${OUT}/><rect x="47" y="31" width="34" height="8" rx="2" fill="#8fdcff" opacity=".85" ${OUT}/>`,
    weapon: `<rect x="92" y="46" width="9" height="42" rx="2" fill="#6d7780" ${OUT}/><rect x="90" y="70" width="13" height="7" fill="#8a5a2c" ${OUT}/>`,
  }),
  marksman: () => human({
    uniform: "#4d6b3c", pants: "#2f3b26", armband: "#ffe08a",
    armMark: `<circle cx="37.5" cy="66.5" r="3" fill="none" stroke="#1a2a10" stroke-width="1.8"/>`,
    hat: `<ellipse cx="64" cy="27" rx="27" ry="6" fill="#6f7d4a" ${OUT}/><path d="M50 27 Q52 14 64 14 Q76 14 78 27 Z" fill="#7e8c55" ${OUT}/>`,
    weapon: `<rect x="95" y="24" width="6" height="68" rx="2" fill="#262c30" ${OUT}/><rect x="92" y="38" width="12" height="7" rx="3" fill="#ffe08a" ${OUT}/>`,
  }),
  soldier: () => human({
    uniform: "#3f7a4e", pants: "#2a3a2c", armband: "#a7d66d",
    armMark: `<path d="M33 64 L37.5 67 L42 64 M33 68 L37.5 71 L42 68" stroke="#12301a" stroke-width="1.8" fill="none"/>`,
    hat: `<path d="M43 34 Q43 14 64 14 Q85 14 85 34 L88 36 L40 36 Z" fill="#2d4f33" ${OUT}/><rect x="56" y="20" width="16" height="5" fill="#5f8a55"/>`,
    weapon: `<rect x="93" y="40" width="7" height="52" rx="2" fill="#2a3238" ${OUT}/><rect x="90" y="58" width="13" height="8" fill="#4a5560" ${OUT}/>`,
  }),
  specialist: () => human({
    uniform: "#15222b", pants: "#0d151b", armband: "#facc15",
    armMark: `<path d="M37.5 62.5 L39 66 L42.6 66 L39.8 68.2 L40.8 71.6 L37.5 69.6 L34.2 71.6 L35.2 68.2 L32.4 66 L36 66 Z" fill="#15222b"/>`,
    hat: `<ellipse cx="60" cy="24" rx="22" ry="9" fill="#0e7490" ${OUT}/><circle cx="73" cy="23" r="4.5" fill="#facc15" ${OUT}/>`,
    weapon: `<rect x="92" y="52" width="10" height="30" rx="2" fill="#1a2830" ${OUT}/><rect x="95" y="80" width="5" height="10" fill="#1a2830" ${OUT}/>
      <rect x="46" y="60" width="36" height="6" fill="#facc15" opacity=".9"/><text x="64" y="84" text-anchor="middle" font-size="11" font-weight="900" fill="#facc15" font-family="sans-serif">SWAT</text>`,
  }),
  vehicle: () => wrap(`
    <g ${OUT}>
      <rect x="10" y="68" width="108" height="30" rx="8" fill="#26343c"/>
      <rect x="22" y="46" width="80" height="32" rx="6" fill="#47758c"/>
      <rect x="44" y="30" width="40" height="22" rx="5" fill="#35596b"/>
      <rect x="80" y="36" width="42" height="9" rx="3" fill="#ffb547"/>
      <circle cx="30" cy="98" r="11" fill="#15191c"/><circle cx="64" cy="98" r="11" fill="#15191c"/><circle cx="98" cy="98" r="11" fill="#15191c"/>
    </g>
    <rect x="28" y="54" width="16" height="10" rx="2" fill="#8fdcff" opacity=".8"/>
    <rect x="52" y="58" width="44" height="6" fill="#ffffff" opacity=".85"/><path d="M62 56 V66 M58 61 H66" stroke="#d61f2c" stroke-width="3"/>`),
  crawler: () => wrap(`
    <g ${OUT}>
      <ellipse cx="60" cy="84" rx="38" ry="16" fill="#7fb82c"/>
      <path d="M28 88 L14 104 M44 94 L38 110 M78 94 L86 110 M92 88 L108 102" stroke-width="7" stroke="#2b3320"/>
      <circle cx="96" cy="74" r="15" fill="#a6c877"/>
    </g>
    <circle cx="100" cy="71" r="3.2" fill="#ff3b3b"/><circle cx="92" cy="73" r="2.4" fill="#ff3b3b"/>
    <path d="M30 76 Q46 66 62 76" stroke="#dfff77" stroke-width="3" fill="none"/>`),
  walker: () => zombie({
    body: "#5f7f45", skin: "#9bbb6a",
    extra: `<rect x="50" y="64" width="26" height="6" fill="#7a3b2a" opacity=".85"/><circle cx="46" cy="56" r="8" fill="#b9e255" opacity=".8"/>`,
  }),
  smoker: () => zombie({
    body: "#6c4f8c", skin: "#a7b4a0", eye: "#c3ff4b",
    extra: `<circle cx="84" cy="30" r="10" fill="#b7f34b" opacity=".45"/><circle cx="98" cy="20" r="7" fill="#b7f34b" opacity=".35"/><circle cx="108" cy="12" r="5" fill="#b7f34b" opacity=".25"/>`,
  }),
  boomer: () => wrap(`
    <g ${OUT}>
      <circle cx="64" cy="76" r="38" fill="#9cc92a"/>
      <circle cx="64" cy="34" r="15" fill="#b8cf86"/>
    </g>
    <circle cx="46" cy="66" r="9" fill="#fff04e" stroke="#0b0f0c" stroke-width="2"/>
    <circle cx="82" cy="84" r="11" fill="#fff04e" stroke="#0b0f0c" stroke-width="2"/>
    <circle cx="72" cy="56" r="6" fill="#fff04e" stroke="#0b0f0c" stroke-width="2"/>
    <circle cx="58" cy="32" r="2.6" fill="#ff3b3b"/><circle cx="70" cy="32" r="2.6" fill="#ff3b3b"/>`),
  stalker: () => wrap(`
    <g ${OUT}>
      <path d="M30 104 L44 70 L64 54 L86 70 L100 104 L84 96 L64 106 L44 96 Z" fill="#3e2356"/>
      <path d="M44 72 L12 60 L40 82 Z" fill="#f15b78"/>
      <path d="M86 72 L118 60 L90 82 Z" fill="#f15b78"/>
      <path d="M50 52 L64 22 L78 52 Z" fill="#5d347d"/>
    </g>
    <path d="M56 42 L62 45 M72 42 L66 45" stroke="#ff3b6b" stroke-width="3.5"/>`),
  abomination: () => wrap(`
    <g ${OUT}>
      <rect x="18" y="44" width="92" height="66" rx="14" fill="#526b38" transform="rotate(-4 64 78)"/>
      <rect x="10" y="40" width="34" height="52" rx="10" fill="#3b4d28"/>
      <circle cx="80" cy="34" r="17" fill="#8fa06c"/>
      <path d="M100 72 Q124 66 114 96 L106 92 Q112 76 98 80 Z" fill="#b8c7ce"/>
    </g>
    <path d="M40 60 L48 66 L40 72 M60 86 L68 92 L60 98" stroke="#e8d0c0" stroke-width="2.5" fill="none"/>
    <circle cx="76" cy="32" r="3" fill="#ff3b3b"/><circle cx="86" cy="34" r="2.4" fill="#ff3b3b"/>`),
  mother: () => wrap(`
    <g ${OUT}>
      <circle cx="64" cy="80" r="32" fill="#ba3057"/>
      <polygon points="32,74 10,92 36,88" fill="#ff8e66"/><polygon points="96,74 118,92 92,88" fill="#ff8e66"/>
      <polygon points="44,104 30,122 52,112" fill="#ff8e66"/><polygon points="84,104 98,122 76,112" fill="#ff8e66"/>
      <circle cx="64" cy="44" r="19" fill="#d98a8a"/>
      <polygon points="64,4 74,32 54,32" fill="#ff8e66"/>
    </g>
    <circle cx="57" cy="44" r="3.4" fill="#ffe14b"/><circle cx="71" cy="44" r="3.4" fill="#ffe14b"/>`),
};

export const unitSvg = (key: UnitKey) => UNIT_SVG[key]().replace(/\s+\n\s*/g, " ").trim();
export const unitSvgDataUrl = (key: UnitKey) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(unitSvg(key))}`;
