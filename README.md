# Dreamhouse · CIIE 当前实验版本

此分支汇总截至 2026-10-23 的当前运行代码、自然语言户型改造、Pascal 三维、部署配置和实测证据。

- [迁移说明与目录](docs/transfer/CIIE_EXPORT_20261023.md)
- [最新修改与实际测试报告](docs/audit/natural-bedroom-20261023/REPORT.md)
- [代码来源](SOURCE_PROVENANCE.json)

当前 one-option-01 的自然语言新增卧室结构闭环通过；其余八套同项改造仍未通过。完整限制请阅读报告。

---

# Ideal Home / DreamHouse v14

这是一版面向展厅触摸屏和真实 API 联调的 DreamHouse 项目。它保留最初的双入口：

- **住户入口**：一屏一页，居室选择 → Qwen3.8-Flash → Pascal 实时建模 → Qwen-Image-3.0-Pro → BOM → 提交施工。
- **施工方入口**：订单、详细 BOM、数字制造、3D 打印、机械臂任务、现场摄像头/视频联动、MES 阶段。

## Windows 一键配置与启动

从 GitHub 克隆或下载并解压项目后，双击根目录的 `START_DREAMHOUSE.bat`：

1. 首次运行会自动创建本机专用的 `.env.local`。
2. 没有合适的 Node.js 时，会自动下载经过 SHA-256 校验的 Node.js 22 便携运行时。
3. 程序会依据 `package-lock.json` 自动安装完整依赖，包括拓竹视频转码组件。
4. 浏览器会打开 `http://127.0.0.1:3210`，在网页中填写 Qwen、机械臂、拓竹打印机和监听端口配置。
5. 点击“保存并启动”即可运行，后续仍双击同一个文件。

真实密钥和设备访问码只保存在本机 `.env.local`，该文件不会被 Git 提交。首次准备依赖需要联网，完成后无需重复安装。

```powershell
git clone https://github.com/EthanHUOvO/Ideal_home.git
cd Ideal_home
.\START_DREAMHOUSE.bat
```

## 核心链路

```text
一居 / 二居 / 三居
        ↓
自然语言改造需求
        ↓
qwen3.8-flash + Function Calling
        ↓
DreamHouse Layout Tools / Validator
        ↓
Pascal SceneGraph（工程真值）
        ↓
逐条回放工具操作到 Pascal Editor
        ↓
qwen-image-3.0-pro
        ├─ 修改后的二维平面图
        ├─ 整体 45° 轴测效果图
        └─ 每个房间的独立效果图
        ↓
Pascal Geometry Engine 计算工程量
        ↓
qwen3.8-flash 补充材料 / 工艺 / 安装建议
        ↓
Detailed BOM
        ↓
施工方 / MES
```

## 为什么 Pascal 是真值

Qwen Image 只负责视觉图。墙长、面积、房间、门窗、家具节点和 BOM 工程量都来自 Pascal SceneGraph 和 DreamHouse 的确定性几何规则。这样即使效果图出现生成偏差，也不会污染工程数据。

## 手动运行

Windows 下推荐使用上面的一键启动器。它会在浏览器打开 `http://127.0.0.1:3210` 配置中心，可修改本机监听 IPv4、机械臂监控/API/视频地址、现场摄像头地址、拓竹打印机连接信息，以及 Qwen API Key、接口地址和模型。拓竹区域关闭“使用演示打印机”后，程序会使用 `mqtts://打印机IP:8883` 连接真实设备。

点击“保存并启动”后，启动器会先备份 `.env.local`，再应用配置并启动 Next.js。本机监听地址填写 `0.0.0.0` 时，同一局域网内的其它设备可以通过本机实际 IPv4 和端口 `3000` 访问。Qwen API Key 和拓竹访问码留空会保留原值。配置中心还支持导入 `.env`/JSON 和导出当前表单。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

打开：

