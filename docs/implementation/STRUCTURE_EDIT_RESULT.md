# Ideal_home / DreamHouse 本轮修复结果

日期：2026-10-13。依据 AI 主机当前工作树 `/home/amd/Workspace/Ideal-house`，分支 `CIIE`。代码提交 `56709f55f42c6421f74b4af622b7c90ebb6bf281`；本报告记录修复及验证，不重复技术审计。

## 结果与证据

| 检查 | 结果 | 实际范围 / 证据 |
|---|---|---|
| 本地写入、免密 SSH、远端写入 | PASS | 写入探针及 BatchMode SSH 成功；没有绕过权限 |
| V1/V2、旧响应、恢复绑定 | PASS | 10/10 程序回归；最终 3001 界面生成 V1/V2、切回 V1 后阻止直接进入 Step4，重新确认后保存、立即刷新恢复成功 |
| 24 套目录户型 | PASS | 27/27 目录测试：24 套实际 PNG 识别加载、严格校验、Blueprint 保存读取与几何重编译、SceneGraph 序列化恢复；另含数据端点、非法尺寸和旧目录兼容回归 |
| 结构编辑程序回归 | PASS | 6/6 AI 协议与回滚测试使用模拟模型响应；另 14 个几何场景回归，不能当作真实推理 |
| 真实本地模型协议 | PASS | 当前模型 `Qwen3.8-27B-Q8_0`，`tool_choice: required`，5.706 秒；未重新部署模型 |
| 真实 Qwen 结构编辑 | PASS | 脚本调用 15.865 秒，requestId `f0e851b6-9748-4dbe-897e-3a74f10dcdc2`；模型输出结构操作后，20 项几何检查及实际 Pascal schema 校验通过 |
| 最终部署界面闭环 | PASS | 3001 原始要求“在客餐厅上侧新增独立书房，保留入户通道和全部原有家具”真实执行；2D/3D 展示、保存刷新、版本切换通过；24 套逐一浏览器渲染未执行 |
| 失败不提交 | PASS | 真实 HTTP 二次修改返回 422 / rolled-back / operations=[]，返回 SceneGraph 与输入完全相同；界面失败仍保留 2 个版本，已有书房仍可查看；部分写入异常补偿由程序故障注入验证 |
| 全量 verify 与生产构建 | PASS | `npm run verify && npm run build`；171 个 TS/TSX 文件语法检查无错误，已有 MCP 5、模型回归 15、图片协议 4、预设模型 11 项测试通过 |
| 全局 TypeScript 类型检查 | FAIL（原有问题） | 最终镜像 `tsc --noEmit --incremental false` 仍有 141 条诊断；忽略行列号后与本轮开始时诊断文本完全一致，无新增诊断。生产构建跳过类型检查，不能据此声称类型检查通过 |
| 部署与原修改保持 | PASS | 3000/3001 均 ready；11 个核心运行文件/资源源文件 SHA 与镜像一致；275 个未涉及基线文件字节未变；文本模型、图像模型、MCP 容器未重建 |

程序测试合计：43/43 Node 测试（目录 27、绑定 10、模型协议/回滚 6），另 14 个几何回归场景。模型实际耗时是单次观测，不是性能基准。

日志：`/home/amd/Workspace/Ideal-house/logs/structure-web-build-final-20261013.log`、`/home/amd/Workspace/Ideal-house/logs/structure-typecheck-final-20261013.log`；真实结果位于 `/home/amd/Workspace/Ideal-house/.runtime/structure-edit-20261013/real-structure-edit.json` 和 `http-rollback.json`。Windows 交付目录同时保留测试日志包、结果 JSON 和界面截图。

## 修复内容与代码位置

1. **版本绑定**：以户型 ID、版本 ID、可恢复图片来源共同绑定 SceneGraph，不能用原图 hash 识别 V1/V2。选项变化推进任务序号，旧 SSE、图片、Blob 恢复、效果和 BOM 响应不能覆盖当前状态；仅完成且来源一致的模型可恢复。重复确认同一已完成版本保留手动修改。
   - `/home/amd/Workspace/Ideal-house/lib/ai/model3d-binding.ts:8`、`:21`、`:28`、`:41`。
   - `/home/amd/Workspace/Ideal-house/components/customer/TouchCustomerPortal.tsx:597`（失效）、`:963`（模型任务）、`:1509`（恢复）、`:2599`（确认快照）。

