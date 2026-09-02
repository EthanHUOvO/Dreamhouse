# 新任务定义

## 输入层：固定户型库

当前阶段不做 AIGC 户型生成。系统内置 `two_bedroom / three_bedroom / four_bedroom` 三套可替换的固定户型。

每套户型不是一张无语义图片，而是结构化场景：

```json
{
  "rooms": [
    {"id":"master","name":"主卧","semantic_type":"bedroom","x":0,"z":0,"w":3.4,"d":4.8}
  ],
  "furniture": [
    {"id":"bed01","room_id":"master","semantic_type":"bed"}
  ],
  "semantic_graph": {
    "edges": [{"from":"living","to":"dining","relation":"connected"}]
  }
}
```

因此所谓“语义理解”不再依赖对图像重新分类，而是由统一数据模型提供：房间类型、房间 ID、家具归属、空间连接关系都可被后续算法直接查询。

## 几何层

二维 `x-z` 平面数据增加 `y/h`，形成 3D 盒体 Mesh。墙高默认 2.8m，底板厚度 0.22m，家具使用各自高度。

## 制造层

逻辑上输出三个制造对象：

- Floor
- Unified Walls
- Furniture

当前原型 STL 为多 shell 合并到同一文件。正式制造前应增加 OpenCascade / Blender / trimesh 的 Boolean Union、manifold repair、最小壁厚和装配公差检查。

## 仿真层

仿真输出与打印输出使用同一个语义项目源，避免两个模型版本不一致。通用输出为 OBJ + Semantic JSON，并附带基础 Gazebo SDF。

Unity / Isaac Sim 可直接导入 OBJ，再通过 `semantic_scene.json` 创建 room tags、碰撞类别或任务区域。
