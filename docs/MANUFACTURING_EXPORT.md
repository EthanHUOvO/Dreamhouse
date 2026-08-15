# 制造导出

Pascal 原生完整场景导出：STL / OBJ / GLB。

最终项目建议增加 `ManufacturingExportPlugin`：

```text
slab → floor group → 01_floor.stl
wall → walls group → 02_walls.stl
item → furniture group → 03_furniture.stl
```

真实打印之前还需要：

1. Boolean Union
2. Manifold Repair
3. 最小壁厚检查
4. 比例缩放（例如 1:50）
5. 打印平台排版
6. CuraEngine / PrusaSlicer
7. G-code 下发
