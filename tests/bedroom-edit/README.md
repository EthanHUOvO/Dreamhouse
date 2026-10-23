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
