# 户型来源与重新编码说明（v3.1）

本版本不再使用人工随意拼接的矩形户型。三套预设均先从公开网页筛选结构合理的住宅户型，再依据其**功能分区、房间数量、公开面积/尺寸和空间关系**重新编码为本项目的语义几何。

> 重要：安装包**不复制、不再分发来源网站的原始户型图片**。来源图仅作为人工建模参考；本项目保存的是重新绘制后的房间矩形、墙段、家具位置与语义关系。这样既便于 STL/OBJ 生成，也避免把网页图片当成制造数据。

## 二居室 — 80.0 m²

- 参考：Apartment 2, Willow Court, Primrose Gate, Celbridge
- 来源：MyHome.ie / PMC Real Estate
- URL: https://www.myhome.ie/residential/brochure/apartment-2-willow-court-primrose-gate-celbridge-kildare/4987640
- 原公开信息：861 sq.ft（80.0 m²），2 卧、2 卫、客餐厅、厨房、家政/设备空间。
- 本项目保留：双卧分区、主卫/公卫、中央走廊、开放客餐厅与相邻厨房的关系。

## 三居室 — 120.8 m²

- 参考：Thanh Đa View 120.80 m² apartment layout
- 来源：Nhadat24h.net
- URL: https://nhadat24h.net/du-an/can-ho-thanh-da-view-142
- 原公开信息：120.8 m²，3 卧、2 卫、约 24.36 m² 客厅、10.693 m² 厨房、中央走廊和家政阳台。
- 本项目保留：左侧公共区、中部走廊、右侧三卧、双卫和独立厨房的清晰动静分区。

## 四居室 — 178 m²

- 参考：4 Bedroom Apartment Plan
- 来源：RoomSketcher / Home Designs
- URL: https://www.roomsketcher.com/floor-plan-gallery/1564/home-floor-plan-examples/4-bedroom-apartment-plan/
- 原公开信息：1912 sq.ft（178 m²），4 卧、2 卫 + 1 客卫；中央开放式客厅、餐厅和厨房，主卧套间、洗衣房和阳台。
- 本项目保留：四卧围绕中央公共区、主卧套间、客卫/储物/洗衣服务核心和阳台连接关系。

## 为什么仍然是“重新编码”而不是把图片直接拉伸？

普通 JPG/PNG 户型图没有可靠的几何拓扑和语义对象。真正进入制造链，需要明确：

1. 房间语义区域（room_id / semantic_type）；
2. 可拉伸的墙段几何；
3. 门洞产生的墙体断点；
4. 家具所属房间；
5. 房间邻接/门连通图；
6. 统一的米制坐标，用于 STL 与仿真模型共源输出。

因此来源图片负责“合理性参考”，项目 JSON 才是后续 2D→3D、STL、仿真和机械臂链路的权威数据。
