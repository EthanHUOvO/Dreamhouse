# lib/ai/local-model3d-agent.ts:121

- 步骤：step3
- 文件：`lib/ai/local-model3d-agent.ts`
- 行号：121
- 变量/位置：`openings`
- 类型：template 字符串
- 字数：334

> 几何识别 → Pascal 3D（墙/房间/门窗/坐标/单位）

## 实际提示词（逐字）

```text
\n现场重建要求：图纸尺寸线上的整数通常是毫米，必须除以1000变为米；带㎡/m2的数字是房间面积，绝不能作为边长。读取并核对顶部/底部/侧面的尺寸链总长，保留外轮廓凹口。room.expectedArea采用原图标注的面积；没有标注才使用polygon面积。客餐厅包含入户走道，应使用完整凹多边形；不得留下门通向未分配空间。识别入户门、阳台门以及全部房门；窗不能代替门。墙跨多个房间时在房间边界切段，门引用具体的局部墙段。门窗不能互相重叠。房间semantic只能使用bathroom、kitchen、master_bedroom、bedroom、living_room、balcony、study、dining_room、storage。不得增加原图不存在的房间。
```
