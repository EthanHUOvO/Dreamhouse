# 自然语言新增卧室：实现与实测记录

日期：2026-10-23。实际项目 `/srv/ideal-home/rocm-migration`，分支 `v2-svg`，修改基线 `f965f3037be544b68c3229ec33154e5c4f95b7c9`。依据当前代码与实际服务；没有重新部署模型。原有 `Dockerfile.web.rocm` 和 `compose.migration.yaml` 未提交内容保留。

## 本轮结果

**one-option-01 的首次自然语言结构改造已通过真实 AI、Pascal、独立几何检查和浏览器测试。其余 8 套没有通过同项改造，均安全拒绝；不能称为九套改造全部成功。**

输入：“在客餐厅上侧新增一个卧室，保留入户通道和厨房、卫生间的位置”。现有文本服务返回模型别名 `Ours`，实际执行两次推理，记录有 response ID、usage 和耗时；本轮没有独立核验模型权重名称，因此不能据此证明具体参数规模或“Qwen3.8-flash”命名。

HTTP 首次成功耗时 **7.611 秒**，这是意图解析、候选选择及 SVG 校验时间，不含之后 PNG、MCP 或浏览器加载。真实输出选择 `bedroom-tph47z-9g12mi`：新增卧室约 **6.0667㎡**，剩余客餐厅 **11.2882㎡**，净短边 **2.0401m**，通道筛选宽度 **0.9m**，门宽 **0.8m**。面积是解析中心线多边形面积，不是净使用面积或规范认证。

## 实际调用链

1. Step2 文字 → `/api/ai/svg-edit` → 现有 `qwenChatCompletion`，模型调用 `parse_floorplan_intent`，返回真实房间 ID、动作、位置、保护范围和未处理要求。
2. 现有 SVG 解析及墙门渲染 → 新卧室分隔候选；程序检查凹形房间、边界、面积、原门窗与厨卫、入户通道。模型第二次调用 `select_floorplan_candidate` 选择真实候选 ID；不允许模型任意提交坐标或忽略额外要求。
3. 同一修改 SVG → `/api/ai/svg-render` 的二维 PNG；同一 SVG → `/api/ai/model3d/stream`，实际调用 `begin_floorplan_scene`、`set_floor_structure`、`set_openings`、`populate_basic_furniture`、`validate_scene`、`commit_scene`。
4. 浏览器在私有候选上完成 SceneGraph/Blueprint、来源、家具碰撞及真实漫游路径校验；全部成功后才追加版本及 `sceneSnapshot`。失败、取消或过期响应不发布中间墙体，也不清除原方案。
5. 确认版本使用该版本已经验证的 SceneGraph。已提交需求与未执行草稿分别保存，图片缓存 blob 地址解析回稳定版本身份。手动保存同时更新对应版本快照。

这是**真实 AI 理解和选择 + 确定性几何执行 + Pascal 建模**。没有用预制新卧室快照代替推理，也没有把生图成功当作结构成功；现有 I2I 保留视觉预览职责。

## 测试结果

| 户型原始 ID | 真实 AI 卧室改造 | 原始加载/保存恢复 | 证据与原因 |
|---|---|---|---|
| one-option-01 | PASS | PASS | 两次真实推理，六个实际 MCP 工具成功；独立复核实际返回 SceneGraph |
| one-option-02 | 未通过，安全拒绝 | PASS | 当前候选尺寸不足；AI 5.167 秒 |
| one-option-07 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 3.685 秒 |
| two-option-01 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 3.373 秒 |
| two-option-02 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 3.708 秒 |
| two-option-07 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 3.675 秒 |
| three-option-01 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 3.708 秒 |
| three-option-03 | 未通过，安全拒绝 | PASS | 当前算法未找到支持的上侧角落；AI 4.064 秒 |
| three-option-07 | 未通过，安全拒绝 | PASS | 生成候选面积守恒检查不通过；AI 10.032 秒 |

