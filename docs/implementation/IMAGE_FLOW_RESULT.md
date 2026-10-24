# Ideal_home：I2I、Step4 与 3D 展示修复结果

日期：2026-10-13。依据 `/home/amd/Workspace/Ideal-house` 的本轮实际工作树，分支 `CIIE`；父提交 `25b940f4803fdde784d7ae37dabd1f1e41385224`。未引用旧 GitHub 状态。仅重建两个 Web 容器；现有文本、图像模型及 MCP 服务未重新部署。原有未提交修改保留。

## 结论与完成边界

| 项目 | 状态 | 实际证据 |
| --- | --- | --- |
| 3001 指令 I2I 调用真实编辑后端 | 已验证 PASS | 返回 Qwen-Image-2.1-Fun-Acc-4Step / ncnn-vulkan；原图客餐厅地面确实改色 |
| Step4 从 Pascal 拍摄图进行真实装修 I2I | 接入 PASS；质量 FAIL | 两次实际推理均返回新图；首轮客厅新增马桶、窗，短指令复测去掉马桶但仍新增窗和沙发、门洞偏移 |
| 首次生成速度 | 存在问题 | Step2 148.296 秒；Step4 135.097 / 130.080 秒。不能称已解决首次推理慢 |
| 相同输入的已完成缓存 | 已验证 PASS | Step2 同端口 64ms、跨端口 140ms；Step4 首轮复用 115ms，最终校验版本短指令结果复用 211ms，均非新模型推理 |
| 3D 家具可见与概览 | 已验证 PASS（one-option-01 UI） | 兼容当前 SDK 缺少的 block 渲染器；概览、漫游、实际拍摄 PNG 中可见家具。24 套原始 block 几何与相机适配程序检查通过 |
| Step4 保存恢复 | one01 实际浏览器 PASS | 首轮确有保存失败警告，刷新丢装修结果；删除精确重复截图后，最终真实生成、两次刷新均保留同一输出 URL、风格和视角，无新增保存警告。24 套序列化往返等价通过；不保证所有大型会话均低于浏览器容量上限 |
| 图片与结构关系 | 已验证程序门禁；UI 原结构路径通过 | 图片预览不承诺房间结构变更；没有经过几何验证的图不能确认成修改后的 3D。SceneGraph 仍为结构真值 |

## 修复内容与调用链

1. **实际后端绑定**：两端口的 `floorplan-edit` / `walkthrough-render` 都明确绑定现有 Qwen 图像编辑 gateway。普通 preview 后端仍保留原配置。单独改 model 标签不能切换服务，现在 URL 和实际返回 model 必须一致；Turbo 不接受为指令编辑配置。配置在 [compose.yaml](/home/amd/Workspace/Ideal-house/deploy/local-ai/compose.yaml:18)、[config.ts](/home/amd/Workspace/Ideal-house/lib/ai/config.ts:23)、[qwen-image-client.ts](/home/amd/Workspace/Ideal-house/lib/ai/qwen-image-client.ts:8)。
2. **Step4 链路**：Pascal 原始 Canvas PNG → `qwenImageService` → `/api/ai/render-view` → 输入/输出身份验证 → `image-service` → Qwen gateway → ncnn CLI → 本地生成文件 → 同一 capture 的装修预览。请求和响应核对 session/capture/style/sceneRevision。无自动 POST 重试，600 秒截止包含读取响应正文；取消信号传至上游。见 [interior-request.ts](/home/amd/Workspace/Ideal-house/lib/ai/interior-request.ts:51)、[route.ts](/home/amd/Workspace/Ideal-house/app/api/ai/render-view/route.ts:8)。
3. **尺寸与错误结果**：不再用全局 512×512 拉伸宽视角；本次 1920×1080 拍摄图在模型内用 512×288，展示时恢复原尺寸；放大不会增加真实细节。本地结果必须有规范生成路径、实际模型和 requestId，文件必须真实存在且完整解码成功。原图/近似原图返回 422，不写完成缓存。像素变化检测只证明变化，不检测语义正确性。见 [server-image.ts](/home/amd/Workspace/Ideal-house/lib/ai/server-image.ts:100)、[image-service.ts](/home/amd/Workspace/Ideal-house/lib/ai/image-service.ts:179)、[image-result-cache.ts](/home/amd/Workspace/Ideal-house/lib/ai/image-result-cache.ts:14)。
4. **速度与交互**：完成结果缓存 24 小时；key 包含源图、完整提示、实际后端/模型、尺寸和步数，风格或要求改变会重新推理。显式“重新生成”绕过缓存。单进程同 key 在途拒绝重复提交；不同 Web 进程在途仍可能重复排队。生成期间暂停 idle 计时、提供取消；进度明确为估计，不声称正在几何检查。相关逻辑在 [image-service.ts](/home/amd/Workspace/Ideal-house/lib/ai/image-service.ts:134)、[Portal](/home/amd/Workspace/Ideal-house/components/customer/TouchCustomerPortal.tsx:3521)。
5. **3D 显示兼容**：当前安装的 SDK 对原始 block 没有内置 renderer。新增兼容层只在 registry 缺少 block 时生效；复用 SDK registry、层、事件和材质，把 mesh 挂在真实父 Object3D 下，保留父级变换/可见性。凹面用现有 Three 工具三角化，不改 SceneGraph。one01 的 88 家具部件和 4 灯具保留。适配相机、概览透明墙、全墙漫游和放大查看是显示改动。见 [PascalBlockMeshes.tsx](/home/amd/Workspace/Ideal-house/components/shared/PascalBlockMeshes.tsx:12)、[block-mesh.ts](/home/amd/Workspace/Ideal-house/lib/pascal/block-mesh.ts:1)、[PascalViewer.tsx](/home/amd/Workspace/Ideal-house/components/shared/PascalViewer.tsx:413)。block 可见不等于已有 item 拖拽工具可以编辑所有 block；该编辑能力 UNKNOWN。
6. **保存体积**：只省略与 capture.image 完全相同的 screenshotDataUrl、renderedImage.sourceImage 和按 sourceCaptureId 匹配的生成记录 sourceImage；恢复时补回。不同图片、歧义 ID 和显式 null 不抹除，模型绑定与 SceneGraph 不变。见 [interior-persistence.ts](/home/amd/Workspace/Ideal-house/lib/ai/interior-persistence.ts:20)。不删除用户历史、不放宽几何校验。

