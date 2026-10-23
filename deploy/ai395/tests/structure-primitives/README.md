# 自然语言结构基本操作回归

本目录区分三种证据，不能把控制桩或程序测试当作真实 AI 推理。

| 测试 | 范围 | 是否调用 AI |
| --- | --- | --- |
| `intent-plan-unit.cjs` | schema、宿主默认保护与显式保护冲突、多步事务、第二步失败回滚、候选白名单、取消/超时 | 否，受控模型与几何桩 |
| `route-geometry.cjs` | 真实 SVG/几何工具及路由集成、合并/移墙/书房/卧室、多步回滚 | 否，仅模型桩 |
| `scene-validation.ts` | 实际 MCP 六个本地函数、2D/3D 对应、实际家具/门高度/通路/锁定保护、保存恢复 | 否，也不调用 HTTP |
| `svg-raster.ts` | 实际 Sharp 与 SVG 渲染路由的 1024 像素宽度、比例及米制几何往返 | 否 |
| `catalog-restore.ts` | 九套原始 SVG 加载、Blueprint 校验、保存恢复和错误绑定拒绝 | 否 |
| `geometry-regression.ts` / `split-regression.ts` | 拓扑、真实开口和几何候选，具体结果以输出 JSON 为准 | 否 |
| `live-http.py` | 现有本地模型 HTTP 意图/候选推理，再调用 SVG 渲染与 Pascal MCP | **是**，不调用生图模型 |

现有 TypeScript 运行时可运行：

```text
node tests/structure-primitives/intent-plan-unit.cjs

```

若 TypeScript 不在可解析路径，通过 `TYPESCRIPT_PATH` 指定已有的 `typescript.js`，无需重新安装模型。源码加载器按照当前 `Dockerfile.web.rocm` 的覆盖顺序选取模块，避免误测旧 `app-src` 文件。

在已有 SSH/Docker 环境里运行隔离回归：

```text
python tests/structure-primitives/run-regression.py IMAGE intent-plan-unit
python tests/structure-primitives/run-regression.py IMAGE route-geometry
python tests/structure-primitives/run-regression.py IMAGE svg-raster
python tests/structure-primitives/run-regression.py IMAGE scene-validation
python tests/structure-primitives/run-regression.py IMAGE catalog-restore
python tests/structure-primitives/run-regression.py IMAGE svg-adapter
python tests/structure-primitives/run-regression.py IMAGE portal-transaction
python tests/structure-primitives/run-regression.py IMAGE edit-persistence
python tests/structure-primitives/run-regression.py IMAGE portal-handlers
```

`route-geometry` 应在实际容器运行时执行，避免 Windows VM 源码加载器额外开销误触发几何计算预算。`IMAGE` 应使用实际构建的镜像 ID。运行器会把当前源码覆盖进一次性容器，容器使用 `--network none`，结果及覆盖清单写入本地输出目录。最终构建镜像验收可设置 `STRUCTURE_TEST_IMAGE_ONLY=1`，不覆盖 `/app` 的业务模块，结果记录 `overlays: []`；测试源应与冻结提交一致。可用 `STRUCTURE_TEST_SSH`、`STRUCTURE_TEST_REMOTE`、`STRUCTURE_TEST_OUTPUT` 指定 SSH 主机、隔离目录和结果目录。

`scene-validation` 的程序断言 PASS 可能包括**预期安全拒绝**。必须查看每项 `outcome`：只有 `ACCEPTED` 才代表该家具状态通过；`SAFE_REJECTION_*` 表示未提交并需手动调整，不能计作户型改造成功。几何候选成功、MCP 成功、序列化成功也不等于最终带家具场景通过。

真实 AI 测试应指向隔离服务，使用 `PRIMITIVES_BASE_URL`、`PRIMITIVES_PROJECT`、`PRIMITIVES_EVIDENCE`、`PRIMITIVES_RUN` 设置环境；不能重用旧结果文件冒充本次结果。保留实际响应 ID、模型别名、耗时及回滚证据，报告中另列真实 AI 和程序结果。