2. **错误窗宽和宿主墙**：按已有墙体真实端点与来源图窗洞投影修正；同步 wallId、parentId、墙 children、中心和 Blueprint 左边缘偏移，没有用默认宽度替换零/负宽。
   - 三居 `window_three01_w8` → `wall_three01_o4`，宽 0.7883663m；`w9` → `o5`，宽 0.8113571m。来源端点分别为 `[92,390]→[92,430]`、`[123,375]→[160,375]`。
   - 一居 `kit-window`、`east-window` 原错误关联垂直 `o05`；原图下侧横墙 `[566,549]→[371,549]` 对应 `o06`，两窗宽均 0.7880621m。元数据保存图像 hash、窗洞端点及尺度依据。这些是现有模型与图像推导尺寸，未作建筑实测。
   - 资源均为单行 JSON：`/home/amd/Workspace/Ideal-house/public/preset/pascal-v2/three/option-01.pascal.json:1`、`/home/amd/Workspace/Ideal-house/public/preset/pascal-v2/one/option-01.pascal.json:1`；同步三居 imported 副本和一居 `one-01` 别名。
   - `/home/amd/Workspace/Ideal-house/lib/floorplans/blueprint.ts:191`、`:214` 严格拒绝非有限、非正及越界开口；`:284` 保留窗高和窗台。`/home/amd/Workspace/Ideal-house/lib/floorplans/pascal-v2/imported-two.ts:31` 校验源几何，`:92` 修正中心到左边缘的转换，避免二居半窗宽偏移。

3. **旧目录兼容**：严格校验另暴露旧 generated 目录 one-option-08、three-option-01 的重复多边形点生成零长墙。仅移除重复点及无门窗引用的零长墙；后续导入在补墙前移除精确重复点，保留真实短边。
   - `/home/amd/Workspace/Ideal-house/lib/floorplans/generated-variant-specs.json`；`/home/amd/Workspace/Ideal-house/lib/ai/qwen-floorplan-import.ts:60`。

4. **最小真实结构闭环**：Step2 发送当前场景和文字 → 预检有限几何候选 → 现有本地 Qwen 输出唯一结构化工具调用 → 校验房间、候选、来源指纹和家具移动 → 复用 `addPartitionWall` / `addDoor` → 分割房间并同步楼板、顶面 → 碰撞、通行和 Pascal schema 校验 → 从同一 SceneGraph 绘制 2D PNG、提交 Pascal 3D。绘图/校验失败不提交，库写入抛错时补偿恢复上一场景。
   - `/home/amd/Workspace/Ideal-house/app/api/ai/structure-edit/route.ts:5`。
   - `/home/amd/Workspace/Ideal-house/lib/ai/structure-edit-agent.ts:9`、`:27`（真实工具协议）、`:67`（实际 Pascal 校验）。
   - `/home/amd/Workspace/Ideal-house/lib/floorplans/structure-edit.ts:152`（兼容性）、`:218`（通路）、`:303`（应用）、`:396` / `:407`（预检/计划）。
   - `/home/amd/Workspace/Ideal-house/lib/floorplans/structure-preview.ts`、`/home/amd/Workspace/Ideal-house/lib/ai/structure-commit.ts:4`。
   - `/home/amd/Workspace/Ideal-house/components/customer/TouchCustomerPortal.tsx:2481`、`:2511`、`:2856`。

## 真实方案及拒绝原因

通过的候选 `one01-study-150x240-move-tv`：位于客餐厅上侧、卫生间南侧，外包 1.50×2.40m（3.60㎡），扣墙后横向净宽约 1.325m；两道全高隔墙和一扇 0.86m 门。原 88 个家具 block 及其 ID、材质、拓扑全部保留；只将电视柜 f010 的 8 个组成块平移 `[-1.17,+3.4]` 米，其他 80 块保持原位。不是“所有家具位置不变”。

