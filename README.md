# Dreamhouse Pascal Continuous Flow v4

本版本继续使用 Pascal Viewer / Pascal Scene 作为住宅 3D 模型，不替换现有 3D 渲染。

## 这版解决的问题

上一版中，“应用当前固定方案”本质上只修改设计数据，没有把“保存”和“下一阶段”明确拆开，所以用户容易认为点击后没有反应；设计变更提交以后，施工方接受也没有真正重新生成后续 BOM / 生产 / 施工数据。

v4 将流程明确为：

```text
固定方案
  ↓ 应用并保存
Design Vn Draft
  ↓ 家具点击 / 拖动 / 旋转（自动保存）
完成设计
  ↓
初始设计：确认设计并进入生产
施工中改版：提交设计变更
  ↓
施工方接受 Design Vn
  ↓
自动升级为 Approved
  ↓
根据同一份 Pascal Scene 重新生成 BOM
  ↓
3D 打印 / 生产
  ↓
运输
  ↓
机械臂 / 人工施工
  ↓
验收
```

## 住户端如何保存

不再需要单独的“保存家具”按钮：

- 点击“应用并保存当前方案”：方案立即在 2D / Pascal 3D 中显示，同时保存到当前 Design Version。
- 点击方向键移动家具：自动保存。
- 直接拖动家具：松开鼠标时自动保存。
- 左转 / 右转家具：自动保存。
- 页面顶部“保存状态”会告诉用户最近一次保存结果。

## 如何进入后续流程

### 还处于设计阶段

点击“确认设计并进入生产”。当前 Design Version 会冻结为批准版本，并自动生成 BOM、打印任务、人工任务、机械臂任务，订单进入生产阶段。

### 已经生产 / 施工后重新设计

1. 点击“重新设计”，创建新的 Design Draft。
2. 应用固定方案和调整家具，所有修改自动保存在 Draft 中。
3. 点击“提交设计变更”。此时 Draft 被锁定，旧 Approved 版本仍然是施工依据。
4. 进入施工方端，订单会显示“收到设计变更”。
5. 点击“接受并同步后续”。Draft 升级为新的 Approved Version。
6. 系统从新版本的 Pascal Scene 重新统计墙体和家具数量，重新生成 BOM，并把生产/施工任务关联到新 Design Version。

## 双端同步

住户端和施工方端共用同一个 localStorage Order Store；v4 还增加了 `storage`、页面 focus 和自定义更新事件监听。在同一域名下打开两个标签页时，施工方接受变更后，住户端重新聚焦即可读取最新订单状态。

正式部署到多设备时，将 `lib/order-store.ts` 替换为后端数据库/API 即可，业务流程和页面接口可以保持不变。

## 验证

```bash
npm run verify
```

验证包括：项目结构、TS/TSX 语法、Pascal 家具移动/旋转/拖动逻辑，以及完整的：

`Approved V2 → Draft V3 → 保存方案/家具 → Submitted → Contractor Accepted → Approved V3 → BOM 重建 → Production`

## 本地启动

```bash
npm install --no-audit --no-fund
npm run verify
npm run dev
```

住户端：`/customer/`

施工方端：`/contractor/`
