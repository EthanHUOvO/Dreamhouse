import type { ExecutionConnection, ExecutionMode, RobotStatus } from "./types";

type RawState = {
  actual?: { arm?: { positions?: unknown; online?: unknown; updated_at?: unknown; age?: unknown }; gripper?: Record<string, unknown> };
  cameras?: Record<string, Record<string, unknown>>;
  virtual_camera?: { mode?: unknown };
};

export type RobotMonitorStatus = RobotStatus & {
  source: string;
  lastError?: string | null;
  virtualCameraMode?: string | null;
};

const cameraMap = [
  ["sim-rgb", "仿真 · RGB", "sim_right", "rgb"],
  ["sim-depth", "仿真 · 深度", "sim_right", "depth"],
  ["real-rgb", "真实 · RGB", "real_right", "rgb"],
  ["real-depth", "真实双目 · 右视角计算深度", "real_right", "depth"],
] as const;

const REQUEST_TIMEOUT_MS = 2000;
const BACKGROUND_REFRESH_INTERVAL_MS = 2500;

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function frameLive(camera: Record<string, unknown> | undefined, field: string, now = Date.now() / 1000) {
  const frame = camera?.[field];
  const rawUpdated = camera?.[`${field}_updated_at`];
  const updated = typeof rawUpdated === "number"
    ? rawUpdated
    : typeof rawUpdated === "string"
      ? (Number.isFinite(Number(rawUpdated)) ? Number(rawUpdated) : Date.parse(rawUpdated) / 1000)
      : Number.NaN;
  return typeof frame === "string" && frame.startsWith("data:image/") && Number.isFinite(updated) && updated <= now + 1 && now - updated < 3;
}