20 项检查涵盖简单/凹多边形包含与面积守恒、上侧目标、入户保护带、墙厚/全高、家具旋转包围盒、隔墙碰撞、门两侧与开启范围、60cm 通行、原有门路径和 6→7 个房间连通、出生点、125 个保护节点、材质集合、房间/楼板/顶面同步及 2D/3D 坐标一致。

- 原宽候选及旧电视柜移动方案阻挡厨房/南阳台通道，拒绝。
- 1.18/1.20m 窄候选扣墙后净宽 1.005/1.025m，小于当前最低净宽 1.05m，拒绝。
- 要求家具全部原位时没有安全候选，直接回滚；错误房间、伪造候选/指纹/家具移动、重复结构及不兼容坐标变换均拒绝。
- 二次修改真实 HTTP 失败原因：原客餐厅边界已变化、墙体不再是受支持原始状态、目标书房和墙门节点已存在；返回原 SceneGraph，未生成 V3。

## 未解决问题 / UNKNOWN

- MVP 仅支持**原始 one-option-01 上侧书房**。任意自然语言自由设计、其他 23 套结构修改、修改过墙体的场景及非零建筑/楼层变换：UNKNOWN / 当前明确拒绝。AI 在预检候选中决策，不是自由输出 CAD 坐标。
- “修改卫生间”等反向需求是否被真实模型稳定拒绝、长任务途中真实网络中断/取消、补偿写入本身再次失败：UNKNOWN；已有对应部分程序拒绝或故障注入测试，不能替代实际故障验证。
- 原 I2I 模型作为视觉预览保留，不修改结构版本或真值；本轮未跑新图像生成质量实验。新增书房目前没有自动配书桌、装修材质或摄影级表现。
- Blueprint 重编译只验证房间、墙、门窗局部几何，不能声称重编译保留全部原生家具/材质或世界坐标。会话中完整 SceneGraph 保存恢复与本轮结构编辑才保留原生资产。
- BOM 原有问题未修：`/home/amd/Workspace/Ideal-house/lib/bom/tools.ts:43` / `:73` 只统计 item，忽略 block 家具，`:38` 的基础板与房间板面积可能重复；住宅预算仍有固定新增家具。已标记 bomOutdated，不能声称预算正确。
- 全局类型检查 141 条基线错误未在本轮扩大范围修复。60cm 程序通行检查是展示几何约束，施工尺寸与规范验收未验证。
- 会话现有策略：10 分钟无操作再倒计时 30 秒会清除本次设计并返回主页（Portal1747、session34）；旧记录找回入口未提供。部署后一次返回主页与超过此时间窗口相符，具体触发原因 UNKNOWN；最终同标签页即时刷新恢复已 PASS。
- SSH 和内部网络足够完成本轮；没有启用新代理。`127.0.0.1:17890` 协议及连通性未测试，UNKNOWN。

## 提交与复现边界

代码提交仅纳入本轮增量。原有未提交代码/新文件没有一并提交或覆盖。Portal 与原有修改重叠，为避免混入前一轮内容，其本轮差异以 `/home/amd/Workspace/Ideal-house/patches/20261013-model-binding-structure-ui.patch` 入提交；**该补丁已应用于运行工作树，Portal 本文件仍保留未提交状态**。不要再次盲目应用补丁。

本轮沿用原有未提交的模型来源、持久化、SSE 和预设解析帮助文件。因此，单独 checkout 该提交后的独立构建尚未验证，UNKNOWN；已验证的是保留原有修改的当前工作树与最终部署镜像 `sha256:f052b2eab3a0bdd9dd8b68a7fb666bc05e187001b6b65173c4fd18a8b72c6b0c`。没有推送远端分支。

新增回归入口：`/home/amd/Workspace/Ideal-house/scripts/test-catalog-blueprint-roundtrip.ts`、`test-model3d-binding.ts`、`test-structure-edit-agent.ts`、`test-structure-edit.mjs`；真实推理单独使用 `check-local-tool-compat.ts` / `test-real-structure-edit.ts`，不能把模拟响应测试计作 AI 成功。
