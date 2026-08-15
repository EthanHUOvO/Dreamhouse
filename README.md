# 理想家可变空间智能建造解决方案 — 白板严格执行版

本工程不对白板模块进行扩展或重新解释，页面严格按照白板流程：

```text
1 设计
→ 2 生产
→ 3 库存运输
→ 4 现场施工
→ 5 验收
```

## 1 设计

严格分成三个板块：

```text
对话式交互 | 2D图纸 | 3D展示
```

- 对话式交互：无语音版，输入居住变化需求。
- 2D图纸：同步显示当前设计。
- 3D展示：Pascal Viewer，只展示住宅，不显示 Pascal 工具栏。
- 点击“确认当前设计”后锁定当前版本，并生成生产阶段 BOM。

## 2 生产

严格包含：

```text
BOM清单及排序展示
墙体
家具
状态信息（打印机）
视频
```

- BOM 由确认设计自动生成。
- 地板、墙体进入 3D 打印任务。
- 家具进入采购清单。
- 打印机状态支持内置进度模拟。
- 视频位置支持替换真实打印机视频流。

## 3 库存运输

严格包含：

```text
入库
出库
运输
```

点击构件即可依次推进：

```text
待入库 → 已入库 → 已出库 → 运输中 → 已到场
```

## 4 现场施工

严格包含：

```text
人工
机械臂
状态信息（机械臂）
视频
```

- 人工任务与机械臂任务分开显示。
- 机械臂支持进度模拟。
- 视频位置可替换真实机械臂视频流。

## 5 验收

只有白板要求的“验收”阶段。

只有当：

- 设计已确认；
- 生产完成；
- 构件全部到场；
- 人工和机械臂施工均完成；

才能点击“完成验收”。

---

## 启动

要求 Node.js 22。

```bash
npm install --no-audit --no-fund
npm run check:project
npm run dev
```

打开：

```text
http://localhost:3000
```

Windows 可直接运行：

```text
START_WINDOWS.bat
```

## GitHub Pages 部署

工程已经配置：

```text
output: 'export'
```

并包含：

```text
.github/workflows/deploy-pages.yml
```

将整个工程推到 GitHub 仓库 main 分支后：

```text
GitHub → Settings → Pages → Source → GitHub Actions
```

之后每次 push 会自动：

```text
npm install
→ 项目结构检查
→ next build
→ 发布 out/
```

## Vercel 部署

也可以直接将仓库导入 Vercel。

## Pascal

3D展示部分使用 Pascal Viewer：

- 门窗是 Wall 的子节点；
- 门窗使用正确 wall-local distance；
- Pascal 负责真实门窗开洞和 3D 渲染；
- 中间不显示 Pascal Editor 自己的工具界面。

## 真实设备接口

白板版已经保留视频和状态显示位置，但默认运行 Mock。

以后真实接入时只替换数据来源，不改变白板页面布局：

- 打印机：状态 API + 视频流；
- 机械臂：状态 API + 视频流；
- 3D 展示：继续使用 Pascal Scene。
