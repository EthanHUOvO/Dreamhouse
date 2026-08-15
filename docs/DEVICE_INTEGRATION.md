# 仿真 / 打印 / 机械臂

统一建议外部服务提供：

```http
GET /status
```

返回：

```json
{"status":"running","progress":0.72,"currentTask":"wall_print"}
```

第一阶段可将录像放到：

- `public/videos/simulation-demo.mp4`
- `public/videos/printer-demo.mp4`
- `public/videos/robot-demo.mp4`

后续替换成 HLS/WebRTC/设备网关。

打印机建议：Web → Printer Gateway → Slicer → OctoPrint/Moonraker/Vendor API。

机械臂建议：Web → Robot Gateway → ROS2 → MoveIt 2 → Controller。
