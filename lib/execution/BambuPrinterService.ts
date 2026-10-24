import mqtt, { type MqttClient } from "mqtt";
import type { ExecutionConnection, PrinterStatus } from "./types";

type BambuConfig = { ip: string; accessCode: string; model?: string; deviceId?: string };
type Listener = (status: PrinterStatus) => void;

const emptyStatus = (mode: PrinterStatus["mode"], connectionStatus: ExecutionConnection): PrinterStatus => ({
  mode, connectionStatus, printStatus: "待机", currentTask: "暂无数据", progress: 0,
  cameraStatus: "离线", streamEndpoint: "/api/devices/bambu/video",
});

function text(value: unknown) { return typeof value === "string" ? value : undefined; }
function number(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizePrintState(value: unknown): PrinterStatus["printStatus"] {
  const state = String(value || "").toLowerCase();
  if (["running", "prepare", "slicing", "printing"].some((x) => state.includes(x))) return "打印中";
  if (["pause", "paused"].some((x) => state.includes(x))) return "暂停";
  if (["finish", "finished", "success"].some((x) => state.includes(x))) return "已完成";
  if (["failed", "error", "offline", "aborted"].some((x) => state.includes(x))) return "异常";
  return "待机";
}

function parseReport(payload: any, previous: PrinterStatus): PrinterStatus {
  const print = payload?.print || payload?.report?.print || payload;
  const state = normalizePrintState(print?.gcode_state || print?.print_state || print?.state);
  const progress = number(print?.mc_percent ?? print?.percent);
  const remaining = number(print?.mc_remaining_time ?? print?.remaining_time);
  const amsTray = payload?.ams?.ams?.[0]?.tray?.[0] || payload?.ams?.tray || payload?.print?.tray;
  return {
    ...previous,
    mode: "real",
    connectionStatus: "在线",
    printStatus: state,
    currentTask: text(print?.subtask_name || print?.task_name || print?.gcode_file) || previous.currentTask,
    progress: progress === undefined ? previous.progress : Math.max(0, Math.min(100, progress)),
    remainingMinutes: remaining === undefined ? previous.remainingMinutes : Math.ceil(Math.max(0, remaining) / 60),
    currentLayer: number(print?.layer_num ?? print?.current_layer),
    totalLayers: number(print?.total_layer_num ?? print?.total_layers),
    nozzleCurrentTemperature: number(print?.nozzle_temper ?? print?.nozzle_temperature),
    nozzleTargetTemperature: number(print?.nozzle_target_temper ?? print?.nozzle_target_temperature),
    bedCurrentTemperature: number(print?.bed_temper ?? print?.bed_temperature),
    bedTargetTemperature: number(print?.bed_target_temper ?? print?.bed_target_temperature),
    material: text(amsTray?.tray_type || amsTray?.filament_type || print?.filament_type),
    materialRemaining: number(amsTray?.remain ?? amsTray?.remaining),
    updatedAt: new Date().toISOString(),
  };
}

class BambuPrinterService {
  private client: MqttClient | null = null;
  private connecting = false;
  private listeners = new Set<Listener>();
  private serial = "";
  private model = "";
  private firmware = "";
  private status: PrinterStatus;
  private readonly config: BambuConfig;
  private readonly mode: PrinterStatus["mode"];

  constructor(config: BambuConfig, mode: PrinterStatus["mode"]) {
    this.config = config;
    this.mode = mode;
    this.status = emptyStatus(mode, mode === "real" ? "重连中" : "离线");
    // The H2C camera uses an independent RTSP channel. MQTT may be delayed or
    // unavailable while the camera stream is already reachable.
    if (mode === "real" && config.ip && config.accessCode) {
      this.status = { ...this.status, cameraStatus: "在线" };
    }
    this.connect();
  }

  private connect() {
    if (this.mode !== "real" || this.connecting || this.client || !this.config.ip || !this.config.accessCode) return;
    this.connecting = true;
    const clientId = `dreamhouse-bambu-monitor-${Math.random().toString(36).slice(2, 10)}`;
    const client = mqtt.connect(`mqtts://${this.config.ip}:8883`, {
      clientId, username: "bblp", password: this.config.accessCode,
      rejectUnauthorized: false, reconnectPeriod: 5000, connectTimeout: 5000,
    });
    this.client = client;
    client.on("connect", () => {
      this.connecting = false;
      this.status = { ...this.status, mode: "real", connectionStatus: "在线", cameraStatus: "在线", streamEndpoint: "/api/devices/bambu/video", updatedAt: new Date().toISOString() };
      this.emit();
      client.subscribe("device/+/report", (error) => {
        if (error) this.markOffline("重连中");
      });
      console.info("[Bambu] connected", { printerIp: this.config.ip });
    });
    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        const serial = topic.match(/^device\/([^/]+)\/report$/)?.[1];
        if (serial) this.serial = serial;
        const info = payload?.info || payload?.system || {};
        this.model = text(info.model || payload?.model) || this.model || this.config.model || "";
        this.firmware = text(info.version || info.firmware || payload?.firmware) || this.firmware;
        this.status = parseReport(payload, this.status);
        this.emit();
      } catch { /* Ignore malformed device messages. */ }
    });
    const disconnected = () => { this.connecting = false; this.client = null; this.markOffline("重连中"); };
    client.on("error", disconnected);
    client.on("close", disconnected);
  }

  private markOffline(connectionStatus: ExecutionConnection) {
    this.status = { ...this.status, mode: "real", connectionStatus, printStatus: "异常", cameraStatus: this.config.ip && this.config.accessCode ? "在线" : "离线", streamEndpoint: "/api/devices/bambu/video", updatedAt: new Date().toISOString() };
    this.emit();
    if (!this.client) setTimeout(() => this.connect(), 5000);
  }
  private emit() { for (const listener of this.listeners) listener(this.status); }
  getStatus(taskName?: string) {
    this.connect();
    if (this.mode === "demo") return Promise.resolve({ ...emptyStatus("demo", "在线"), printStatus: "打印中", currentTask: taskName || "演示打印任务", progress: 0 });
    if (this.mode === "offline") return Promise.resolve(emptyStatus("offline", "离线"));
    return Promise.resolve({ ...this.status, currentTask: this.status.currentTask === "暂无数据" && taskName ? taskName : this.status.currentTask });
  }
  getHealth() { return { configured: Boolean(this.config.ip && this.config.accessCode), connected: this.status.connectionStatus === "在线", printerModel: this.model || null, state: this.status.printStatus, lastUpdate: this.status.updatedAt || null, firmware: this.firmware || null }; }
  subscribe(listener: Listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

let singleton: BambuPrinterService | undefined;
export function getBambuPrinterService() {
  if (!singleton) {
    const demo = process.env.DEMO_PRINTER_MODE === "true";
    singleton = new BambuPrinterService({ ip: process.env.BAMBU_PRINTER_IP || "", accessCode: process.env.BAMBU_ACCESS_CODE || "", model: process.env.BAMBU_MODEL, deviceId: process.env.BAMBU_DEVICE_ID }, demo ? "demo" : process.env.BAMBU_PRINTER_IP ? "real" : "offline");
  }
  return singleton;
}
