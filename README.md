# Ideal Home Lifecycle + Pascal v1.0

面向“同一住宅随家庭生命周期持续重构”的工程骨架。

## 核心目标

不是二居/三居/四居模板，也不是重新生成一套房子。系统始终维护一个 `HOUSE_001`：

- **Base House（不可变）**：外轮廓、承重墙、楼板等。
- **Living Scenario（可变）**：非承重隔墙、房间 Zone、房间语义、家具布局。

典型变化：

- 电竞房 → 衣帽间：语义重构。
- 卫生间 → 主卫 + 公卫：几何 + 拓扑 + 语义重构。
- 清空非承重隔墙：保留住宅骨架，重新规划内部空间。
- 单人 → 两人 → 育儿 → 多代居住：版本化生命周期演化。

## 系统链路

```text
User Text
  ↓
Rule Planner（默认，不需要大模型） / LLM Planner（可选）
  ↓
RenovationPlan
  ↓
Constraint Guard
  ↓
Pascal Scene Patch
  ↓
Pascal Editor
  ↓
DESIGN / FABRICATION
  ↓
STL / OBJ / GLB / Simulation / Printer / Robot
```

## 启动

要求 Node.js 22.13+。

```bash
cp .env.example .env.local
npm install
npm run doctor
npm run dev
```

打开 `http://localhost:3000`。

Windows 可直接双击 `START_WINDOWS.bat`。

## 默认不需要大模型

`.env.local`：

```env
PLANNER_MODE=rules
```

可测试：

- `把电竞房改成衣帽间`
- `把卫生间切成主卫和公卫`
- `拆除所有非承重隔墙`
- `我要结婚了，变成两个人居住`
- `家里有孩子了，还需要一个保姆房`

## 什么时候需要接自己的大模型

只有当你希望用户可以自由说自然语言，例如：

> 我们准备要孩子，希望保留我的工作区，同时增加儿童房，并把卫生间重新规划。

这时把：

```env
PLANNER_MODE=llm
LLM_BASE_URL=https://你的模型服务/v1
LLM_API_KEY=...
LLM_MODEL=...
```

模型最好兼容 `POST /chat/completions`。

大模型只负责输出受限的 `RenovationPlan`，**不直接删除 Pascal 墙体**。承重墙保护、房间拆分、节点 ID 校验和版本保存全部由后端确定性代码执行。

## Pascal 连接

`components/PascalWorkspace.tsx` 直接挂载 `@pascal-app/editor` 的 `Editor`：

- `onLoad` → `/api/scene`
- `onSave` → `/api/scene`
- `projectId` → `HOUSE_001`

因此 Pascal 负责编辑/渲染，本项目负责住宅生命周期、版本、约束和下游制造。

## 当前制造输出

右侧 FABRICATION 已调用 Pascal 的 `exportScene()`，可导出完整：

- STL
- OBJ
- GLB

如果最终需要严格拆成：

- `01_floor.stl`
- `02_walls.stl`
- `03_furniture.stl`

下一步增加 `ManufacturingExportPlugin`，按 Pascal node type / metadata 分组后分别调用 STLExporter。见 `docs/MANUFACTURING_EXPORT.md`。

## 关键文件

- `lib/base-house.ts`：单一住宅基础场景。
- `lib/rule-planner.ts`：无需大模型的演示 Planner。
- `lib/llm-planner.ts`：你自己的大模型接口接入点。
- `lib/constraint-guard.ts`：承重墙和操作约束。
- `components/PascalWorkspace.tsx`：Pascal Editor 嵌入。
- `components/FabricationPanel.tsx`：仿真/打印/机械臂展示。
- `data/house_001/versions/`：生命周期版本历史。
