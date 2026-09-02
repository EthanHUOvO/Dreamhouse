# Smart Construction Semantic Pipeline v3.1

本版本重点修正固定户型的合理性：二居、三居、四居不再使用随意构造的房间块，而是根据公开真实/专业户型案例重新编码。详细来源见 `docs/REFERENCE_FLOORPLANS.md`。

# 语义户型 → 3D打印 / 仿真流水线 v3.1

这个版本按新的任务定义重构：**不接户型生成模型**，入口仅提供固定二居室、三居室、四居室方案。

## 主流程

1. 用户在初始界面选择二居室 / 三居室 / 四居室。
2. 系统读取预设中的结构化语义：卧室、客厅、厨房、餐厅、卫生间等，每个房间都有 `room_id` 和 `semantic_type`。
3. 二维墙体、地板、家具轮廓沿 Y 轴纵向拉伸，形成可视化三维实体。
4. 制造模型拆为三层：地板、整体墙体、家具。
5. 导出 `STL.zip` 给 3D 打印下游。
6. 同时导出 `SIMULATION.zip` 给仿真软件，包含 OBJ、SDF 和 Semantic JSON。
7. 打印完成后，机械臂接口按地板 → 墙体 → 家具顺序执行拼装。

## 运行

Windows：双击 `START_WINDOWS.bat`。

Linux/macOS：

```bash
./START_LINUX_MAC.sh
```

或：

```bash
python3 run_demo.py
```

打开 `http://127.0.0.1:8765`。

只依赖 Python 3.10+ 标准库，无需 npm/pip。

## 输出

### 3D 打印包

- `01_floor.stl`
- `02_walls.stl`
- `03_furniture.stl`
- `04_semantic_manifest.json`

### 仿真包

- `model.obj`
- `model.mtl`
- `model.sdf`
- `semantic_scene.json`
- `simulation_scene.json`
- `manifest.json`

## 真实设备接口

`config/downstream.json` 默认全部为 `mock`。将对应模块改成 `http`，配置仿真软件网关、3D打印网关和 ROS2 机械臂网关即可。

前端永远不直接连接硬件。总控页面只调用本地 Integration Gateway，硬件协议与品牌差异由后端适配器处理。
