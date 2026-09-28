# 命运防线 · Line of Fate（v0.6.0-demo）

纯前端 Three.js 棋盘 + **SVG→canvas 广告牌单位** 的双阵营轻量网页战棋：部署卡牌、按速度交错行动、补给生产、争夺中央据点。

DEMO 要点：平民大幅削弱；新增 3 费「猎尸神射手」；护卫 / 士兵 / 特警加强；格点选中（大单位不再挡邻格点击）；行动序列条 + 补给阶段面板。

本仓库为游戏干净源码（不含 `node_modules` 与编译产物）。更完整的目录导读见 [`原始碼閱讀指南.md`](./原始碼閱讀指南.md)；产品说明见 [`docs/《命运防线》产品需求文档.md`](./docs/《命运防线》产品需求文档.md)。

## 技术栈

- TypeScript + React 19
- Next.js 16（经 vinext：Vite + Cloudflare Workers 本地运行）
- Three.js 场景 + SVG 广告牌精灵（`src/render/unitSvg.ts` · `public/art/svg/`）
- Tailwind CSS 4（界面样式主要在 `app/globals.css`）
- 包管理：pnpm

## 快速开始

需要 **Node.js 22+**。

```bash
corepack enable
pnpm install
pnpm dev
```

若没有 `corepack`，可先：

```bash
npm install -g pnpm
pnpm install
pnpm dev
```

终端会打印本机地址，用浏览器打开即可游玩。

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 本地开发（热更新） |
| `pnpm build` | 正式构建 |
| `pnpm lint` | ESLint 检查 |
| `pnpm start` | 以 Wrangler 本地预览已构建产物 |

## 源码入口

- `app/page.tsx` → `src/GameApp.tsx`：游戏主流程
- `src/config/`：兵种与关卡数据
- `src/core/`：规则、战斗、回合、资源、存档
- `src/ai/`：敌方决策
- `src/render/`：Three.js 渲染
- `src/ui/`、`src/audio/`：HUD 与 Web Audio 音效

游戏为纯前端；进度保存在浏览器 `localStorage`，无外部 3D/音频资源文件。
