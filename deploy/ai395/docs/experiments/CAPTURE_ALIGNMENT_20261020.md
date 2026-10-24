# 手动拍照与装修图画幅对齐

项目 `/srv/ideal-home/rocm-migration`，分支 `v2-svg`；基线 `5062c11`；部署入口 3002。

## 已确认的原因

1. 原 `prepareImageForInteriorEdit` 分别将宽高取整到 32 的倍数，再用 `fit:fill` 拉伸拍摄图，改变了送入模型的画幅比例。
2. 原生成图后处理用 `fit:inside` 缩小到另一尺寸框，保留了模型画布比例，没有逆转前面的宽高变换。
3. 对比组件让两张图片分别 `object-fit:contain`，因此不同宽高比的图片各自居中、产生不同留白；放大窗口复用该组件，也会错位。
4. 独立会话实际手动拍摄为 1920×1080，实时 canvas 显示为 1280×720，比例均为 16:9。本次实测没有发现相机画幅本身变化，未修改 FOV 或相机位置逻辑。

## 修改

已核对实际链路：`TouchCustomerPortal.generateRenders` → `qwenImageService` → `interior-request` → `/api/ai/render-view` → `generateDreamHouseImage` → 预处理/模型接口/画幅恢复 → 原拍照与效果图进入 `BeforeAfterComparison`。

- `v2/step4-image/server-image.ts:353`：保留原模型输入尺寸预算，等比缩放拍摄图，在 32 像素网格画布中补边，并记录 `contentBounds`。
- `server-image.ts:403`：生成后移除系统补边，还原为手动拍照的原始像素宽高。该步骤恢复坐标画幅，不增加 AI 生成细节。
- `v2/step4-image/image-service.ts:54`：使用上述逆变换替换 `fit:inside`，归一化失败返回错误；`:131` 为装修图缓存加入 `capture-padded/v1`，避免复用旧处理流程的缓存；返回元数据记录实际保存尺寸。
- `app-src/components/customer/BeforeAfterComparison.tsx:25`：按原拍照图的自然宽高比计算唯一显示矩形，两图、遮罩、分界线共用该矩形。兼容已保存的旧比例图片，放大时整体缩放，拖动位置使用实际画幅坐标。
- 不修改 SceneGraph、墙体、门窗、手动拍照相机或现有本地模型。

## 测试与证据

| 项目 | 结果 |
|---|---|
| 图像预处理/逆变换 | **PASS 8/8**：1474×691、1600×900、900×1600、1013×777，分别测试 256/512 预算；输出宽高与原图完全相同 |
| 标记点坐标 | **PASS**：红蓝标记横坐标误差最大约 1.002 原图像素，包含重采样误差；不代表真实 AI 语义或透视稳定性 |
| 实际 API 处理函数/服务模块 + HTTP 模拟后端 | **PASS**：`render-view` 处理函数保留拍照身份并返回原尺寸；较低分辨率返回图恢复原尺寸、旧缓存隔离、新缓存复用、损坏图片拒绝；4 次模拟调用，真实 AI 推理 **0 次** |
| 既有二维户型图像回归 | **PASS 4/4**：原补边恢复、宽高图预算、采样步数及取消请求测试通过 |
| 浏览器显示 | **PASS**：1474×691 与 384×192 共用约 1194.55×560 的矩形；900×1600 与 192×384 共用 360×640；放大后两图同时为 450×800；25% 位置点击得到 `left:25%` |
| 实际拍照链路 | **PASS**：独立会话中点击“拍摄”后，Step4 成功读取 1920×1080 PNG；未调用装修模型 |
| 应用构建与部署 | **PASS**：镜像 `ideal-home-local:web-capture-alignment-20261020`，仅更新 web 与 pascal-mcp |
| 全量 TypeScript | **FAIL（原有问题）**：仍为 141 条，对比原诊断集合新增 0；本轮修改的三个模块无类型诊断 |

证据：`tests/image-alignment/results/programmatic.json`、`browser-evidence.json`、`alignment-check.png`、`typecheck.txt`。浏览器截图使用合成标记图，明确标识“不是 AI 生成结果”。

在原有隔离测试容器内复现：

```sh
sh tests/svg-adapter/run-in-image.sh ../image-alignment/regression
cd /app && node --import tsx --test lib/ai/floorplan-image.test.ts
```

`tests/image-alignment/browser-server.cjs` 是临时视觉回归工具，仅在测试容器中运行，不是产品路由；需通过测试容器的 `/app/node_modules` 和本轮生成的 PNG 夹具运行。

## 使用与限制

- 刷新页面后，既有结果会使用统一显示画幅。下一次生成使用新的补边/恢复流程，保存后的效果图尺寸与原拍照一致。
- **UNKNOWN**：真实图像模型是否改变视角、墙线、物体位置。本轮没有执行真实 AI 生图，也不保证两张语义不同的图能逐像素重合。
- 已被旧模型裁掉的内容无法靠统一画幅恢复；旧结果可纠正显示缩放，但不能补回丢失内容。
- 当前验证的是本地生成图片文件流程；云端直接返回外部 URL 的原尺寸恢复为 **UNKNOWN**。
- `compose.migration.yaml` 原有未提交内容保持原哈希，不纳入本轮提交。
