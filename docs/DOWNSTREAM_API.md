# 下游接口契约

平台向三个下游服务使用统一命令格式：

`POST /{device}/command`

```json
{
  "action": "start",
  "project_id": "three_bedroom",
  "preset_id": "three_bedroom",
  "semantic_project": { "...": "完整语义户型" },
  "artifacts": {
    "stl_bundle_url": "http://controller:8765/api/export/stl.zip",
    "simulation_bundle_url": "http://controller:8765/api/export/simulation.zip",
    "semantic_project_url": "http://controller:8765/api/export/project.json"
  }
}
```

仿真软件通常读取 `simulation_bundle_url`；3D打印网关读取 `stl_bundle_url`；机械臂可同时读取 `semantic_project` 与构件 ID。
