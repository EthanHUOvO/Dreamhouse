"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResidentialBudget } from "@/lib/bom/residential";
import { createExecutionTasks } from "@/lib/execution/tasks";
import type { ExecutionEvent, ExecutionMode, ExecutionSnapshot, ExecutionTask, RobotStatus } from "@/lib/execution/types";

type MonitorTab = "overview" | "printer" | "robot" | "records";

const TABS: Array<{ id: MonitorTab; label: string }> = [
  { id: "overview", label: "项目总览" },
  { id: "printer", label: "3D打印" },
  { id: "robot", label: "机械臂" },
  { id: "records", label: "施工记录" },
];

const EMPTY_SNAPSHOT: ExecutionSnapshot = {
  generatedAt: "",
  projectMode: "offline",
  stages: [
    { id: "design", name: "方案确认", status: "待执行", progress: 0 },
    { id: "materials", name: "材料准备", status: "待执行", progress: 0 },
    { id: "printing", name: "3D打印", status: "待执行", progress: 0 },
    { id: "robot", name: "机械臂作业", status: "待执行", progress: 0 },
    { id: "construction", name: "现场施工", status: "待执行", progress: 0 },
    { id: "acceptance", name: "完工验收", status: "待执行", progress: 0 },
  ],
  currentStage: "暂无数据", currentTask: "暂无施工任务", progress: 0,
  estimatedCompletion: "暂无数据", completedTasks: 0, pendingTasks: 0, exceptionCount: 0,
  printer: { mode: "offline", connectionStatus: "离线", printStatus: "待机", currentTask: "暂无数据", progress: 0, cameraStatus: "离线", streamEndpoint: "/api/devices/bambu/video" },
  robot: { mode: "offline", connectionStatus: "离线", modeName: "待机", taskStatus: "待机", currentTask: "未关联项目任务", jointPositions: [], jointVelocities: [], tcpPose: { x: null, y: null, z: null, rx: null, ry: null, rz: null }, gripperState: "未知", cycleProgress: null, alarmState: null, timestamp: "", streamEndpoints: { camera01: "/api/devices/robot/camera/real-rgb", camera02: "/api/devices/robot/camera/real-depth" }, twinEndpoint: "/api/devices/robot/twin/simulation.html?scene=1", cameras: [{ id: "sim-rgb", label: "仿真 · RGB", status: "离线", endpoint: "/api/devices/robot/camera/sim-rgb" }, { id: "sim-depth", label: "仿真 · 深度", status: "离线", endpoint: "/api/devices/robot/camera/sim-depth" }, { id: "real-rgb", label: "真实 · RGB", status: "离线", endpoint: "/api/devices/robot/camera/real-rgb" }, { id: "real-depth", label: "真实双目 · 右视角计算深度", status: "离线", endpoint: "/api/devices/robot/camera/real-depth" }] },
  cameras: { camera01: { status: "离线", endpoint: "/api/execution/camera/camera01", label: "机械臂现场摄像头01" }, camera02: { status: "离线", endpoint: "/api/execution/camera/camera02", label: "机械臂现场摄像头02" } }, events: [],
};

function modeLabel(mode: ExecutionMode) {
  return mode === "demo" ? "演示数据" : mode === "real" ? "真实设备" : "设备离线";
}

