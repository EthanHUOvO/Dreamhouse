import type { ExecutionMode, PrinterStatus } from "./types";
import { getBambuPrinterService } from "./BambuPrinterService";

export type BambuPrinterConfig = {
  printerIp: string;
  deviceId: string;
  accessCode: string;
  model: string;
};

export interface BambuPrinterAdapter {
  readonly mode: ExecutionMode;
  getStatus(taskName?: string): Promise<PrinterStatus>;
}

export class ServerBambuPrinterAdapter implements BambuPrinterAdapter {
  readonly mode: ExecutionMode;
  private readonly config: BambuPrinterConfig;

  constructor(config: BambuPrinterConfig, mode: ExecutionMode) {
    this.config = config;
    this.mode = mode;
  }

  async getStatus(taskName = "等待预算施工项目") : Promise<PrinterStatus> {
    if (this.mode === "demo") {
      const cameraOnline = process.env.DEMO_CAMERA_MODE === "true";
      const progress = Math.floor((Date.now() / 1200) % 101);
      return {
        mode: "demo",
        connectionStatus: "在线",
        printStatus: progress >= 100 ? "已完成" : "打印中",
        currentTask: taskName,
        progress,
        remainingMinutes: Math.max(0, Math.ceil((100 - progress) * 0.8)),
        currentLayer: Math.max(1, Math.round(progress * 1.2)),
        totalLayers: 120,
        nozzleCurrentTemperature: 218,
        nozzleTargetTemperature: 220,
        bedCurrentTemperature: 58,
        bedTargetTemperature: 60,
        material: "PLA+（演示材料）",
        materialRemaining: Math.max(0, 100 - Math.round(progress * 0.5)),
        cameraStatus: cameraOnline ? "在线" : "离线",
        streamEndpoint: "/api/devices/bambu/video",
      };
    }
    if (this.mode === "offline" || !this.config.printerIp || !this.config.accessCode) {
      return { mode: "offline", connectionStatus: "离线", printStatus: "待机", currentTask: "暂无数据", progress: 0, cameraStatus: "离线", streamEndpoint: "/api/devices/bambu/video" };
    }
    return getBambuPrinterService().getStatus(taskName);
  }
}

export function createBambuPrinterAdapter(): BambuPrinterAdapter {
  const demo = process.env.DEMO_PRINTER_MODE === "true";
  const config = { printerIp: process.env.BAMBU_PRINTER_IP || "", deviceId: process.env.BAMBU_DEVICE_ID || "", accessCode: process.env.BAMBU_ACCESS_CODE || "", model: process.env.BAMBU_MODEL || "" };
  return new ServerBambuPrinterAdapter(config, demo ? "demo" : config.printerIp ? "real" : "offline");
}
