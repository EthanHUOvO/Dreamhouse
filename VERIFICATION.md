# Dreamhouse Pascal Walkthrough v8 Verification

本版本重点修复“点击进入漫游后仍停留在原俯视/轴测相机”的问题。

验证命令：

```bash
npm run verify
```

验证内容：

- 项目双端结构与 Design Version 连续流程；
- 23+ TS/TSX 源文件语法解析；
- 家具前后左右、旋转、拖动逻辑；
- 设计提交/撤回/再次提交/施工方接受/BOM 同步；
- 引导式家庭方案；
- 第一人称室内出生点；
- 第一人称走廊移动；
- 墙体/家具碰撞；
- 关闭门阻挡；
- 打开门允许通过；
- 面向门的交互目标识别；
- Pascal Viewer 在漫游期间卸载普通 CameraControls；
- 第一人称相机在控制器挂载后立即写入室内 spawn，不依赖 Pointer Lock 才切镜头。

说明：当前执行容器不能稳定访问 npm registry，因此不能重新下载完整 Pascal/Next 依赖做 fresh `next build`。本项目的离线验证脚本与 TypeScript 语法解析均会实际执行；GitHub Actions 仍设置为 build 成功后才部署。
