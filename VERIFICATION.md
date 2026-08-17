# Verification — Pascal Direct Furniture v3

验证日期：2026-08-17

## 本轮目标

- 保留 Pascal Viewer 真实 3D 住宅模型，不替换渲染器。
- 正常状态不允许拖动家具，也不显示家具控制器。
- 点击“调整家具”进入编辑模式。
- 编辑模式中点击具体家具，控制盘贴近家具出现；3D 背景保持清晰。
- 支持 ↑ / ↓ / ← / → 微移、左转 / 右转，以及直接按住家具拖动。
- 点击“完成调整”退出编辑模式，控制盘消失并恢复相机浏览。

## 已通过的本地检查

### 1. 项目结构与交互结构

执行：

```bash
node scripts/check-project.mjs
```

结果：

```text
Dual portal structure: OK
Pascal direct furniture click/drag/rotate controls: OK
```

检查内容包括：双门户、固定方案、Pascal Viewer、`item:click`、`item:pointerdown`、Scene Registry、拖动事件、方向键、旋转键、无旧模糊 Modal、v3 localStorage key、卫生间淋浴位置。

### 2. TS / TSX 语法解析

执行：

```bash
node scripts/check-syntax.mjs
```

结果：

```text
TS/TSX syntax: PASS (22 files, 0 errors)
```

### 3. 家具移动 / 旋转 / 拖动落点逻辑

执行：

```bash
node scripts/test-furniture-edit.mjs
```

结果：

```text
Furniture edit logic: PASS
Bed nudge: X -4.15 -> -4.00; Y locked at 0.00
Bed rotation: -90° -> -75°
Drag clamp result: X -2.08, Z 4.22
Bathroom shower: X -1.15, Z 3.78
```

这验证了：

- 每次右移 0.15 m；
- 家具高度 Y 不变化；
- 每次旋转 15°；
- 拖动落点会被限制在所属房间范围内；
- 原始 Scene 不会被纯函数意外原地修改；
- 基础卫生间淋浴仍保持在既定左下角位置。

### 4. 拖动期间的稳定性处理

拖动过程中不再每次 `pointermove` 都触发 React 控制盘位置状态更新，避免宿主组件重复重渲染影响 Pascal 中正在拖动的 Object3D。释放指针后才提交 Scene，并由 Pascal 重新同步最终位置。

移动端编辑模式下同时将 Canvas `touch-action` 设为 `none`，退出编辑模式后恢复，避免触摸拖家具时页面本身跟着滚动。

## Pascal API 对照

实现使用 Pascal 公共的 Event Bus 接收节点交互事件，并通过 Scene Registry 获取对应 Three.js Object3D；这些都是 Pascal 官方架构公开的宿主集成机制。

## 当前环境限制

本执行环境没有项目 `node_modules`，并且从 npm registry 重新安装依赖持续超时，因此这里无法重新完成 `next build` 的最终依赖级构建测试。

因此本轮可确认的是：项目结构检查通过、22 个 TS/TSX 文件语法解析通过、家具移动/旋转/边界纯逻辑测试通过，并已按 Pascal 官方公开的 Event Bus / Scene Registry 架构实现直接交互；完整依赖安装后的 `next build` 仍应在你的本地环境或 GitHub Actions 中执行一次。

部署前建议运行：

```bash
npm install --no-audit --no-fund
npm run verify
npm run build
```