function timestampToIso(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
  if (typeof value !== "string" || !value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 0 ? new Date(numeric * 1000).toISOString() : null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function emptyStatus(mode: ExecutionMode, source: string, error: string | null = null): RobotMonitorStatus {
  const timestamp = new Date().toISOString();
  const cameras = cameraMap.map(([id, label]) => ({ id, label, status: "离线" as ExecutionConnection, endpoint: `/api/devices/robot/camera/${id}`, updatedAt: null }));
  return {
    mode, connectionStatus: mode === "real" ? "重连中" : "离线", modeName: "待机", taskStatus: mode === "real" ? "异常" : "待机",
    currentTask: "未关联项目任务", jointPositions: [], jointVelocities: [], updatedAt: timestamp,
    tcpPose: { x: null, y: null, z: null, rx: null, ry: null, rz: null }, gripperState: "未知", cycleProgress: null,
    alarmState: error ? "真实设备连接失败" : null, timestamp, streamEndpoints: { camera01: cameras[2].endpoint, camera02: cameras[3].endpoint },
    twinEndpoint: "/api/devices/robot/twin/simulation.html?scene=1", cameras, source, lastError: error, virtualCameraMode: null, controllerConnected: null, emergencyStop: null,
  };
}

class RobotMonitorAdapter {
  private cache: RobotMonitorStatus;
  private lastFetch = 0;
  private inFlight: Promise<RobotMonitorStatus> | null = null;
  private readonly mode: ExecutionMode;
  private readonly baseUrl: string;

  constructor() {
    const configuredMode = process.env.ROBOT_MONITOR_MODE;
    this.mode = configuredMode === "demo" ? "demo" : configuredMode === "real" ? "real" : process.env.ROBOT_MONITOR_BASE_URL ? "real" : "offline";
    this.baseUrl = (process.env.ROBOT_MONITOR_BASE_URL || "").replace(/\/$/, "");
    this.cache = emptyStatus(this.mode, this.baseUrl || "未配置");
  }

  getHealth() {
    return { configured: Boolean(this.baseUrl), connected: this.cache.connectionStatus === "在线", source: this.baseUrl || null, lastUpdate: this.cache.timestamp };
  }

  getCachedStatus() { return this.cache; }

  async getStatus(force = false): Promise<RobotMonitorStatus> {
    if (this.mode !== "real" || !this.baseUrl) return this.cache;
    if (!force) {
      if (Date.now() - this.lastFetch >= BACKGROUND_REFRESH_INTERVAL_MS && !this.inFlight) {
        void this.refreshStatus();
      }
      return this.cache;
    }
    return this.refreshStatus();
  }

  private refreshStatus(): Promise<RobotMonitorStatus> {
    if (this.inFlight) return this.inFlight;
    this.lastFetch = Date.now();
    this.inFlight = this.fetchStatus().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async getCamera(cameraId: string) {
    await this.getStatus();
    const mapping = cameraMap.find(([id]) => id === cameraId);
    if (!mapping) return null;
    const camera = this.cache.cameras?.find((item) => item.id === cameraId);
    const raw = (this.lastRaw?.cameras?.[mapping[2]]?.[mapping[3]]) as unknown;
    return typeof raw === "string" && raw.startsWith("data:image/") && camera?.status === "在线" ? raw : null;
  }

  private lastRaw: RawState | null = null;

  private async fetchStatus(): Promise<RobotMonitorStatus> {
    try {
      const [response, simulationResponse] = await Promise.all([
        fetch(`${this.baseUrl}/api/public/state`, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
        fetch(`${this.baseUrl}/api/sim/camera`, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json() as RawState;
      if (simulationResponse?.ok) {
        const simulation = await simulationResponse.json() as RawState;
        const simulationCamera = simulation.cameras?.sim_right;
        if (simulationCamera) raw.cameras = { ...(raw.cameras || {}), sim_right: simulationCamera };
      }
      this.lastRaw = raw;
      const arm = raw.actual?.arm;
      const positions = Array.isArray(arm?.positions) ? arm.positions.map(numberOrNull).filter((value): value is number => value !== null) : [];
      const gripper = raw.actual?.gripper || {};
      const cameras = cameraMap.map(([id, label, source, field]) => {
        const value = raw.cameras?.[source]?.[field];
        const sourceRecord = raw.cameras?.[source];
        const rawUpdated = sourceRecord?.[`${field}_updated_at`];
        const updatedAt = timestampToIso(rawUpdated);
        const detail = typeof sourceRecord?.side_message === "string" ? sourceRecord.side_message : null;
        return { id, label, status: (frameLive(sourceRecord, field) ? "在线" : "离线") as ExecutionConnection, endpoint: `/api/devices/robot/camera/${id}`, updatedAt, detail };
      });
      const connected = arm?.online === true;
      this.cache = {
        ...this.cache, mode: "real", connectionStatus: connected ? "在线" : "离线", modeName: "待机", taskStatus: connected ? "待机" : "异常",
        currentTask: "未关联项目任务", jointPositions: positions, jointVelocities: [], updatedAt: new Date().toISOString(),
        tcpPose: { x: null, y: null, z: null, rx: null, ry: null, rz: null }, gripperState: gripper.position_valid ? "未知" : "未知", cycleProgress: null,
        alarmState: null, timestamp: new Date().toISOString(), cameras, streamEndpoints: { camera01: cameras[2].endpoint, camera02: cameras[3].endpoint },
        twinEndpoint: "/api/devices/robot/twin/simulation.html?scene=1",
        controllerConnected: connected, emergencyStop: null, lastError: null, virtualCameraMode: typeof raw.virtual_camera?.mode === "string" ? raw.virtual_camera.mode : null,
      };
    } catch (error) {
      this.cache = { ...this.cache, connectionStatus: "离线", taskStatus: "异常", alarmState: "真实设备连接失败", timestamp: new Date().toISOString(), updatedAt: this.cache.updatedAt || null, lastError: error instanceof Error ? error.message : "连接失败" };
    }
    return this.cache;
  }
}

let singleton: RobotMonitorAdapter | undefined;
export function getRobotMonitorAdapter() { singleton ||= new RobotMonitorAdapter(); return singleton; }
