# Verification — Pascal Walkthrough + Interactive Doors v6

验证日期：2026-08-18

## 已实际执行并通过

在项目目录运行：

```bash
npm run verify
```

结果：

```text
Dual portal structure: OK
Pascal design -> save -> submit -> downstream workflow: OK
Pascal first-person walkthrough + interactive doors integration: OK
TS/TSX syntax: PASS (23 files, 0 errors)

Furniture edit logic: PASS
Bed nudge: X -4.15 -> -4.00; Y locked at 0.00
Bed rotation: -90° -> -75°
Drag clamp result: X -2.08, Z 4.22
Bathroom shower: X -1.15, Z 3.78

Continuous design workflow: PASS
Approved V2 -> Draft V3 -> Submitted -> Accepted -> Production
BOM regenerated from approved Scene: walls=10, furniture=22

Iterative redesign workflow: PASS
Approved V2 -> Draft V3 -> Submit -> Withdraw -> Resubmit -> Accept -> Draft V4
Approved versions remain protected until contractor acceptance.

Pascal walkthrough integration: PASS
Spawn: X 5.15, Y 0.00, Z 0.60
Interactive door-ready nodes: 5
Controls wired: WASD/mouse via Pascal FirstPersonControls, pointer lock lifecycle, native door targeting/toggle path.
```

## v6 漫游检查内容

1. `spawn_walkthrough` 存在，类型为 Pascal `spawn`；
2. 出生点固定在入户门内侧 `[5.15, 0, 0.60]`；
3. 出生点属于 `level_ground`，并绑定住宅地板；
4. 基础场景 5 个门均为真实 `door` 节点；
5. 5 个门均为 `hinged`，初始 `swingAngle = 0`；
6. `PascalViewer` 使用 `FirstPersonControls`；
7. 漫游时 `wallMode = up`；
8. 漫游时 Viewer 切换到默认交互选择路径并提高到 60 FPS；
9. Pointer Lock 进入 / 退出生命周期已接入；
10. 家具编辑与第一人称漫游互斥；
11. 设计页和验收页均可进入漫游；
12. 原有家具移动、旋转、拖拽、版本迭代和 BOM 同步回归测试通过。

## 完整 Next 构建说明

本执行环境没有预装项目 `node_modules`。实际执行了：

```bash
npm install --no-audit --no-fund
```

npm 在访问 `registry.npmjs.org/@pascal-app/core` 时出现 `EAI_AGAIN`，120 秒后超时，因此无法在当前容器重新下载 Pascal / Next 依赖。

随后 `npm run build` 无法执行的直接原因是本地没有 `next` 可执行文件，而不是已经出现了一个 Next / TypeScript 编译报错。

因此本文件只把**实际通过**的项目结构、TS/TSX 语法、业务逻辑和 walkthrough 集成测试记为 PASS；不虚构“fresh next build 已通过”。

GitHub Actions 仍按以下顺序部署：

```text
npm install
→ npm run verify
→ npm run build
→ 只有 build 成功才发布 GitHub Pages
```

如果真实依赖环境存在 API 版本或构建问题，Actions 会停止在部署前。