## 真实 AI 测试（与程序测试分开）

| 样例 | 模型/规格 | 耗时与变化 | 结论 |
| --- | --- | --- | --- |
| one01 Step2，只把客餐厅地面改浅木色 | Qwen Fun-Acc-4Step；4 步；512×512 | HTTP 148296ms；worker 147786ms；排队 53ms；变化 12.84% | 生效 PASS；部分文字变模糊，几何正确性 UNKNOWN |
| one01 Step4 原木风，实际 Pascal 客餐厅拍摄图 | 同模型；CFG1；4 步；512×288 | worker 135097ms；进程 134918ms；排队 179ms；变化 98.57% | 接入 PASS，质量 FAIL：客厅新增马桶及窗 |
| 同一 PNG、同一风格的短正向指令复测 | 同模型和规格；首轮未记录 seed，不能称严格同 seed A/B | worker 130080ms；进程 129935ms；排队 145ms；变化 93.63% | 马桶未再出现，但新增窗/沙发、门洞漂移仍 FAIL；一次样例不能证明稳定改善 |
| 最终保存恢复验收：one01 原生默认漫游视角、原木风 | 同模型和规格；另一个真实 Canvas 截图 | worker 130980ms；进程 130849ms；排队 131ms；变化 90.08% | 两次刷新同输出/风格/视角 PASS；画面仍丢失原有电视、出现不对应家具，家具保持 FAIL |

本轮真实推理共 4 次：1 次户型图、3 次装修；其他复用请求不属于真实推理。证据附件：`i2i-3001-real-test.json`、`step4-real-first.json`、`step4-real-short.json`、`step4-real-restore.json`，原始 PNG、输出和浏览器截图在本轮 evidence 包中。图片成功均没有被记为 SceneGraph 编辑成功。本轮未重复运行 Qwen 27B 结构编辑；上一轮该闭环的结论以原有报告为准。