- 首页：`http://localhost:3000/`
- 住户入口：`http://localhost:3000/customer/`
- 施工方入口：`http://localhost:3000/contractor/`
- API 状态：`http://localhost:3000/api/ai/status`

## API 模式

`.env.local`：

```env
AI_MODE=qwen
QWEN_API_KEY=你的Key
QWEN_COMPAT_BASE_URL=https://你的WorkspaceId.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
QWEN_NATIVE_BASE_URL=https://你的WorkspaceId.cn-beijing.maas.aliyuncs.com/api/v1
QWEN_LAYOUT_MODEL=qwen3.8-flash
QWEN_IMAGE_MODEL=qwen-image-3.0-pro
QWEN_BOM_MODEL=qwen3.8-flash
```

建议：

- **开发联调**：`AI_MODE=qwen`，在线接口失败时直接显示错误，方便定位。
- **现场演示**：`AI_MODE=hybrid`，优先 Qwen，失败后回退到本地 Tool Agent / 预设图片，避免演示中断。
- **纯离线**：`AI_MODE=mock`。

API Key 只在服务端读取，禁止使用 `NEXT_PUBLIC_QWEN_API_KEY`。

## 真实 API 路由

### 1. 布局 / Pascal 建模

`POST /api/ai/layout`

模型：`qwen3.8-flash`

模型通过 Function Calling 调用：

- `get_house_constraints`
- `get_room_geometry`
- `assign_room_function`
- `merge_rooms`
- `split_room`
- `remove_partition_wall`
- `move_partition_wall`
- `add_door`
- `move_door`
- `remove_door`
- `regenerate_furniture`
- `validate_layout`

服务端先在 SceneGraph 临时副本执行并校验，前端再把返回的操作逐条回放到 Pascal Editor，因此用户能看到墙体、房间功能、门和家具依次变化。

### 2. 图像

`POST /api/ai/image`

模型：`qwen-image-3.0-pro`

`mode`：

- `floorplan-edit` (only the selected original floorplan + user prompt)
- `walkthrough-render` (only a Pascal walkthrough screenshot + style prompt)

The dedicated `POST /api/ai/floorplan-image` endpoint enforces the
floorplan-edit contract and rejects Pascal scenes, geometry guides, and
walkthrough screenshots.

使用百炼原生同步接口：

`/api/v1/services/aigc/multimodal-generation/generation`

所有调用都显式 `watermark:false`。

> Qwen Image 返回的结果 URL 是临时地址。项目已预留 OSS 持久化 hook，但默认不会把临时 URL 当成永久工程资产。

### 3. BOM

`POST /api/bom/generate`

- DreamHouse/Pascal 先确定性计算尺寸、数量、面积和 sourceNodeId。
- `qwen3.8-flash` 只补充材料、finish、工艺、安装方法、性能和备注。
- Qwen 不允许修改工程量。

## 触摸屏

住户入口不使用长页面和纵向 scroll-snap。React 只渲染当前一页：

1. 居室选择
2. AI + Pascal 建模
3. 二维平面图
4. 整体 / 分房间渲染
5. BOM / 施工提交

支持底部导航和左右滑动手势；BOM 表格内部允许纵向滚动，但整个住户页面不纵向滚动。

## 现场摄像头

施工端支持环境变量：

```env
NEXT_PUBLIC_SITE_CAMERA_URL=
NEXT_PUBLIC_PRINTER_VIDEO=
NEXT_PUBLIC_ROBOT_VIDEO=
```

当前组件使用浏览器 `<video>`。如果现场是 RTSP，建议用 MediaMTX / go2rtc 转为 HLS 或 WebRTC 后再接入页面。

## 部署

GitHub 仓库保存完整源码、预设模型、静态资源和依赖锁文件，不提交 `node_modules`、构建缓存与私密配置。这个项目包含 Next.js 服务端 API，不能作为 GitHub Pages 静态站点运行；实际服务由一键启动器、Docker、Vercel 或自己的 Node 主机承载。见 `DEPLOY_VERCEL.md`。
