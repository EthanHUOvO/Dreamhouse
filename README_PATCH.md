# Dreamhouse GitHub Pages 3D Patch v2

这个补丁专门修复当前 `https://ethanhuovo.github.io/Dreamhouse/` 的两个问题：

1. 原页面不是 3D，只是 CSS `perspective + rotateX` 的二维 DIV。
2. 原“生成改造方案”只改一段文字和颜色，不改变真实空间几何。

## 本补丁实现

- Three.js WebGL 实体墙体、实体地面与房间语义区域。
- 阴影、灯光、ACES tone mapping、雾效、OrbitControls。
- 自动旋转与改造后的相机聚焦动画。
- “电竞房 → 衣帽间”语义变化。
- “两人生活”：衣帽间 + 双人书房。
- “育儿”：儿童房 + 卫生间真实几何拆成主卫/公卫 + 新增隔墙。
- “育儿 + 保姆”：儿童房 + 保姆房 + 主卫/公卫。
- “拆除非承重隔墙”：保留四面承重外墙，移除内部隔墙。
- Design / Fabrication 页面切换。
- 下游仿真、打印机、机械臂视频面板占位。

## 使用方法

将补丁里的：

- `public/index.html`
- `.github/workflows/deploy-pages.yml`

复制覆盖到你的 `Dreamhouse` 仓库对应位置，然后 push 到 `main`。

GitHub Actions 会自动重新发布 Pages。

## 重要：这仍然是 GitHub Pages 可运行的 3D 演示，不是 Pascal 本体

当前仓库中的真正 Pascal 工程在：

- `components/PascalWorkspace.tsx`
- `@pascal-app/editor`
- Next.js app

但你当前的 Pages Workflow **完全没有 build Next.js**，只复制 `public/`，所以线上不可能出现真正 Pascal。

如果要上线真正 Pascal：

### 方案 A（推荐）
把 Next.js 应用部署到 Vercel / Node Server。  
GitHub Pages 只保留宣传/展示首页。

### 方案 B
把整个应用改成纯客户端静态构建：
- 去掉 `/api/*` POST Route Handler
- Scene / Version 放 localStorage / IndexedDB
- Planner 纯客户端运行
- `next.config.mjs` 使用 `output: "export"`
- GitHub Action 运行 `npm install && npm run build`
- 发布 `out/`

如果还要接 LLM、打印机、机器人真实接口，推荐方案 A，因为这些都需要后端网关。
