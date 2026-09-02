# DreamHouse TouchFlow v13

这是一个面向触摸屏 / 大屏演示的 DreamHouse 新版项目，保留“住户入口 + 施工入口”的双入口结构，并将住户端改造成“像 PPT 一样一页一页展示”的触摸滑动式交互页面。

## 本版已完成的内容

- 首页保留两个入口：住户入口、施工入口
- 住户入口改成 5 个全屏触摸滑动页面：
  1. 选择居室类型（一居室 / 二居室 / 三居室）
  2. 输入改造需求与提示词
  3. 生成并展示调整后的平面图
  4. 生成整体渲染图与分房间渲染图
  5. 生成 BOM 清单、打印、提交到施工端
- 施工入口可读取住户端提交的订单
- 施工端展示：最终平面、渲染、BOM、现场摄像头占位区、施工阶段状态
- 已预留 Qwen 文本模型 / Qwen Image 的 API 路由
- 未配置 API 时自动回退到本地模板 mock 结果，适合现场稳定演示

## 启动方式

```bash
npm install
npm run dev
```

打开：

- 首页：`http://localhost:3000/`
- 住户端：`http://localhost:3000/customer`
- 施工端：`http://localhost:3000/contractor`

## Qwen API 环境变量（可选）

在项目根目录新建 `.env.local`：

```bash
QWEN_API_KEY=你的APIKey
QWEN_COMPAT_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen-plus
QWEN_IMAGE_MODEL=qwen-image
```

说明：
- 若不配置 `QWEN_API_KEY`，系统默认使用本地 mock 结果。
- 已在 `app/api/layout/route.ts`、`app/api/image/route.ts`、`app/api/bom/route.ts` 中预留接口。

## 触摸屏交互说明

住户端采用：
- 全屏分页布局
- 纵向 `scroll-snap`，支持触摸滑动逐页浏览
- 同时保留“上一页 / 下一页”按钮，便于鼠标或普通浏览器演示

## 订单联动逻辑

- 在住户端最后一页点击“提交到施工端”
- 当前设计结果会写入浏览器 `localStorage`
- 施工端会自动读取该订单并展示

这是一套前端联调方案，便于你后续再替换成数据库或后端存储。
