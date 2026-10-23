export type ExecutionMode = "demo" | "real" | "offline";
export type ExecutionConnection = "在线" | "离线" | "重连中";
export type ExecutionTaskStatus = "已完成" | "进行中" | "待执行" | "异常" | "暂停";

export type ExecutionTask = {
  id: string;
  name: string;
  budgetItemId: string;
  budgetItemName: string;
  taskType: "制造" | "搬运" | "安装" | "现场施工";
  device: "3D打印机" | "机械臂" | "现场施工" | "待分配";
  status: ExecutionTaskStatus;
  startTime?: string;
  expectedEndTime?: string;
  actualEndTime?: string;
  progress: number;
  prerequisiteIds: string[];
  exception?: string;
};

export type PrinterStatus = {
  mode: ExecutionMode;
  connectionStatus: ExecutionConnection;
  printStatus: "待机" | "打印中" | "已完成" | "暂停" | "异常";
  currentTask: string;
  progress: number;
  remainingMinutes?: number;
  currentLayer?: number;
  totalLayers?: number;
  nozzleCurrentTemperature?: number;
  nozzleTargetTemperature?: number;
  bedCurrentTemperature?: number;
  bedTargetTemperature?: number;
  material?: string;
  materialRemaining?: number;
  cameraStatus: ExecutionConnection;
  streamEndpoint: string;
  updatedAt?: string;
  printerModel?: string;
};

export type RobotStatus = {
  mode: ExecutionMode;
  connectionStatus: ExecutionConnection;
  modeName: "待机" | "自动运行" | "手动" | "暂停" | "异常";
  taskStatus: "待机" | "运行中" | "已完成" | "暂停" | "异常";
  currentTask: string;
  jointPositions: number[];
  jointVelocities: number[];
  tcpPose: { x: number | null; y: number | null; z: number | null; rx: number | null; ry: number | null; rz: number | null };
  gripperState: "打开" | "闭合" | "动作中" | "未知";
  cycleProgress: number | null;
  alarmState: string | null;
  timestamp: string;
  updatedAt?: string | null;
  streamEndpoints: { camera01: string; camera02: string };
  twinEndpoint?: string;
  printerModel?: string | null;
  cameras?: Array<{ id: string; label: string; status: ExecutionConnection; endpoint: string; updatedAt?: string | null; detail?: string | null }>;
  emergencyStop?: string | null;
  controllerConnected?: boolean | null;
};

export type ExecutionStage = {
  id: string;
  name: string;
  status: "已完成" | "进行中" | "待执行" | "异常";
  progress: number;
};

export type ExecutionEvent = {
  id: string;
  time: string;
  event: string;
  device: string;
  task: string;
  status: "正常" | "等待" | "暂停" | "异常" | "离线";
  type: "全部" | "3D打印" | "机械臂" | "施工" | "异常";
};

export type ExecutionSnapshot = {
  generatedAt: string;
  projectMode: ExecutionMode;
  stages: ExecutionStage[];
  currentStage: string;
  currentTask: string;
  progress: number;
  estimatedCompletion: string;
  completedTasks: number;
  pendingTasks: number;
  exceptionCount: number;
  printer: PrinterStatus;
  robot: RobotStatus;
  cameras: {
    camera01: { status: ExecutionConnection; endpoint: string; label: string };
    camera02: { status: ExecutionConnection; endpoint: string; label: string };
    camera03?: { status: ExecutionConnection; endpoint: string; label: string };
    camera04?: { status: ExecutionConnection; endpoint: string; label: string };
  };
  events: ExecutionEvent[];
};
