import type { ExecutionMode, RobotStatus } from "./types";

export type RobotConfig = { endpoint: string; accessToken: string; model: string };

export interface RobotAdapter {
  readonly mode: ExecutionMode;
  getStatus(taskName?: string): Promise<RobotStatus>;
}

export class ServerRobotAdapter implements RobotAdapter {
  constructor(private readonly config: RobotConfig, readonly mode: ExecutionMode) {}

  async getStatus(taskName = "等待预算施工项目"): Promise<RobotStatus> {
    if (this.mode === "demo") {
      const tick = Date.now() / 900;
      const joints = [Math.sin(tick) * 35, 28 + Math.sin(tick * .7) * 16, -42 + Math.cos(tick * .8) * 12, Math.sin(tick * .55) * 55, 62 + Math.cos(tick * .6) * 10, Math.sin(tick * .45) * 75].map((value) => Number(value.toFixed(1)));
      return { mode: "demo", connectionStatus: "在线", modeName: "自动运行", taskStatus: "运行中", currentTask: taskName, jointPositions: joints, jointVelocities: joints.map((value) => Number((Math.abs(value) / 10).toFixed(1))), tcpPose: { x: 1.24, y: .82, z: 1.06, rx: 180, ry: 0, rz: 92 }, gripperState: "动作中", cycleProgress: Math.floor((Date.now() / 1500) % 101), alarmState: "无告警", timestamp: new Date().toISOString(), streamEndpoints: { camera01: "/api/execution/camera/camera01", camera02: "/api/execution/camera/camera02" } };
    }
    if (this.mode === "offline" || !this.config.endpoint || !this.config.accessToken) {
      return { mode: "offline", connectionStatus: "离线", modeName: "待机", taskStatus: "待机", currentTask: "暂无数据", jointPositions: [], jointVelocities: [], tcpPose: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }, gripperState: "未知", cycleProgress: 0, alarmState: "暂无数据", timestamp: new Date().toISOString(), streamEndpoints: { camera01: "/api/execution/camera/camera01", camera02: "/api/execution/camera/camera02" } };
    }
    return { mode: "real", connectionStatus: "重连中", modeName: "待机", taskStatus: "异常", currentTask: "真实设备协议待接入", jointPositions: [], jointVelocities: [], tcpPose: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }, gripperState: "未知", cycleProgress: 0, alarmState: "实时接口待接入", timestamp: new Date().toISOString(), streamEndpoints: { camera01: "/api/execution/camera/camera01", camera02: "/api/execution/camera/camera02" } };
  }
}

export function createRobotAdapter(): RobotAdapter {
  const demo = process.env.DEMO_ROBOT_MODE === "true";
  const config = { endpoint: process.env.ROBOT_API_ENDPOINT || "", accessToken: process.env.ROBOT_ACCESS_TOKEN || "", model: process.env.ROBOT_MODEL || "" };
  return new ServerRobotAdapter(config, demo ? "demo" : config.endpoint ? "real" : "offline");
}
