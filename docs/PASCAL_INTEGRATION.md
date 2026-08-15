# Pascal 接入

本工程不是 iframe，而是 npm package 深度嵌入。

```tsx
<Editor
  projectId="HOUSE_001"
  layoutVersion="v2"
  onLoad={loadScene}
  onSave={saveScene}
/>
```

固定住宅约束存入 Node metadata：

```json
{"structural_type":"load_bearing","editable":false,"lifecycle_scope":"base"}
```

可变非承重墙：

```json
{"structural_type":"partition","editable":true,"lifecycle_scope":"scenario"}
```

房间 Zone 语义：

```json
{"semantic_type":"gaming_room","lifecycle_scope":"scenario"}
```
