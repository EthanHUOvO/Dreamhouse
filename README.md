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


## v7：居住人数引导式方案选择

设计页不再一次性平铺所有固定方案，而是按照居住需求逐步引导：

1. 先选择居住人数：**单身贵族 / 双人世界 / 三口之家**；
2. 单身贵族继续选择 **男士 / 女士**：
   - 男士：保留电竞房 + 单人书房；
   - 女士：电竞房改衣帽间，但仍保留单人书房；
3. 双人世界直接使用原有 **两人共同居住方案**；
4. 三口之家继续从原有两套方案中选择：
   - **育儿家庭方案**；
   - **育儿 + 保姆方案**。

完成引导后点击 **“生成并应用方案”**，同一个 Scene 会继续进入 Pascal 3D、家具移动/拖拽/旋转、第一人称漫游、Design Version、BOM、生产和施工流程。


## v8：第一人称漫游相机修复

### 上一版为什么会出现“点击进入漫游，但镜头还停在俯视界面”

上一版在 bare `<Viewer>` 中直接挂载了 Pascal Editor 导出的 `FirstPersonControls`，同时项目自身还维护了 `walkthroughMode`，普通展示又长期挂载了 `CameraControls makeDefault`。Pascal 官方的 FirstPersonControls 原本依赖 Editor 自身的 first-person 生命周期；在本项目这种精简 Viewer 宿主里，两套状态/相机生命周期并不完全一致，可能出现 UI 已经切到漫游状态，但真正的 Camera Controller 没有稳定接管相机。

### v8 的处理

- **没有更换 Pascal 3D 渲染器**，房屋、墙、门、窗、家具仍由 Pascal Viewer 渲染。
- 不再把 Editor 内部的 `FirstPersonControls` 直接当作 bare Viewer 的完整模式管理器。
- 新增 `PascalWalkthroughController.tsx`，专门负责当前页面的 first-person Camera 生命周期。
- 点击“进入漫游”后，控制器挂载的第一帧就把**同一个 Pascal Camera**移动到 `spawn_walkthrough`：`[5.15, 1.65, 0.60]`。
- 鼠标 Pointer Lock 只负责“鼠标看方向”，不再承担“进入第一人称”的职责。因此即使用户还没有再次点击 3D Canvas，画面也应该已经位于住宅内部。
- 漫游状态下完全卸载普通 `CameraControls`，避免两套 Camera Controller 抢相机。
- WASD/方向键：行走；Shift：加速；E/R 或鼠标左键：开/关面前的门；Esc：退出。
- 增加轻量平面碰撞：外墙/内墙、关闭的门、家具会阻挡；打开门后对应墙洞允许通过。
- 门的开关只属于漫游体验状态。退出漫游时恢复 Design Scene 中原本的门状态，不会污染 Design Version、BOM 或施工数据。

### 漫游自检

运行：

```bash
npm run test:walkthrough
```

测试会实际检查：

1. 出生点不在墙/家具碰撞区；
2. 从入户门内侧沿走廊可以移动；
3. 主卧门关闭时不能穿墙；
4. 主卧门打开后可以穿过门洞；
5. 面向主卧门时可以正确识别交互门；
6. 页面代码已经移除旧的 `FirstPersonControls + WalkthroughLifecycleBridge` 双状态实现。
