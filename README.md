# DreamHouse v10 Preset Demo v1

这是基于此前 DreamHouse v10 视觉语言单独制作的一版“预设户型升级演示”，不会覆盖现有版本。

## 当前已实现

- 首页直接进入预设演示，不调用任何外部 API。
- 顶部导览：一居 / 两居 / 三居。
- 预设按键：
  - 01 增加一个卧室：完整可用。
  - 02 主卧增加一个卫生间：Prompt 已配置，结果素材待补。
  - 03 同时增加卧室 + 主卫：功能预留。
- 点击按键后加载对应 Prompt 样板，用户可编辑文本。
- “增加一个卧室”点击生成后：
  - 保留原始两居户型图；
  - 显示两张二维结果图切换；
  - 显示三维渲染图；
  - 展开对应 BOM 与预算。
- BOM 直接来自用户提供的两份 Excel，并保留 Excel 下载入口。

## BOM 页面包含

1. PC构件BOM
2. 连接材料及辅材
3. 构件汇总
4. 全屋BOM明细
5. 预算汇总

## 素材对应

- `public/preset/initial-two-bedroom.png`：原始户型图。
- `public/preset/generated-plan-01.png`：二维结果 01。
- `public/preset/generated-plan-02.png`：二维结果 02。
- `public/preset/generated-render.png`：最终渲染图。

注意：当前提供的二维结果 01 和 02 原始文件像素内容完全一致。切换功能已经实现，但视觉上不会产生差异；以后只需要替换 `generated-plan-02.png` 即可。

## 本地运行

```bash
npm install
npm run verify
npm run dev
```

访问 `http://localhost:3000`。

## GitHub Pages 部署

本版本为纯静态站点，已经保留 `.github/workflows/deploy-pages.yml`。将项目推送到 GitHub `main` 分支，并在仓库 Settings → Pages 中选择 GitHub Actions 即可。

## 后续 API 接入位置

当前点击“生成方案”只是本地预设切换。后续接 API 时，只需要将 `runPreset()` 中的本地定时逻辑替换成后端请求，并保持页面结果数据结构不变即可，无需重新设计页面。
