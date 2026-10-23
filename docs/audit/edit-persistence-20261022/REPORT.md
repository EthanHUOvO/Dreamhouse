# 3D 手动编辑保存与 Step4 渲染修复记录

日期：2026-10-22。实际项目：`/srv/ideal-home/rocm-migration`，分支 `v2-svg`；修复前 HEAD `5828b99`。服务端口 3002。不是旧 CIIE 工作区。

## 已确认的问题与修改

| 问题及证据 | 修复位置（项目绝对路径） |
| --- | --- |
| **已验证**：实时 MCP 场景的 Blueprint ID 是 `mcp-任务ID`，`saveVariantDesign` 要求目录户型 ID。原页面点击保存仍显示“尚未保存”，且 Step3 不显示该错误。 | `/srv/ideal-home/rocm-migration/v2/step3-3d/blueprint.ts:463`：精确核对 variant、图片版本、canonical URL 后转换保存身份，继续执行原严格几何校验；`/srv/ideal-home/rocm-migration/TouchCustomerPortal.tsx:1209` 保存，`:3102` 展示错误。 |
| **已验证**：首次选中墙体时工具栏展开，SVG 屏幕坐标变化；拖动使用变化后的坐标系，把微小手势变成错误位移。修复前同一 1px 拖动提示“卫生间超出住宅边界”，修复后得到约 0.05m 合法平移。 | `/srv/ideal-home/rocm-migration/app-src/components/shared/PascalViewer.tsx:127`：一次手势固定其初始逆变换矩阵；结束/取消清理；消除 pointerdown 和 click 对多选的重复切换。 |
| **已验证（程序）**：门增删、墙连同门窗删除后，`expected` 数量未更新，严格保存/重编译失败。 | `/srv/ideal-home/rocm-migration/app-src/lib/floorplans/door-edit.ts:249`、`:275`，`/srv/ideal-home/rocm-migration/app-src/lib/floorplans/wall-edit.ts:335`：按实际操作增减计数，不重置无关计数错误。 |
| **已验证**：旧照片可被选作新场景渲染输入，原错误只显示在页面下方；未保存草稿原来也会被会话 effect 自动写入。 | `/srv/ideal-home/rocm-migration/TouchCustomerPortal.tsx:1170` 拍摄前核对 session/revision 并保存草稿；`:1793` 草稿不覆盖已提交会话；`:917`、`:3287` 拒绝旧场景照片并显示重新拍摄提示。 |
| **已验证（模拟竞态）**：异步渲染必须按请求归属更新状态，不能接受取消后的旧响应或留下 `rendering` 状态。无法确认用户此前每次卡住是否均由此触发，原始具体请求原因 **UNKNOWN**。 | `/srv/ideal-home/rocm-migration/TouchCustomerPortal.tsx:2469`：检查 abort/controller/场景归属；finally 只清理所属请求，恢复非终态照片；保留实际失败原因及实际使用的风格。 |

没有放宽校验，没有重新部署模型，没有修改原户型资产。

## 实际测试

- **PASS，纯程序**：当前九套 SVG 户型（一居 01/02/07、二居 01/02/07、三居 01/03/07），每套连续执行家具移动旋转、合法移门、合法移墙；保存 Blueprint、重新编译并逐字段比较墙/房间/门/窗/家具；会话 JSON 打包解包后完整场景一致。还覆盖门删除与重新添加、墙连同门窗删除的数量更新。测试使用与页面相同的 Layout 新增问题检查。
- **PASS，纯程序**：每套三个错绑身份、无效开口、预先损坏的计数均被拒绝，共 45 个负向断言。旧 ID 直接保存的拒绝亦在九套上复现。
- **PASS，模拟传输/状态**：从真实 Portal/PascalViewer 源码提取实际处理函数执行七组断言：旧照片不发请求、超时清 busy、场景更换清 rendering、取消旧请求不覆盖新结果、存储失败保留草稿、拍摄保存及版本检查、SVG 布局变化不放大拖动。不是模型推理。
- **PASS，已有回归**：`test-model3d-binding.ts`、`test-interior-persistence.ts`、`test-inline-image-persistence.ts`、`test-interior-render.ts`、`tests/svg-adapter/regression.ts`。均在最终镜像测试。
- **PASS，真实浏览器**：one-option-01 家具右移保存、门铰链修改保存、墙平移约 0.05m 保存 → 漫游拍摄客餐厅 → 退出 → Step4 → 真实 I2I 完成 → 刷新仍恢复照片与结果。旧照片会明确提示重新拍摄且禁止生成。
- **PASS，真实 AI**：一次新请求，`Qwen-Image-2.1`，`pytorch-rocm`，4 步；11774ms，cacheHit=false、fallback=false，像素变化检查通过。模型输入/推理为 512×288，输出恢复到 1920×1080；浏览器确认前后均为该尺寸。请求标识及结果在 `real-i2i.json`。本轮没有调用 Qwen 做新的结构推理。
- **PASS**：生产构建、`git diff --check`。保留原项目构建警告及跳过类型检查的配置。

## 未解决或未验证

- **存在问题，修复前后相同**：全量 TypeScript 检查均有 141 条诊断；新增诊断 0。不能标为类型检查通过。
- **存在问题，修复前后相同**：旧目录 `test-door-blueprint.mjs` 在 one-option-02 缺口约 16.5% 失败；`test-wall-edit.mjs` 在旧编译 fixture 房间顶点越界处失败。已在原镜像重现，不把这两个旧测试标 PASS，也没有放宽校验。
- **UNKNOWN**：全部风格和复杂连续操作的主观装修质量、多浏览器/多设备同步。本轮真实浏览器端到端覆盖一套，九套几何保存由程序批量验证。512×288 推理恢复大图不等同原生 1080p 细节；生成图片仍是视觉预览，SceneGraph 才是结构真值。

## 部署与继续运行

运行镜像 `ideal-home-local:web-edit-save-20261022`（本轮最终构建 ID 前缀 `4f43dce80555`），只重建 web 容器。原 `compose.migration.yaml`、Dockerfile 原有本地修改均保留；Dockerfile 本轮仅新增两条编辑工具 COPY。

复用当前配置启动（工作目录 `/srv/ideal-home/rocm-migration`）：

```sh
docker compose -f compose.migration.yaml -f compose.edit-persistence.yaml up -d --no-deps web
```

使用原有 `unless-stopped` 重启策略；未更改 AI/MCP 服务。旧镜像 `ideal-home-local:web-textv43-20261022` 保留，可用镜像覆盖回退。

新增回归脚本：`/srv/ideal-home/rocm-migration/tests/edit-persistence/regression.ts`、`/srv/ideal-home/rocm-migration/tests/edit-persistence/portal-handlers.ts`。在最终镜像的独立容器里运行，`/workspace` 挂载当前项目，`/evidence` 挂载测试输出目录，`PASCAL_SCENE_DIR` 指向容器临时目录。所有批测日志在本轮证据目录；模拟超时日志是预期断言，不是生产请求失败。
