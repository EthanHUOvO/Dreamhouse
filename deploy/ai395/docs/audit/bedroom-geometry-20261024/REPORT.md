# 卫生间方向与二维/三维拆分：修改及真实测试（2026-10-24）

运行目录 `/srv/ideal-home/rocm-migration`，分支 `v2-svg`，基线 `8776118f4c289cfd87a9c15bfce8932d55c9b4be`。Dreamhouse/CIIE 是同步发布副本，旧 `/home/amd/Workspace/Ideal-house` 未改动。原先未提交的 compose.migration.yaml 与 Dockerfile Qwen COPY 行保留，不混入本轮提交。

## 根因和修改

- **卫生间方向限制已修复**：原约束只允许卧室指定方向。主卧卫生间现在支持图上、下、左、右及四角，复用现有两墙一门工具，在指定方向筛选真实可行墙角，不擅自换方向。方向指图片坐标；无可行方案仍拒绝。见 `v2/step3-3d/bathroom-edit-geometry.ts:35`、`v2/step2-edit/floorplan-edit-intent.ts`。
- **Step2/Step3 已拆分**：Step2 仅模型理解需求/选择候选、校验并增量修改 SVG、渲染展示 PNG，不调用 model3d/Pascal，不编译家具场景；删除人为等待。Step3 确认版本后才真实调用 AI 制定 Pascal 构建计划。见 `TouchCustomerPortal.tsx:2266`、`v2/step2-edit/svg-edit-route.ts:76`、`v2/step3-3d/svg-model-plan.ts:19`、`v2/step3-3d/svg-scene.ts:8`。
- **几何稳定性**：新增墙的像素扩张不再改变无关房间归属；复用原图物理墙带支持的中心线，避免 three-01 分割墙段后把入户门 y 从10.9431m偏到10.9628m（地板边缘）。不是放宽边界/碰撞判断。见 `v2/step3-3d/svg-geometry.ts:73`、`v2/step3-3d/svg-geometry.ts:307`。
- **真实 MCP 与直接测试差异**：MCP Schema 会过滤 sourceLabel，原默认家具安全布局因此未触发。现在从独立核验的 SVG 重取房间信息，不信任客户端附加标签。只搜索初始默认家具的安全摆放，已保存家具不自动移动。见 `v2/step3-3d/session-store.ts:206`、`v2/step3-3d/blueprint.ts:127`。
- **失败回滚**：三维中间事件不更新当前 SVG 场景；最终必须通过真实 AI 记录/哈希、原家具保留、门高度、碰撞、入口和原门可达性、保存校验，再绑定 V1/V2。网络失败、碰撞、无 AI 记录、替代场景回滚旧场景/绑定，旧响应丢弃。二维草稿可保留重试，不冒充已完成三维；每次 MCP 使用独立 session。见 `TouchCustomerPortal.tsx:1027`、`TouchCustomerPortal.tsx:2248`。

## 真实模型角色

响应模型别名 **Ours**，使用现有 Qwen 客户端/Gufo，未部署新模型。具体权重、参数量及是否为用户称呼的 Qwen3.8 Flash：**UNKNOWN**。Step3 真实推理负责 Pascal 完整构建清单；精确坐标以确认 SVG 为准，模型不能另猜坐标。即 AI 规划 + SVG 几何 + Pascal 构建，不是语言模型从零输出任意网格，也不是预制场景冒充本次 AI。已保存场景恢复可用缓存，新建/重建才推理。图像模型不作为结构真值。

## 九套新增卧室：真实 AI + HTTP + Pascal

统一请求：在客餐厅合适的墙角新增矩形卧室，方向不限，保留入户通道和厨卫位置。对实际 HTTP 返回的 SceneGraph 独立检查，没有用重新编译结果替代真实输出。响应 ID、usage、候选、SVG、实际场景见 `evidence/live/`；独立结果见 `evidence/live-split-validation.json`。