其余八套都真实完成意图解析，再由几何层返回 `422 EDIT_NO_FEASIBLE_BEDROOM`，没有进入 MCP，也没有提交修改。**当前生成器搜索范围有限，这不证明这些户型在建筑上绝对无解。** 页面中的 1/2/3 是重新编号；上表保留文件原始 ID。

其他证据：

- 纯程序：九套原始加载/恢复 PASS；one01 三个侧门候选均通过 SVG→MCP→2D/3D 对应、门高、家具碰撞、入户可达、V1/V2 保存恢复；18.09 秒，退出码 0。另覆盖伪造候选、错误位置、取消保护、不可满足面积、门在地板下、未知家具尺寸、底部门被沙发阻断等负向用例。
- 真实 AI 语义：否定新增（2.820 秒）、家具复合要求（4.072 秒）、至少 1000㎡（4.554 秒）均拒绝；同义改写成功（8.063 秒，两次推理）。四项符合预期。同义改写仅做 AI+SVG，没有重复 MCP。
- 独立复核真实输出：直接使用 HTTP 返回的 SVG 和 SceneGraph，**没有以程序候选重建后冒充原结果**；7 房间、23 墙、7 门、3 窗对应一致，门均在地板上；独立家具/路径检查 PASS。该复核脚本本身不调用 AI。
- 浏览器：输入自然语言、生成、确认 Step3、保存、刷新、进入 Step4 PASS。故意提交不可满足要求后 V1 保留且刷新恢复 PASS。另真实生成最小 6.5㎡要求的 V2（实际选择约 6.90㎡），V1/V2 二维面积、三维快照切换及 V2 刷新通过。
- 程序保存测试：缓存 blob 别名仍匹配原版本，错误 V2 被拒；保存失败不更新快照；V1 手动家具保存后切 V2 再回 V1，恢复保存位置。受控状态/网络测试不冒充真实 AI 或真实浏览器家具拖动。
- 既有相关回归：绑定 10/10、内联图片持久化 4/4、保存/截屏/异步清理 handler 7 组 PASS；意图与路由控制桩 22/22 PASS。
- 最终镜像 `90f75275e2ff`：家具保留 15/15、Portal 事务 12 组、既有编辑保存 handler 7 组 PASS；与真实 HTTP 实验镜像相比，六个结构生成后端模块 SHA 完全一致。最终浏览器重新完成首次 AI 改造，并通过按钮手动移动床、保存和刷新；精确家具坐标的保留由独立程序测试断言。

## 发现并修复的原因

- 旧入口只支持固定操作：改为模型结构化意图解析，保留严格动作白名单与主机几何校验。支持语义改写，不代表能执行任意改造。
- 底部门候选虽然几何闭合，却被默认沙发阻断：删除该类候选，并对实际三维家具及漫游碰撞执行检查；不靠移动家具通过。
- 模型把默认面积或“采光未验证”当成用户额外硬要求：区分宿主筛选规则、用户要求与展示局限；显式要求采光窗仍拒绝，没有过滤 `unmetRequirements` 来制造成功。
- 刷新后的缓存图片地址变化误触发解绑：以同一版本的稳定来源比较；不是放行所有 blob 地址。
- 手动保存只存当前场景、未更新对应版本快照：保存成功后仅更新绑定完全匹配的版本；存储失败保持不变。
- 继续改造可能覆盖手调家具：仅从严格同源、已保存的修改基准继承家具，完整复制资产、材质和变换；不从其他版本取家具。手动墙门与 SVG 尚未同步时拒绝，避免覆盖。合并后的碰撞/通行检查失败则回滚。

## 代码入口

以下均相对项目根目录，具体实现见当前提交：

