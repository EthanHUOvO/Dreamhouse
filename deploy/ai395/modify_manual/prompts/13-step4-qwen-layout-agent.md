# lib/ai/qwen-layout-agent.ts:56

- 步骤：step4
- 文件：`lib/ai/qwen-layout-agent.ts`
- 行号：56
- 变量/位置：`goal`
- 类型：template 字符串
- 字数：169

> 自由布局 Agent（工具调用式重构）

## 实际提示词（逐字）

```text
Goal Verification 未通过。目标=${JSON.stringify(goal.target)}，实际=${JSON.stringify(goal.actual)}。请继续调用结构工具（split_room、add_partition_wall、add_door 等）直到目标满足，然后再次 validate_layout。
```
