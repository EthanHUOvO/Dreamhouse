# DreamHouse V10 Preset Demo · One-bedroom two-presets edition

本版本基于上一版 `DreamHouse_v10_PresetDemo_OneBed_Bath_v2` 继续扩展，重点完成：

- 保留原有“两居 → 三居”演示；
- 保留原有“一居 → 增加卫生间（按键02）”演示；
- 新增“一居 → 增加一个卧室（按键01）”完整演示；
- 一居案例现在共支持两套预设：
  - 按键01：增加一个卧室 → 目标格局 `2室1厅2卫1厨`
  - 按键02：增加一个卫生间 → 目标格局 `1室1厅2卫1厨`
- 两个按键均支持：
  - Prompt 示例
  - 原始户型对比
  - 3 套二维方案切换
  - 3 套渲染图切换
  - 3 份 BOM 展示与下载

## 运行

```bash
npm install
npm run dev
```

## 验证

```bash
node scripts/verify.mjs
```

本版本仍为**静态预设演示版**，未接入任何外部 API。
