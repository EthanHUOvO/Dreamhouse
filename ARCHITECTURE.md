# DreamHouse v12 architecture

```text
Resident Portal
  ├─ DrawingSource
  ├─ UserProfile
  └─ Design Version
         ↓
AI Layout Agent (Qwen3.7-plus)
         ↓ Function Calling
DreamHouse Geometry Tools
         ↓
Validated SceneGraph Preview
         ↓ user approval
Pascal 2D / 3D / Furniture / Walkthrough
         ↓
Approved DesignVersion
         ↓
Deterministic BOM Engine
         ↓
Qwen BOM Enrichment
         ↓
Validated / Frozen Detailed BOM
         ↓
MES: schedule → print → transport → robot/manual install → QC → acceptance
```

The large model is a planner and tool caller. Geometry, dimensions, quantities, sourceNodeId and production state remain deterministic application data.
