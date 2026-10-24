# AI Layout Agent · qwen3.8-flash → Pascal

本版不让 Qwen 直接修改 Pascal 原始坐标。`qwen3.8-flash` 只通过 Function Calling 使用 DreamHouse 提供的受控工具。

## 工具

- `get_house_constraints`
- `get_room_geometry`
- `assign_room_function`
- `merge_rooms`
- `split_room`
- `remove_partition_wall`
- `move_partition_wall`
- `add_door`
- `move_door`
- `remove_door`
- `regenerate_furniture`
- `validate_layout`

## 安全边界

- 外墙不可修改
- 承重墙不可修改
- 入户门不可删除
- 工具在服务端 SceneGraph 临时副本执行
- 完成后必须通过 `validate_layout`
- 前端收到操作序列后逐条在 Pascal Viewer 中回放，形成“AI正在建模”的视觉效果

## 实时性的定义

当前实现属于 near-real-time：Qwen 先完成一轮工具规划，随后前端按照真实工具调用顺序回放并更新 Pascal Scene。后续若需要 token/tool-call 级流式建模，可把 `/api/ai/layout` 扩展为 SSE/stream 路由。
