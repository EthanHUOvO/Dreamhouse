# Verification

目标：验证这一版仅使用本地预设资源，且用户提供的 BOM 数据完整进入网页。

已检查：

- 4 张页面结果图片存在；
- 2 份原始 Excel 被保留在 `public/bom/`；
- PC BOM 数据行：41；
- 连接材料及辅材：12；
- 构件汇总：17；
- 全屋 BOM：42；
- 预算汇总：7；
- 按键 1 / 2 / 3 与 Prompt 样板存在；
- 按键 1 生成结果、渲染图和 BOM 展开逻辑存在；
- 页面代码不包含 `/api/` 调用；
- GitHub Pages 静态导出配置存在。

运行：

```bash
npm run verify
```
