# modify_manual — 全部提示词与 LLM / 生图改动点

> 自动提取自运行中的镜像 `ideal-home-local:web-ruler-20261017`，文本**逐字未改写**。
> 每条的完整原文见 `prompts/` 目录，源文件副本见 `reference/`。

## 一、提示词总表

| # | 步骤 | 文件:行 | 变量 | 字数 | 作用 | 能否直接改 |
|---|------|---------|------|------|------|-----------|
| 01 | step1-2 | `app/api/ai/floorplan-analyze/route.ts`:7 | `FLOOR_PLAN_ANALYSIS_PROMPT` | 258 | 户型图分析（读图→观察→2~4条修改建议） | ❌ 需先加 COPY |
| 02 | step2 | `lib/ai/image-service.ts`:32 | `BASE_FLOOR_PLAN_EDIT_PROMPT` | 220 | 户型图编辑总提示词（含 {modificationRequest} 注入点） | ✅ 已可改（在 COPY 列表中） |
| 03 | step2 | `lib/ai/image-service.ts`:85 | `roomType` | 686 | 户型图编辑总提示词（含 {modificationRequest} 注入点） | ✅ 已可改（在 COPY 列表中） |
| 04 | step3 | `lib/ai/local-model3d-agent.ts`:109 | `messages` | 343 | 几何识别 → Pascal 3D（墙/房间/门窗/坐标/单位） | ✅ 已可改（在 COPY 列表中） |
| 05 | step3 | `lib/ai/local-model3d-agent.ts`:121 | `openings` | 334 | 几何识别 → Pascal 3D（墙/房间/门窗/坐标/单位） | ✅ 已可改（在 COPY 列表中） |
| 06 | step4 | `config/interiorStyles.ts`:1 | `BASE_EDIT_PROMPT` | 919 | 室内效果图编辑基础指令 + 布局优化指令 | ❌ 需先加 COPY |
| 07 | step4 | `config/interiorStyles.ts`:9 | `LAYOUT_OPTIMIZATION_PROMPT` | 490 | 室内效果图编辑基础指令 + 布局优化指令 | ❌ 需先加 COPY |
| 08 | step4 | `config/interiorStyles.ts`:11 | `FINAL_RESULT_CONSTRAINT` | 284 | 室内效果图编辑基础指令 + 布局优化指令 | ❌ 需先加 COPY |
| 09 | step4-5 | `lib/ai/qwen-provider.ts`:17 | `payload` | 287 | 快速方案助手 + BOM 材料工艺助手 | ❌ 需先加 COPY |
| 10 | step4-5 | `lib/ai/qwen-provider.ts`:41 | `payload` | 294 | 快速方案助手 + BOM 材料工艺助手 | ❌ 需先加 COPY |
| 11 | step5 | `lib/bom/residential-prompt.ts`:1 | `RESIDENTIAL_RENOVATION_PROMPT` | 328 | 住宅装修清单整理提示词 | ❌ 需先加 COPY |
| 12 | step4 | `lib/ai/qwen-layout-agent.ts`:23 | `system` | 757 | 自由布局 Agent（工具调用式重构） | ❌ 需先加 COPY |
| 13 | step4 | `lib/ai/qwen-layout-agent.ts`:56 | `goal` | 169 | 自由布局 Agent（工具调用式重构） | ❌ 需先加 COPY |
| 14 | step4 | `lib/ai/structure-edit-agent.ts`:42 | `body` | 316 | 结构编辑 Agent（受限 MVP） | ❌ 需先加 COPY |
| 15 | step1 | `lib/ai/qwen-floorplan-import.ts`:194 | `system` | 603 | 户型导入解析提示词 | ❌ 需先加 COPY |
| 16 | step4 | `config/roomTypes.ts`:4 | `ROOM_TYPE_PROMPTS` | 全表 | 房间功能约束表（必须/禁止出现什么，含 negative 词表） | ❌ 需先加 COPY |

## 二、⚠️ 最关键的一件事：只有 Dockerfile COPY 过的文件才生效

镜像里的代码是构建时 COPY 进去的。当前 `Dockerfile.web.rocm` 只 COPY 了 9 个文件：

```
status-route.ts                     → /app/app/api/ai/status/route.ts
local-model3d-agent.ts              → /app/lib/ai/local-model3d-agent.ts   ← step3 提示词
server-image.ts                     → /app/lib/ai/server-image.ts          ← 标注尺/预处理
image-service.ts                    → /app/lib/ai/image-service.ts         ← step2 提示词
TouchCustomerPortal.tsx             → /app/components/customer/TouchCustomerPortal.tsx
blueprint.ts                        → /app/lib/floorplans/blueprint.ts
types.ts                            → /app/lib/floorplans/types.ts
partition-solver.ts                 → /app/lib/floorplans/partition-solver.ts
session-store.ts                    → /app/services/pascal-mcp/session-store.ts
```

**所以目前只有 step2、step3 的提示词能从宿主机改。**
上表里标 ❌ 的 10 处（step1 分析、step4 室内、step5 清单、布局 Agent 等）**现在改了不生效**——
必须先 `cp` 到 `/srv/ideal-home/rocm-migration/` 并在 Dockerfile 里加一行 `COPY`，再重建镜像。

## 三、改动生效的三种路径

| 改动类型 | 做法 | 耗时 |
|---|---|---|
| 已在 COPY 列表的文件（step2/step3 提示词、图像处理） | 改宿主机文件 → `docker build` → `up -d` | ~3-5 min |
| 不在列表的文件（step1/4/5 提示词） | 先加到 `rocm-migration/` + Dockerfile 加 `COPY`，再走上一行 | ~5 min |
| 纯参数（模型、尺寸、步数、超时） | 改 `compose.migration.yaml` → `up -d` | ~1 min，**不用重建** |

## 四、生图相关（非提示词）改动点

| 文件 | 作用 | 现状 |
|---|---|---|
| `lib/ai/qwen-image-client.ts` | 生图请求结构：`{mode, model, prompt, images[], size, negativePrompt, seed, steps}` | **无 mask 通道**，纯指令式编辑 |
| `lib/ai/server-image.ts` | 送图前缩放/补白 + 回收后还原；**已加标注尺保护** | 512px 送模型，标注尺原分辨率贴回 |
| `lib/ai/model3d-vision-input.ts` | 给 LLM 看尺寸：裁上/下/左/右 4 条边，放大 2× | 供 step3 读数 |
| `compose.migration.yaml` | `QWEN_FLOORPLAN_MAX_DIMENSION`、`QWEN_IMAGE_STEPS`、`QWEN_FLOORPLAN_STEPS`、`QWEN_FLOORPLAN_RULER_*` | 见文件 |

## 五、为「局部重绘」和「文字清晰化」预留的插入位置

- **局部重绘（问题2）**：`lib/ai/image-service.ts` 的 `generateDreamHouseImage()`，
  在 `prepareFloorPlanForAI()` 之后、`qwenGenerateImage()` 之前插入裁剪/合成逻辑即可，
  后端不需要支持 mask。
- **文字重排（问题3）**：`lib/ai/server-image.ts` 的 `restoreFloorPlanFromAI()` 之后，
  用 `sharp` + SVG 把标签重绘上去，是纯 CPU 操作，不占显存。
