# Architecture

```text
Touch UI
  │
  ├── Step 1 Residence Template
  │        └── createScenarioScene()
  │
  ├── Step 2 Qwen3.8-Flash Layout Agent
  │        ├── Function Calling
  │        ├── Layout Tools
  │        ├── Validator
  │        └── Pascal SceneGraph / Viewer
  │
  ├── Step 3 Qwen-Image 2D floorplan
  │
  ├── Step 4 Qwen-Image overall + room renders
  │
  └── Step 5 Pascal Geometry BOM
           ├── deterministic quantities
           └── Qwen3.8-Flash enrichment
                    │
                    ▼
                Contractor / MES
```

Pascal SceneGraph 是结构与工程真值。生成图片不是 BOM 的工程量来源。
