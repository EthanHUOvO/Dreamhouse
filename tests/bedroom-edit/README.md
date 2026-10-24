# Step2 户型改造回归测试

完整九户型程序测试：`python tests/bedroom-edit/run.py`。调用已有 SSH，在隔离且断网的容器中使用当前源文件，不修改运行服务。家具保留定向测试可设置 `BEDROOM_TEST_ENTRY=source-furniture.ts` 后运行相同命令。

`python tests/bedroom-edit/run-live.py` 只复核服务器 `/tmp/natural-bedroom-20261023/evidence/live-final` 已保存的真实 SVG/SceneGraph，不调用模型；目录和镜像可由 `BEDROOM_LIVE_REMOTE`、`BEDROOM_LIVE_IMAGE` 指定。历史实测及浏览器截图见 `docs/audit/natural-bedroom-20261023/REPORT.md`。

从仓库根目录执行：

```sh
node tests/bedroom-edit/intent-unit.cjs
```

脚本复用已安装的 TypeScript：依次尝试 `TYPESCRIPT_PATH`、当前 Node 模块搜索路径、容器已有的 `/app/node_modules/typescript`，以及当前 Windows 实验工作区中已有的 `work/structure-edit-20261013/deps/typescript.js`。不联网，不安装依赖。

在其他位置运行时，可以显式指定已有依赖：

```sh
TYPESCRIPT_PATH=/app/node_modules/typescript node tests/bedroom-edit/intent-unit.cjs
```

Windows PowerShell：

```powershell
$env:TYPESCRIPT_PATH = 'C:\path\to\existing\typescript.js'
node tests/bedroom-edit/intent-unit.cjs
```

这是纯程序测试。模型调用全部替换为明确标记 `CONTROL-STUB-NOT-AI` 的受控响应，不会调用真实模型。测试覆盖意图格式、目标房间、保护范围、否定／不支持／澄清分支、复合要求拒绝、无候选回滚、候选 ID 校验和候选提示词大小限制。

最后一项真实加载 `one-option-01` SVG，使用项目的实际 SVG 解析器、分隔几何和路由，只将模型响应及 HTTP 包装替换为受控桩，验证新增房间、其他房间不变、通道校验、原 SVG 文件不被修改。它验证代码兼容性，不能证明真实模型理解自然语言，也不能代替 Pascal 场景、浏览器及保存恢复测试。真实 AI 实验应单独记录模型、请求和结果。

## 四向墙角卧室回归

`corner-regression.ts` 覆盖四向矩形测试图、九套原图加载恢复、方向约束、实际 MCP 函数建模、原门连接、碰撞、失败回滚与 V1/V2 保存恢复。它不调用模型。以已有运行镜像启动隔离容器，在 `/app` 为工作目录，通过 `node --import tsx /workspace/tests/bedroom-edit/corner-regression.ts` 执行；将本仓库只读挂载到 `/workspace`，将证据目录挂载到 `/evidence`，设置临时 `PASCAL_SCENE_DIR`。不覆盖镜像的 `/app` 业务文件。

意图控制桩测试可设置 `BEDROOM_ACTUAL_RUNTIME_ROOT=/app`，复用镜像中真实几何模块，避免 VM 编译环境的速度影响搜索时限。运行方式：在 `/app` 执行 `node --import tsx /workspace/tests/bedroom-edit/intent-unit.cjs`。这仍是受控模型响应测试。

历史 `one01-bottom-door-sofa.json` 固定了旧镜像的阻挡摆放；新默认摆放应通过，相同旧摆放应继续被拒绝。不能把默认生成器改善后该负例不再自动出现，误认为可以删除碰撞校验。实际 AI、服务部署和限制见 `docs/audit/bedroom-corners-20261023/REPORT.md`。
