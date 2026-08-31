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

## 本机连接拓竹打印机

项目提供一个本机局域网桥接服务，通过拓竹 LAN MQTT 读取打印状态并发送开始、暂停、继续、停止命令。复制 `.env.example` 为 `.env.local`，填写打印机 IP、访问码；序列号可自动发现，也可手动填写。要使用“开始”按钮，请填写打印机存储卡内的模型文件名 `BAMBU_MODEL_FILE`，再在另一个终端运行：

```bash
npm run bambu-api
```

然后访问 `http://localhost:3000`。摄像头请填写 `BAMBU_CAMERA_URL`；拓竹常见输出是 RTSP/RTSPS，浏览器本身不能直接播放 RTSP，需使用支持 RTSP 的播放器或额外转码为 HLS/WebRTC。

### 切换 H2C

桥接服务已预留 H2C 配置。填写 `BAMBU_H2C_PRINTER_IP`、`BAMBU_H2C_ACCESS_CODE`、`BAMBU_H2C_SERIAL`、`BAMBU_H2C_CAMERA_URL` 和 `BAMBU_H2C_MODEL_FILE` 后，将 `BAMBU_PRINTER_MODEL` 设为 `H2C`，再重启 `npm run bambu-api`。页面和本机接口仍使用同一组 `/api/bambu/*` 路径；H2C 的摄像头、供料及专有功能字段应以其固件实际 MQTT 报告为准。

## 验证

```bash
node scripts/verify.mjs
```

本机运行时会启用拓竹桥接；未配置环境变量时页面仍可作为静态预设演示使用。GitHub Pages 构建由 GitHub Actions 自动切换为静态导出，桥接服务和打印机凭据不会上传。

## 上传 GitHub 所需信息

代码可以上传 GitHub。需要准备仓库地址（如 `用户名/仓库名`）以及 GitHub 登录方式（SSH key 或 Personal Access Token）。不要提交 `.env.local`、打印机访问码、序列号或局域网 IP；这些只放在本机环境变量中。若部署到 GitHub Pages，只能展示预设页面，无法从 GitHub Pages 直接访问你家里的局域网打印机。