function formatTime(value?: string) {
  if (!value) return "暂无数据";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "暂无数据" : date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function statusClass(status: string) {
  return status === "进行中" || status === "在线" || status === "运行中" ? "is-active" : status === "异常" || status === "离线" ? "is-danger" : status === "已完成" ? "is-done" : "is-waiting";
}

function ModeBadge({ mode }: { mode: ExecutionMode }) {
  return <span className={`execution-mode-badge ${mode}`}>{modeLabel(mode)}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return <div className="execution-progress"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function CameraPanel({ title, status, mode, endpoint, updatedAt, detail, onOpen, variant }: { title: string; status: string; mode: ExecutionMode; endpoint: string; updatedAt?: string | null; detail?: string | null; onOpen: () => void; variant: "printer" | "camera01" | "camera02" | "robot" }) {
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [endpoint, status, updatedAt]);
  const demo = mode === "demo";
  const streamSource = updatedAt ? `${endpoint}?frame=${encodeURIComponent(updatedAt)}` : endpoint;
  const canShowImage = !demo && status === "在线" && !imageError;
  return <button type="button" className={`execution-camera-panel ${variant}`} onClick={onOpen} data-stream-endpoint={endpoint}>
    <div className="execution-camera-visual">{canShowImage ? <img src={streamSource} alt={title} onError={() => setImageError(true)} /> : <><span className="camera-grid" /><strong>{demo ? "演示画面占位" : status === "重连中" ? "正在重新连接" : imageError ? "视频网关暂时不可用" : "当前画面暂时不可用"}</strong><small title={detail || undefined}>{demo ? "尚未接入真实视频" : imageError ? "请检查 ffmpeg 与打印机网络" : detail || status}</small></>}</div>
    <div className="execution-camera-caption"><span>{title}</span><em className={statusClass(status)}>{demo ? "演示数据" : status}</em></div>
  </button>;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="execution-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function TaskList({ tasks, emptyText = "暂无关联预算项目" }: { tasks: ExecutionTask[]; emptyText?: string }) {
  if (!tasks.length) return <div className="execution-empty">{emptyText}</div>;
  return <div className="execution-task-list">{tasks.map((task) => <div className="execution-task-row" key={task.id}><div><strong>{task.name}</strong><small>关联预算：{task.budgetItemName} · {task.device}</small></div><div className="execution-task-progress"><span className={statusClass(task.status)}>{task.status}</span><ProgressBar value={task.progress} /></div></div>)}</div>;
}

function RobotTwinFrame({ robot }: { robot: RobotStatus }) {
  return <div className="robot-twin-frame-shell">
    <div className="robot-twin-frame-head"><div><small>ROS2 / Gazebo 实时场景</small><h2>机械臂数字孪生</h2></div><ModeBadge mode={robot.mode} /></div>
    <iframe src={robot.twinEndpoint || "/api/devices/robot/twin/simulation.html?scene=1"} title="机械臂 ROS2 数字孪生" loading="eager" referrerPolicy="no-referrer" />
  </div>;
}

function DeviceStatusPanel({ title, status, detail, onOpen }: { title: string; status: string; detail: string; onOpen: () => void }) {
  return <button type="button" className="execution-camera-panel execution-device-status-only" onClick={onOpen}>
    <div className="execution-device-status-copy"><small>轻量状态</small><strong>{title}</strong><span>{detail}</span></div>
    <div className="execution-camera-caption"><span>进入设备页查看实时画面</span><em className={statusClass(status)}>{status}</em></div>
  </button>;
}

function PrinterDetail({ snapshot, tasks }: { snapshot: ExecutionSnapshot; tasks: ExecutionTask[] }) {
  const printer = snapshot.printer;
  const values: Array<[string, string | number]> = [["连接状态", printer.connectionStatus], ["打印状态", printer.printStatus], ["当前构件", printer.currentTask], ["打印进度", `${printer.progress}%`], ["剩余时间", printer.remainingMinutes === undefined ? "暂无数据" : `${printer.remainingMinutes} 分钟`], ["当前层", printer.currentLayer === undefined ? "暂无数据" : `${printer.currentLayer} / ${printer.totalLayers ?? "暂无数据"}`], ["喷嘴温度", printer.nozzleCurrentTemperature === undefined ? "暂无数据" : `${printer.nozzleCurrentTemperature} / ${printer.nozzleTargetTemperature ?? "暂无数据"} °C`], ["热床温度", printer.bedCurrentTemperature === undefined ? "暂无数据" : `${printer.bedCurrentTemperature} / ${printer.bedTargetTemperature ?? "暂无数据"} °C`], ["材料", printer.material || "暂无数据"], ["材料余量", printer.materialRemaining === undefined ? "暂无数据" : `${printer.materialRemaining}%`]];
  return <div className="execution-detail-layout"><section className="execution-detail-media touch-panel"><CameraPanel title="拓竹3D打印机实时摄像头" status={printer.cameraStatus} mode={printer.mode} endpoint={printer.streamEndpoint} variant="printer" onOpen={() => undefined} /></section><section className="execution-detail-status touch-panel"><div className="execution-section-title"><div><small>设备状态</small><h2>3D打印机</h2></div><ModeBadge mode={printer.mode} /></div><div className="execution-status-grid">{values.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div><h3>打印任务队列</h3><TaskList tasks={tasks.filter((task) => task.device === "3D打印机")} /></section></div>;
}

function RobotDetail({ snapshot }: { snapshot: ExecutionSnapshot }) {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const robot = snapshot.robot;
  const joints = robot.jointPositions.map((angle, index) => ({ name: `J${index + 1}`, angle }));
  const cameras = robot.cameras?.length ? robot.cameras : [];
  const poseValue = (value: number | null) => value == null ? "暂无数据" : value.toFixed(2);
  const selected = cameras.find((camera) => camera.id === selectedCamera);
  return <div className="execution-robot-detail"><section className="touch-panel execution-robot-cameras"><div className="execution-section-title"><div><small>只读实时监控</small><h2>机械臂四路画面</h2></div><span>{robot.connectionStatus}</span></div><div className="robot-camera-grid">{cameras.map((camera) => <CameraPanel key={camera.id} title={camera.label} status={camera.status} mode={robot.mode} endpoint={camera.endpoint} updatedAt={camera.updatedAt} detail={camera.detail} variant="camera01" onOpen={() => setSelectedCamera(camera.id)} />)}</div></section><section className="touch-panel robot-twin-panel"><RobotTwinFrame robot={robot} /></section><section className="touch-panel execution-detail-status"><div className="execution-section-title"><div><small>运行状态</small><h2>机械臂工作站</h2></div><ModeBadge mode={robot.mode} /></div><div className="robot-summary"><span>连接：<b>{robot.connectionStatus}</b></span><span>模式：<b>{robot.modeName}</b></span><span>任务：<b>{robot.currentTask}</b></span><span>告警：<b>{robot.alarmState || "暂无数据"}</b></span><span>急停：<b>{robot.emergencyStop || "暂无数据"}</b></span><span>更新时间：<b>{formatTime(robot.timestamp)}</b></span></div><h3>关节信息（单位：弧度）</h3>{joints.length ? <div className="joint-grid">{joints.map((joint) => <div key={joint.name}><b>{joint.name}</b><span>{joint.angle.toFixed(3)} rad</span><small>目标与速度：暂无数据</small></div>)}</div> : <div className="execution-empty">暂无关节数据</div>}<h3>末端位姿</h3><div className="pose-grid">{Object.entries(robot.tcpPose).map(([key, value]) => <div key={key}><span>{key.toUpperCase()}</span><b>{poseValue(value)}</b></div>)}</div><div className="execution-inline-progress"><span>任务进度</span><b>{robot.cycleProgress == null ? "暂无数据" : `${robot.cycleProgress}%`}</b>{robot.cycleProgress != null && <ProgressBar value={robot.cycleProgress} />}</div></section>{selected && <section className="robot-camera-lightbox" role="dialog" aria-modal="true" aria-label={selected.label}><div className="robot-camera-lightbox-head"><div><small>实时画面</small><h2>{selected.label}</h2><p>{selected.status} · 更新时间 {formatTime(selected.updatedAt || undefined)}</p></div><button type="button" onClick={() => setSelectedCamera(null)} aria-label="关闭视频" title="关闭视频">×</button></div><div className="robot-camera-lightbox-media">{selected.status === "在线" ? <img src={`${selected.endpoint}${selected.updatedAt ? `?frame=${encodeURIComponent(selected.updatedAt)}` : ""}`} alt={selected.label} /> : <div className="execution-empty">{selected.detail || "当前画面暂时不可用"}</div>}</div></section>}</div>;
}

function Records({ events }: { events: ExecutionEvent[] }) {
  const [filter, setFilter] = useState<ExecutionEvent["type"]>("全部");
  const filters: ExecutionEvent["type"][] = ["全部", "3D打印", "机械臂", "施工", "异常"];
  const visible = events.filter((event) => filter === "全部" || event.type === filter);
  return <section className="touch-panel execution-records"><div className="execution-section-title"><div><small>执行留痕</small><h2>施工记录</h2></div><span className="execution-record-count">共 {visible.length} 条</span></div><div className="execution-record-filters">{filters.map((item) => <button type="button" key={item} className={item === filter ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>{visible.length ? <div className="execution-timeline">{visible.map((event) => <div className="execution-event" key={event.id}><time>{formatTime(event.time)}</time><i className={statusClass(event.status)} /><div><strong>{event.event}</strong><span>{event.device} · {event.task}</span></div><em className={statusClass(event.status)}>{event.status}</em></div>)}</div> : <div className="execution-empty">当前筛选暂无记录。</div>}</section>;
}

export default function ExecutionMonitoring({ budget, projectKey }: { budget: ResidentialBudget | null; projectKey?: string }) {
  const [tab, setTab] = useState<MonitorTab>("overview");
  const [deviceSnapshot, setSnapshot] = useState<ExecutionSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [storedEvents, setStoredEvents] = useState<ExecutionEvent[]>([]);
  const tasks = useMemo(() => createExecutionTasks(budget), [budget]);
  const snapshot: ExecutionSnapshot = budget ? deviceSnapshot : {
    ...deviceSnapshot,
    stages: deviceSnapshot.stages.map((stage) => ({ ...stage, status: "待执行", progress: 0 })),
    currentStage: "等待预算关联", currentTask: "暂无关联任务", progress: 0,
    estimatedCompletion: "关联预算后显示项目进度", completedTasks: 0, pendingTasks: 0, events: [],
  };
  const eventStorageKey = `dreamhouse-execution-events:${projectKey ?? budget?.id ?? "unbound"}:${budget?.id ?? "unbound"}:${budget?.version ?? 0}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(eventStorageKey);
      setStoredEvents(raw ? JSON.parse(raw) as ExecutionEvent[] : []);
    } catch { /* local history is optional */ }
  }, [eventStorageKey]);

  useEffect(() => {
    if (!snapshot.events.length) return;
    setStoredEvents((current) => {
      const merged = [...snapshot.events, ...current.filter((old) => !snapshot.events.some((next) => next.id === old.id))].slice(0, 100);
      try { localStorage.setItem(eventStorageKey, JSON.stringify(merged)); } catch { /* keep the live view usable */ }
      return merged;
    });
  }, [eventStorageKey, snapshot.events]);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    let controller: AbortController | null = null;
    const load = async () => {
      if (requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 4000);
      try {
        const response = await fetch("/api/execution/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tasks }), signal: controller.signal });
        if (!response.ok) throw new Error("执行监控服务暂时不可用");
        const next = await response.json() as ExecutionSnapshot;
        if (active) setSnapshot(next);
      } catch {
        if (active) setSnapshot((current) => ({ ...current, projectMode: "offline" }));
      } finally {
        window.clearTimeout(timeout);
        requestInFlight = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 10000);
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [tasks]);

  useEffect(() => {
    if (tab !== "robot" || typeof window === "undefined" || typeof EventSource === "undefined") return;
    const source = new EventSource("/api/devices/robot/events");
    source.onmessage = (event) => {
      try {
        const robot = JSON.parse(event.data) as ExecutionSnapshot["robot"];
        setSnapshot((current) => ({ ...current, robot, cameras: Object.fromEntries((robot.cameras || []).map((camera, index) => [`camera0${index + 1}`, { status: camera.status, endpoint: camera.endpoint, label: camera.label }])) as ExecutionSnapshot["cameras"] }));
      } catch { /* malformed device updates are ignored until the next event */ }
    };
    return () => source.close();
  }, [tab]);

  const openTab = (next: MonitorTab) => setTab(next);
  return <div className="execution-monitor-page">
    <div className="execution-page-head"><div><h1>制造与施工监控</h1><p>{budget ? `已关联住宅预算 · ${budget.items.length} 个清单项目` : "项目任务与进度待关联"}</p></div></div>
    <div className="execution-tabs" role="tablist" aria-label="制造与施工监控导航">{TABS.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {loading && <div className="execution-loading" role="status">正在读取执行设备状态……</div>}
    {tab === "overview" && <><section className="execution-overview-hero touch-panel"><div><span>项目总体进度</span><strong>{snapshot.progress}%</strong><small>当前阶段：{snapshot.currentStage} · 当前任务：{snapshot.currentTask}</small></div><div className="execution-hero-progress"><ProgressBar value={snapshot.progress} /><span>{snapshot.estimatedCompletion}</span></div><ModeBadge mode={snapshot.projectMode} /></section><section className="execution-stage-row">{snapshot.stages.map((stage) => <div key={stage.id} className={`execution-stage ${statusClass(stage.status)}`}><i /> <span>{stage.name}</span><small>{stage.status}</small><ProgressBar value={stage.progress} /></div>)}</section><section className="execution-metrics"><Metric label="当前阶段" value={snapshot.currentStage} /><Metric label="已完成任务" value={snapshot.completedTasks} /><Metric label="待执行任务" value={snapshot.pendingTasks} /><Metric label="异常数量" value={snapshot.exceptionCount} hint={snapshot.exceptionCount ? "需要处理" : "当前无异常"} /></section><section className="execution-camera-grid execution-device-overview"><DeviceStatusPanel title="拓竹3D打印机" status={snapshot.printer.connectionStatus} detail={`${snapshot.printer.printStatus} · ${snapshot.printer.progress}% · ${formatTime(snapshot.printer.updatedAt)}`} onOpen={() => openTab("printer")} /><DeviceStatusPanel title="机械臂工作站" status={snapshot.robot.connectionStatus} detail={`${snapshot.robot.taskStatus} · ${snapshot.robot.cycleProgress ?? 0}% · ${formatTime(snapshot.robot.timestamp)}`} onOpen={() => openTab("robot")} /></section><section className="execution-bottom-grid"><div className="touch-panel"><div className="execution-section-title"><div><small>预算到执行</small><h2>关联施工项目</h2></div><button type="button" className="ghost" onClick={() => openTab("records")}>查看施工记录</button></div><TaskList tasks={tasks.slice(0, 5)} emptyText="请先在STEP 5生成并保存预算" /></div><div className="touch-panel execution-alert-panel"><h2>异常与设备提示</h2>{snapshot.exceptionCount ? <p>当前有 {snapshot.exceptionCount} 项异常或告警，请进入设备详情处理。</p> : <p>当前没有异常。真实设备未接入时，页面会明确显示离线或演示数据。</p>}<div><span>打印机：{snapshot.printer.connectionStatus}</span><span>机械臂：{snapshot.robot.connectionStatus}</span><span>摄像头：{snapshot.robot.cameras?.filter((camera) => camera.status === "在线").length ?? 0}/4 在线</span></div></div></section></>}
    {tab === "printer" && <><button type="button" className="execution-detail-back" onClick={() => setTab("overview")}>← 返回项目总览</button><PrinterDetail snapshot={snapshot} tasks={tasks} /></>}
    {tab === "robot" && <><button type="button" className="execution-detail-back" onClick={() => setTab("overview")}>← 返回项目总览</button><RobotDetail snapshot={snapshot} /></>}
    {tab === "records" && <><button type="button" className="execution-detail-back" onClick={() => setTab("overview")}>← 返回项目总览</button><Records events={storedEvents.length ? storedEvents : snapshot.events} /></>}
  </div>;
}
