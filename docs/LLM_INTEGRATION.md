# 大模型接口

## 第一阶段：不接模型

使用 `PLANNER_MODE=rules`，先把 UI、Pascal、承重墙保护、版本、制造出口跑通。

## 第二阶段：接自己的模型

推荐 OpenAI-compatible：

```http
POST {LLM_BASE_URL}/chat/completions
Authorization: Bearer {LLM_API_KEY}
```

只需要修改 `.env.local`。

如果你的模型不是 OpenAI-compatible，只改 `lib/llm-planner.ts` 的 HTTP 部分，最终返回 `RenovationPlan` 即可。

## 模型不能做什么

不要让模型直接输出底层 Pascal `delete wall_xxx`。模型只能输出：

- `resemanticize_room`
- `split_room`
- `remove_all_partitions`
- `add_partition`

然后由 Constraint Guard 转成 Scene Patch。
