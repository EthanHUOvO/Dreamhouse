> 最新四向墙角卧室、真实2/9目录改造结果与部署见 [实测报告](../audit/bedroom-corners-20261023/REPORT.md)。下方内容是历史记录；当前镜像及源码提交以 SOURCE_PROVENANCE.json 为准。

> 当前已回退新增卧室版本，见 [回退记录](../audit/bedroom-rollback-20261023/REPORT.md)。后续文字包含历史实验，不代表当前启用功能。

> 最新结构操作与部署更新见 [2026-10-23 通用结构原语报告](../audit/structure-primitives-20261023/REPORT.md)。以下为首次导出的历史记录，最新镜像及来源以 SOURCE_PROVENANCE.json 为准。

# CIIE 项目代码与实验记录迁移

导出日期：2026-10-23。目标仓库 EthanHUOvO/Dreamhouse，目标分支 CIIE。保留目标 main，不强制覆盖任何已有分支。

## 来源与目录

- 原 CIIE 项目：`/home/amd/Workspace/Ideal-house`，提交 `bc7c3f1`。原工作区含历史未提交实验，本次没有改动它。
- 最新已验证实现：`/srv/ideal-home/rocm-migration` 的 `v2-svg`，提交 `3bcb8aa`。
- 当前运行镜像：`sha256:90f75275e2ffc86d2076deed11768934ebfdf63b86f623a6649cb517e28830c1`。
- 仓库根目录 `app/`、`components/`、`lib/`、`services/`、`public/` 等来自该运行镜像的应用源码，包含实际使用的模型接口、SVG 编辑、Pascal 及家具资源；不是只上传一个补丁。
- `deploy/ai395/` 保存已提交的部署覆盖文件、Dockerfile、模型网关源程序和相关工具；原机器未提交的配置不混入。
- `v2/` 和根目录 `TouchCustomerPortal.tsx` 是原实验和回归测试使用的源码别名；开发应用应以根目录 `components/customer/TouchCustomerPortal.tsx` 和 `lib/ai/` 为准。
- `tests/`、`docs/audit/` 包含本轮及已有相关回归。具体来源见 `SOURCE_PROVENANCE.json`，文件清单见 `SOURCE_MANIFEST_SHA256.txt`。

## 本轮改动与真实状态

已接入自然语言意图解析、主机几何候选、真实本地模型选择、同 SVG 的二维渲染与 Pascal SceneGraph 构建；新增隔墙、门、入户路径和实际家具碰撞检查通过后才提交版本。失败保持旧方案。

修复图片 V1/V2 与场景绑定、缓存 blob 恢复误解绑、草稿和已提交需求混淆、手动保存未更新版本快照。保留同源已保存家具，家具操作仍在 Step3 手动完成；手动墙门尚未回写 SVG 时拒绝覆盖。

one-option-01 的“在客餐厅上侧新增一个卧室”已经过真实模型与实际 MCP、浏览器生成/保存/刷新验证；新增约 6.07㎡，保留 0.9m 通道。其他八套同项改造安全拒绝，不能称为全部成功；九套原始加载与保存恢复均通过。家具保留 15/15、意图控制桩 22/22 等程序测试通过。全量 TypeScript 原有 141 个诊断仍存在。采光/通风未验证，默认厨房家具越界问题尚未修复。

完整报告：[自然语言新增卧室实测](../audit/natural-bedroom-20261023/REPORT.md)。报告区分真实 AI、程序测试、已验证和未知项，不重新包装成“全部通过”。

## 使用与部署

应用使用 Node.js 22、Next.js 16 和 `package-lock.json` 锁定依赖，常规入口为 `npm ci`、`npm run dev` 或 `npm run build && npm start`。已有整体 verify/typecheck 问题没有在打包时改写为通过。

本地模型需另行配置现有 OpenAI 兼容文本接口、图像接口和 Pascal MCP；运行服务使用模型别名 Ours，不能据此证明具体权重名称。不要将真实密钥写入仓库。现有参考配置在 `.env.example` 与部署目录。

AI 主机离线覆盖构建需该主机已有基础镜像。`deploy/ai395/Dockerfile.bedroom` 依赖 `ideal-home-local:web-edit-save-20261022`，不是从任意空白机器即可复现的通用安装器；在该目录使用 compose.migration.yaml 加 compose.bedroom.yaml 启动 Web。已部署端口为 3002，运行模型不随此次打包重新部署。

未上传模型权重、node_modules、.next、.runtime、真实 .env/凭据、离线 CMake 二进制及历史备份。旧报告内机器绝对路径属于原实验环境，回归脚本中的 SSH/目录需按自己的环境配置；本次迁移没有重新执行模型实验。
