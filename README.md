# Dreamhouse Pascal Walkthrough + Interactive Doors v6

本版本继续基于现有 **Pascal Viewer / Pascal SceneGraph**，保留此前已经完成的：固定方案、2D 图纸、Pascal 3D、家具点击/拖动/方向微调/旋转、Design Version、施工阶段重新设计、施工方接受变更、BOM / 生产 / 施工连续同步。

v6 新增的是同一份住宅 Scene 上的 **第一人称游戏式漫游**，没有替换现有 3D 渲染模型。

## 3D 页面现在有三种模式

### 1. 普通 3D 查看

- 保持原 Pascal 俯视 / 轴测展示；
- 可以正常旋转、缩放模型；
- 家具不能误拖动；
- 门保持正常建筑模型显示。

### 2. 调整家具

点击 **“调整家具”** 后：

- 点击家具，家具旁出现前 / 后 / 左 / 右控制；
- 左转 / 右转；
- 直接按住家具拖动；
- 家具高度固定；
- 修改自动保存到当前 Design Version。

### 3. 第一人称漫游

点击 **“进入漫游”** 后：

- 自动切换到 Pascal 第一人称相机；
- 出生点位于东侧入户门内侧；
- WASD / 方向键行走；
- 鼠标转动视角；
- Shift 加速；
- 墙体、家具和门参与碰撞；
- 靠近门并把屏幕准星对准门后，**鼠标左键或 E** 可开 / 关门；
- Pascal 支持的可开启窗也可用相同方式交互；
- Esc 退出漫游并返回原来的俯视 3D 模型。

进入漫游时家具编辑会自动关闭，避免“拖家具”和“控制人物”两套交互冲突。

## 门的行为

基础场景中的室内门改为关闭状态开始。漫游过程中的门开启 / 关闭属于 **体验运行时状态**：

- 开门会真实改变 Pascal 门扇动画和第一人称碰撞；
- 门完全打开后可通过门洞；
- 再次交互可关闭；
- 退出漫游后不把“门当前开着还是关着”写入 Design Version，因为这是体验状态，不是户型设计修改。

家具位置、旋转、户型方案仍然按原流程保存到 Design Version。

## 与设计版本 / 后续施工的关系

```text
固定方案
  ↓
家具调整
  ↓ 自动保存
第一人称漫游验证空间
  ↓
发现不合理 → 退出漫游 → 再调家具
  ↓
确认 / 提交 Design Vn
  ↓
施工方接受
  ↓
重新生成 BOM
  ↓
生产 / 运输 / 施工 / 验收
```

施工阶段仍可以：

- 重新设计；
- 继续已有 Draft；
- 撤回尚未接受的提交并继续修改；
- Design V2 → V3 → V4 → V5 ... 持续迭代。

验收页面的批准模型也增加了 **“进入漫游”**，可以从最终居住视角检查空间。

## 操作说明

```text
W / ↑        前进
S / ↓        后退
A / ←        左移
D / →        右移
鼠标          转动视角
Shift         加速
左键 / E / R  开关当前对准的门或可操作窗
T             关闭当前对准的门或窗
Esc           退出漫游
```

第一次进入时，点击 3D 画面后浏览器会进入 Pointer Lock（游戏式鼠标控制）。

## 本地运行

```bash
npm install --no-audit --no-fund
npm run verify
npm run dev
```

住户端：`/customer/`

施工方端：`/contractor/`

## GitHub Pages

项目保留 `.github/workflows/deploy-pages.yml`：

```text
npm install
→ npm run verify
→ npm run build
→ build 成功后部署 out/
```

## 验证

```bash
npm run verify
```

v6 新增 `test:walkthrough`，会检查：

- 漫游出生点；
- 5 个基础门是否是可交互的 hinged door；
- 门初始关闭；
- Pascal `FirstPersonControls` 是否接入；
- `InteractiveSystem` 是否接入；
- walkthrough wall mode / pointer lock / 60 FPS 配置；
- 住户端“进入漫游 / 退出漫游”控制；
- 原有家具编辑、Design Version、BOM 同步、施工阶段反复重新设计测试仍全部通过。

详细结果见 `VERIFICATION.md`。

## 数据缓存说明

v6 使用新的 localStorage key：

`dreamhouse.pascal.walkthrough.orders.v6`

因此部署后会生成包含漫游出生点的新演示订单，避免旧版本浏览器缓存继续加载不含 spawn 节点的历史 Scene。