| 文件 | 重点位置 |
|---|---|
| `v2/step2-edit/floorplan-edit-intent.ts` | `intentSystemPrompt`、`validateFloorplanIntent`：完整意图与严格约束 |
| `v2/step2-edit/svg-edit-route.ts:24` | 两次真实推理、候选白名单、错误回滚与 provenance |
| `v2/step3-3d/svg-edit-geometry.ts:45` | 复用墙门 SVG 渲染，不重建一套编辑工具 |
| `v2/step3-3d/bedroom-edit-geometry.ts:144` | 执行后重新解析校验；`:175` 候选生成入口 |
| `v2/step3-3d/bedroom-scene-validation.ts:32` | 实际家具尺寸、门地板高度、入户漫游路径 |
| `v2/step3-3d/bedroom-source-furniture.ts` | 严格同源家具保留、手动结构差异拒绝 |
| `TouchCustomerPortal.tsx` | `:662` 草稿；`:764` 稳定版本身份；`:1223` 手动保存；`:2241` 私有候选与三维检查；`:2271` 生成事务；`:2852` 确认绑定 |
| `tests/bedroom-edit/` | 程序、真实返回值复核、事务与家具回归；控制桩均明确标注无 AI |

## 保留的限制与下一步

1. **优先扩展几何候选能力**，再重跑其余八套。当前是上侧、单卧室、矩形分隔的最小实现；不支持任意位置、多房间、精确长宽或新增外窗。八套拒绝主要是工程求解范围问题，不能归结为模型理解失败。
2. 新卧室没有新开外窗。采光、通风、承重及施工合规 **UNKNOWN/未验证**；页面明确展示。不应作为施工图。
3. 原 SVG 外墙字节不变，但解析器在新隔墙 T 接点产生局部外轮廓栅格差：最大约 **0.0342868m**，面积差约 **0.00317478㎡**。位置/幅度独立受限并记录，非客厅房间多边形逐点不变；不能宣称派生外轮廓每个点完全相等。
4. 本轮首次生成测试检查新增隔墙/新门/新卧室与家具及通行，不等于整屋家具布局都经过完整质量验收。另发现既有默认厨房家具 footprint 越出房间；同源家具保留的严格检查会拒绝该布局，需 Step3 手动修正。没有删除或缩放家具掩盖问题。
5. 已有手动墙门修改若未写回源 SVG，本轮拒绝继续 SVG 改造；完整 SceneGraph→SVG 回写属于后续任务。原始版跨多个版本切换的独立家具历史尚未扩展；本轮新增版本的保存快照已处理。
6. 本轮没有运行高成本 I2I 装修生成；Step4 实测到可进入及视角入口，**装修成图效果 UNKNOWN**。
7. 构建通过；全量 TypeScript 原有 141 个诊断仍未清理，不能称为全项目类型检查通过。最终新增诊断对照见证据。

## 复现与证据

`evidence/one-01.json`：真实 AI provenance 和实际 MCP 工具；其他八套与 `intent-cases.json`：真实请求结果。`programmatic.json`、`live-result-validation.json`、`refresh-review/`、`snapshot-save-review/`、`source-furniture.json`：分别对应独立程序验证。截图记录页面二维结果、三维恢复及失败回滚。

构建使用 `Dockerfile.bedroom`，依赖服务器已有 `ideal-home-local:web-edit-save-20261022`，只构建 Web。使用 `compose.migration.yaml` 加 `compose.bedroom.yaml` 启动 Web，不改模型/MCP 服务。部署状态与最终镜像见 `evidence/deployment.json`。

```sh
node tests/bedroom-edit/intent-unit.cjs
python tests/bedroom-edit/run.py
python tests/bedroom-edit/run-live.py
docker compose -f compose.migration.yaml -f compose.bedroom.yaml up -d --no-deps web
```

`run.py` 为隔离、断网程序测试；`run-live.py` 复核已保存真实输出，不自行调用模型。真实 HTTP 实验请求、结果保存在本报告证据目录与 `/tmp/natural-bedroom-20261023/evidence/live-final/`。

最终提交前统一了五个源文件的 CRLF/LF 行尾，并逐文件验证除行尾外字节一致；运行镜像仍为已验证的 `90f75275e2ff`。因此早期证据中的原始源码 SHA 按其测试时文件保留，不应直接当成提交后的字节 SHA；代码逻辑没有再改。`git diff --check` 通过。
