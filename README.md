# Dreamhouse Pascal-native v2

这版已经不再用 `public/index.html` 手写 Three.js 房子。
中间区域是真正的 Pascal Editor，住宅 Scene Graph 直接包含：

- 承重外墙 / 非承重隔墙
- 入户门、内部房门
- 外窗、卫生间高窗
- Pascal Wall CSG 门窗开洞
- Slab
- Room Zone + semantic_type
- Pascal 内置 GLB 家具资产
- 生命周期方案：单人 / 两人 / 育儿 / 育儿+保姆 / 清空非承重墙
- Render / Semantic / Structure / 透视 / 正交控制
- STL / OBJ / GLB 导出
- Simulation / Printer / Robot 视频接口面板

## 1. 本地运行

要求 Node.js 22.13+（建议 22.16）。

```bash
npm install
npm run typecheck
npm run dev
```

打开 `http://localhost:3000`。

## 2. 直接部署到 GitHub Pages

把本项目内容覆盖到你的 `Dreamhouse` 仓库根目录，然后：

```bash
git add .
git commit -m "upgrade to Pascal-native Dreamhouse"
git push
```

`.github/workflows/deploy-pages.yml` 会：

1. 安装 npm 依赖
2. TypeScript 检查
3. 真正执行 `next build`
4. 部署 `out/`

这与旧版本“只复制 public/”完全不同。

仓库名为 `Dreamhouse` 时，GitHub Actions 会自动使用 `/Dreamhouse` basePath。

## 3. Vercel 部署

也可以把仓库导入 Vercel，保持默认设置直接部署。Vercel 环境没有 GitHub Pages basePath。

## 4. 数据保存

为了让 GitHub Pages 也能直接运行，本版场景与版本保存在浏览器 localStorage：

- `dreamhouse.v2.current`
- `dreamhouse.v2.versions`

适合展厅单机和演示。

以后如果做多人系统，再替换成数据库即可。

## 5. 大模型

当前不需要大模型。左侧是确定性生命周期 Planner。

真正需要自由自然语言时，建议在独立后端加入：

```text
User Text
  → LLM Planner
  → Restricted RenovationPlan
  → Constraint Guard
  → Pascal Scene Patch
```

不要把 API Key 放进 GitHub Pages 前端。

## 6. 门窗为什么这次是真实的

`lib/house-scene.ts` 中 Door / Window 是 Pascal 原生节点：

```text
Wall
 ├─ Door
 └─ Window
```

Door/Window 的 `parentId` 和 `wallId` 都指向真实墙体，`position` 使用 wall-local 坐标。
Pascal WallSystem 会根据这些 opening 节点自动进行 CSG 切洞。

## 7. 关键文件

- `lib/house-scene.ts`：完整初始住宅，门窗和家具
- `lib/scene-utils.ts`：生命周期重构
- `components/PascalWorkspace.tsx`：真正嵌入 Pascal Editor
- `components/DesignControls.tsx`：Render / Semantic / Structure
- `components/FabricationPanel.tsx`：下游制造与视频展示
- `.github/workflows/deploy-pages.yml`：真实 Next 静态构建部署

## 8. 当前已知限制

- 家具来自 Pascal 内置 CDN，首次加载需要网络。
- GitHub Pages 为纯静态托管，不能安全保存大模型 API Key，也不能提供服务器侧设备网关。
- Pascal 原生 STL 是全场景导出。正式 3D 打印建议继续开发 Manufacturing Export Plugin，将 Floor / Walls / Furniture 分开并做 mesh repair / slicing。
