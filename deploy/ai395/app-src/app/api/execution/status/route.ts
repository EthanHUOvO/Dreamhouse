import { NextResponse } from "next/server";
import { createBambuPrinterAdapter } from "@/lib/execution/BambuPrinterAdapter";
import { getRobotMonitorAdapter } from "@/lib/execution/RobotMonitorAdapter";
import type { ExecutionEvent, ExecutionTask } from "@/lib/execution/types";

export const dynamic = "force-dynamic";

function createEvents(tasks: ExecutionTask[]): ExecutionEvent[] {
  const now = new Date();
  return tasks.slice(0, 8).map((task, index) => ({
    id: `${task.id}-event`,
    time: new Date(now.getTime() - (tasks.length - index) * 8 * 60_000).toISOString(),
    event: task.status === "进行中" ? `${task.name}已开始` : `${task.name}等待前置任务`,
    device: task.device,
    task: task.name,
    status: task.status === "异常" ? "异常" : task.status === "进行中" ? "正常" : "等待",
    type: task.taskType === "现场施工" ? "施工" : task.device === "3D打印机" ? "3D打印" : "机械臂",
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tasks = Array.isArray(body.tasks) ? body.tasks as ExecutionTask[] : [];
    const current = tasks.find((task) => task.status === "进行中") || tasks.find((task) => task.status === "待执行");
    const monitor = getRobotMonitorAdapter();
    const [printer, robot] = await Promise.all([
      createBambuPrinterAdapter().getStatus(current?.name),
      monitor.getStatus(),
    ]);
    const completed = tasks.filter((task) => task.status === "已完成").length;
    const pending = tasks.filter((task) => task.status === "待执行").length;
    const exceptionCount = tasks.filter((task) => task.status === "异常").length + (printer.printStatus === "异常" ? 1 : 0) + (robot.taskStatus === "异常" ? 1 : 0);
    const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (task.status === "进行中" && printer.mode === "demo" ? printer.progress : task.progress), 0) / tasks.length) : 0;
    const estimatedCompletion = printer.mode === "demo" && printer.remainingMinutes !== undefined
      ? `预计 ${new Date(Date.now() + printer.remainingMinutes * 60_000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 完成`
      : "暂无数据";
    const snapshot = {
      generatedAt: new Date().toISOString(), projectMode: printer.mode === "demo" || robot.mode === "demo" ? "demo" : printer.mode === "real" || robot.mode === "real" ? "real" : "offline",
      stages: [
        { id: "design", name: "方案确认", status: "已完成", progress: 100 },
        { id: "materials", name: "材料准备", status: tasks.length ? "已完成" : "待执行", progress: tasks.length ? 100 : 0 },
        { id: "printing", name: "3D打印", status: printer.printStatus === "打印中" ? "进行中" : "待执行", progress: printer.progress },
        { id: "robot", name: "机械臂作业", status: robot.taskStatus === "运行中" ? "进行中" : "待执行", progress: robot.cycleProgress },
        { id: "construction", name: "现场施工", status: "待执行", progress: 0 },
        { id: "acceptance", name: "完工验收", status: "待执行", progress: 0 },
      ],
      currentStage: current?.device === "3D打印机" ? "3D打印" : current?.device === "机械臂" ? "机械臂作业" : current?.taskType === "现场施工" ? "现场施工" : "材料准备",
      currentTask: current?.name || "暂无施工任务",
      progress, estimatedCompletion, completedTasks: completed, pendingTasks: pending, exceptionCount,
      printer, robot,
      cameras: Object.fromEntries((robot.cameras || []).map((camera, index) => [`camera0${index + 1}`, { status: camera.status, endpoint: camera.endpoint, label: camera.label }])) as any,
      events: createEvents(tasks),
    };
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "执行监控状态暂时不可用" }, { status: 500 });
  }
}
