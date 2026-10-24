# 户型编号、后端自启与家具本地资源修复（2026-10-20）

基线：`v2-svg` / `787b80d`。仅修改本轮范围，保留已有 `compose.migration.yaml` 未提交改动。

## 修复与根因

- **显示编号**：三类户型均改为“方案 1 / 2 / 3”，Step3 确认卡同步。内部仍为一居/二居 01、02、07，三居 01、03、07；文件名、版本绑定和旧会话 ID 不变。
- **开机恢复**：本次主机启动后，web / Pascal MCP / 图像服务 / 网关已自行恢复；`gufo-serve` 的 restart policy 原为 `no`，因此 Qwen 没有启动。Docker 已启用开机启动。已启动原容器并将五个当前业务容器设为 `unless-stopped`，没有重建或重新部署模型。
- **家具无法显示**：Pascal SDK 将 `/items/...` 指向 `https://editor.pascal.app`；服务器连接该域名超时。原镜像没有本地 `/app/public/items`，Draco / Basis 解码器也依赖外部站点。已按现有 `house-scene.ts` 的清单本地保存 15 个 GLB 和 15 张缩略图，并在 Docker 构建中加入同源 URL 适配及本地解码器。GLB 的缓冲区和图片全部内嵌，无外部资源依赖。没有用占位方块替代家具。

## 关键文件

- `TouchCustomerPortal.tsx`：展示编号与内部源编号分离。
- `scripts/ensure-backends.sh`：幂等启动当前五个容器并持久化 restart policy；缺失容器时失败，不创建第二套部署。运行：`sh scripts/ensure-backends.sh`。
- `scripts/localize-pascal-assets.mjs`：构建时适配现有 SDK 的家具 URL、Draco 与 Basis 路径，并从当前 Three.js 包复制配套解码器。匹配点数量严格检查，SDK 更新不兼容时直接停止构建。
- `public/items/asset-manifest.json`：30 个原始资源的来源、字节数和 SHA-256。
- `Dockerfile.web.rocm`、`compose.svg-adapter.yaml`：将资源和适配打包进 `ideal-home-local:web-local-assets-20261020`。
- `tests/local-assets/regression.mjs`：资源完整性、实际压缩解码、顶点边界及 SDK URL 解析回归。

## 实际验证

| 检查 | 结果 | 证据 |
|---|---|---|
| 30 个家具资源 SHA-256 与 GLB 依赖 | PASS | 无外部缓冲区/图片 |
| 15 个家具模型的实际几何读取 | PASS | 原始与 Draco 模型均检查顶点、三角形和位置边界 |
| 35 个线上静态资源 | PASS | 30 个模型/缩略图及 5 个解码器，HTTP 200；模型与清单 SHA 一致 |
| 三类户型显示 1/2/3，各 3 张 | PASS | 浏览器检查全部 9 张图片加载完成，源文件映射不变 |
| 第三项进入 Step3 | PASS | 一居显示“方案 3”，实际仍采用 `/one/option-07.svg` |
| 床、沙发、马桶的浏览器实际显示 | PASS | one-option-01 / 07 经 SVG → MCP 构建成功；旋转场景可见上述家具，控制台 error 为空 |
| 本地文字、图像、MCP 服务健康检查 | PASS | 三项均 healthy |
| 真实 Qwen 推理 | PASS | `Ours`，短请求实际返回 `OK`，0.167 秒；没有运行生图实验 |
| 主机完整重启后的恢复 | UNKNOWN | 当前未执行整机重启；已验证 Docker boot enabled、五个容器运行及持久化策略 |

浏览器完成 SVG → MCP → 三维场景构建测试。模型资源测试是程序测试，不能当作 AI 生成实验；本轮没有修改户型几何或重新训练模型。

本次验证原始记录在本地工作区 `outputs/startup-assets-20261020/`：`backend-check.json`、`http-check.json`、`picker-check.json`、`render-check.json`、`assets-regression.log`、`picker-123.png`、`furniture-bathroom.png`。家具截图保留了床、沙发与马桶的实际显示结果。

部署后刷新已打开的页面，以加载新 JS。需要完整重启验证时，应在允许中断当前使用的时段重启主机，再核验五个容器及 `/api/ai/status`。