| 源编号 | 结果 | 方向 | Step2秒 | Step3 AI部分秒 | 证据结论 |
|---|---|---|---:|---:|---|
| one-01 | PASS | upper | 12.54 | 3.38 | 实际场景一致性、门/家具通行、保存恢复通过 |
| one-02 | SAFE_REJECT | — | 2.44 | 0.00 | 客餐厅总面积不足新增卧室6㎡ + 保留客餐厅7㎡。 |
| one-07 | PASS | lower | 9.40 | 2.50 | 实际场景一致性、门/家具通行、保存恢复通过 |
| two-01 | PASS | upper | 6.58 | 3.95 | 实际场景一致性、门/家具通行、保存恢复通过 |
| two-02 | SAFE_REJECT | — | 6.36 | 0.00 | 候选被门前通行或净尺寸检查拒绝；不能据此认定所有建筑设计均不可行。 |
| two-07 | SAFE_REJECT | — | 2.37 | 0.00 | 当前搜索器未找到满足既有开口保护的连续支撑墙角；不等同于面积不足。 |
| three-01 | PASS | lower | 9.72 | 4.44 | 实际场景一致性、门/家具通行、保存恢复通过 |
| three-03 | PASS | left | 7.43 | 4.96 | 实际场景一致性、门/家具通行、保存恢复通过 |
| three-07 | PASS | upper | 8.06 | 4.02 | 实际场景一致性、门/家具通行、保存恢复通过 |

源编号01/02/07等是内部ID；页面1/2/3编号未更改。SAFE_REJECT表示原图未动且未生成三维。搜索上限不代表建筑上不可能。九套原图加载/保存恢复通过，原SVG逐字节未改（original-svg-hashes.json）。卧室最小6㎡、净宽2m、剩余客厅7㎡、通道0.9m及碰撞检查保留。

## 卫生间八方向：真实测试

是在下表相应户型上覆盖八种方向，**不是每套户型八方向都能安装**。

| 请求方向 | 户型 | 实际墙角 | 最终结果 | Step2秒 | Step3 AI部分秒 |
|---|---|---|---|---:|---:|
| 上侧 | two-01 | upper-left | PASS | 5.36 | 5.95 |
| 下侧 | two-01 | lower-right | PASS | 6.12 | 5.90 |
| 左侧 | two-01 | upper-left | PASS | 6.33 | 5.85 |
| 右侧 | two-01 | lower-right | PASS | 5.81 | 5.07 |
| 左上角 | two-01 | upper-left | PASS | 5.99 | 5.90 |
| 右上角 | two-02 | upper-right | PASS | 5.64 | 5.57 |
| 左下角 | one-07 | lower-left | PASS | 6.41 | 4.70 |
| 右下角 | two-01 | lower-right | PASS | 6.24 | 5.90 |

Step2计时包含意图推理、候选搜索/选择/校验；Step3列仅模型规划，不含MCP及浏览器。没有受控冷热缓存比较，不能保证固定延迟。二维不再负担提前三维构建；三维现在需要独立等待。

## 程序/浏览器验证

- 冻结镜像 11 组程序测试退出码均0，无网络、无业务源码覆盖挂载；见 evidence/SUMMARY.json。包括八方向、实体漏失/伪造/重复、入户中心线、MCP Schema、V1/V2、家具保留、失败回滚、旧响应。
- 候选枚举的安全拒绝不能算改造成功，历史仅上侧用例也不代表当前四向能力；逐套结果以真实AI表为准。
- Next生产构建PASS；全量TypeScript仍有141项历史诊断，本轮新增0项，不能称类型检查全部通过。见type-delta.json。Pascal import.meta既有警告保留。
- 浏览器：two-01主卧左上角V1和右下角V2，二维预览后分别调用三维，保存及刷新恢复通过；独立测试origin，不覆盖用户原页面存档。见bathroom-svg-only.png、bathroom-v2-restored.png；最终冻结镜像又完成右下角生成/保存/刷新（bathroom-final-restored.png）。
- 生产部署证据见evidence/deployment.json；只更新Web和Pascal MCP，原模型/其他服务与环境不变。镜像及业务源码哈希见frozen-images.json、frozen.json。

## 限制 / UNKNOWN

卫生间仍是墙角矩形概念隔间；任意方向可表达，但任意精确位置、面积/尺寸尚未开放。排水、通风、采光、承重与施工合规UNKNOWN。部分原场景已有门通行异常会单列警告，不能算新增改造通过项。原SVG无家具；首次默认摆放和保留已保存家具是两条路径，后者冲突时失败回滚，需Step3人工调整。Step4装修图像质量、无关设备接口本轮未测，UNKNOWN。

部署后 3002 再次真实调用模型完成 two-01 主卧右下角卫生间：PASS；实际返回场景的 SVG 一致性、家具/门通行及保存恢复复核通过。证据见 `evidence/production-validation.json` 与 `evidence/production/`。