**模型与工程问题的区分：** 原 3001 默认 Z-Image-Turbo 以较低 strength 的通用 init-img 运行，与自然语言精确编辑要求不匹配；现在选到真实 Qwen 编辑服务。Step4 两轮图均发生明显变化，但仍不遵守门窗与物体约束，不能把问题全部归因于未接 API。已部署 ncnn 二进制明确含 CFG≤1 时忽略负面提示的提示，Web 确实传 CFG1；[ncnn 官方说明](https://github.com/nihui/qwenimage-ncnn-vulkan)和 [Fun-Acc 编辑示例](https://huggingface.co/alibaba-pai/Qwen-Image-2.1-Fun-Acc-LoRAs/raw/main/predict_t2i_edit.py)支持这一约束。因此保留 1/4 步，缩短正向提示，避免要求画面外家具以及把无关卫浴概念放进正向指令。首轮正向提示 2192 字符，“马桶”出现一次；不能宣称这就是唯一失败原因。

应用层没有 prompt 截断；当前 worker 二进制与宿主 20261010 发行包 SHA 不同，确切构建版本与文本 token 上限为 UNKNOWN。本轮未替换二进制或模型。每次 CLI 重新启动，非 resident；首次耗时大部分发生在进程内部，排队不足 0.2 秒。具体加载/编码/扩散各占多少时间没有本轮分段测量，UNKNOWN；不能把总耗时全说成加载。

## 程序与构建验证

- `regression-release-pass.log`：74 项 Node 程序测试通过（结构编辑、模型绑定、现有图片输入、24 套严格目录加载恢复、3D 几何、相机呈现、Step4 身份/截止/取消）；独立 HTTP stub + 真 Sharp 图像检查 14/14。stub 没调用真实 GPU。
- `test-pascal-block-mesh.mjs` 6/6；`test-pascal-presentation.mjs` 6/6（24 套 × 3 种画布比例，输入冻结）；`test-interior-render.ts` 15/15；`test-verified-preset-scenes.ts` 11/11（含所有 24 套真实 PNG 与恢复门禁）。
- `persistence-release-pass.log`：24 套真实 PNG/SceneGraph 紧凑保存后恢复等价，输入不变；不同源图/旧存档/歧义 ID 检查通过。合计删除 28,136,496 个重复字符。此为序列化程序测试，不是 24 套浏览器容量验收。
- 最终 Web 镜像在离线构建环境执行 `npm run verify && npm run build`，PASS，镜像 `sha256:b29711ce55732293530ef497d70a21cad1abcb84830f764ba58cb7195f3c5544`。独立 `tsc --noEmit` **FAIL**：原基线 141 条诊断（31 项目、110 依赖）；含保存 helper 的最终 TS 源码与基线去除行列号后逐条、顺序相同，零新增。此后仅 CSS 布局变化，未修改 TS。不能把 Next 构建成功当作全仓类型检查成功。
- 原工作目录含 `.runtime`/旧回归副本；在该目录运行全仓 syntax/tsc 会扫到归档产物。本轮正式构建与最终类型检查使用镜像 `/app`，实际测试日志保留。

## 未解决问题与优先级

| 优先级 | 问题 | 推荐的下一步与验收 |
| --- | --- | --- |
| P1 | 新要求仍需约 2 分钟 | 在现有 worker 添加分阶段计时，区分文件读取、文本/图像编码、扩散、保存；查现有 runtime 是否能保持模型常驻，再决定实现。固定源图/提示/seed 测多次；缓存不能作为首次推理提速证据 |
| P1 | 装修结构保真失败 | 继续以 SceneGraph 为结构真值；增加来自同一场景的轮廓/开口约束或保留结构区域的局部编辑，而非继续堆禁止词。先用固定 seed 与同一图验收门窗数量/位置、画面外物体、家具保持；不能仅凭变化率通过 |
| P1 | 大会话仍可能超过 localStorage 容量 | 复用现有 IndexedDB/服务端持久化保存较大场景和图像，仅保留轻量索引；原结构身份与失败回滚仍需保留。去重测试中 three01/three06 大记录仍超过 5 百万字符，浏览器全目录验收 UNKNOWN |
| P2 | 不同 Web 实例同时提交同要求会重复排队 | 复用既有 GPU 锁增加跨进程 job 身份；双端口并发同图验证仅创建一次真实进程 |
| P2 | 展示细节/交互 | 当前仅 one01 做浏览器概览、漫游、拍摄验收；其余 23 套视觉美观、所有风格、block 手动拖拽、家具 BOM 统计 UNKNOWN；按样例验证，勿把 mesh 可见当成交互/BOM 已完成 |
| P2 | 取消/闲置边界 | 已有 worker SIGKILL 并等 child.close 后释放 GPU 锁的机制，Web/stub 信号回归通过；本轮实际 GPU 取消实验 UNKNOWN。生成期间 idle 暂停已实现；原正常闲置会结束并清理会话的行为仍存在 |

## 交付与原有修改保护

本轮所有来源文件均按 before/after SHA 验证后上传。原有未提交文件不被覆盖为旧 Git 版本。与原有 dirty 文件重叠的本轮差异交付为 `patches/20261013-i2i-step4-incremental.patch`，已应用于实际运行工作树；干净来源及新文件直接进入本轮提交。该补丁是增量记录，**不要再应用到当前已改好的工作树**。新的干净 clone 不包含原有未提交基线，不能仅凭本轮 Git HEAD 宣称可独立复现当前整个部署。

最终浏览器保存恢复、最终镜像、提交及原文件 SHA 保护的实际记录见 `IMAGE_FLOW_EVIDENCE.json`；UNKNOWN 项不标记完成。
