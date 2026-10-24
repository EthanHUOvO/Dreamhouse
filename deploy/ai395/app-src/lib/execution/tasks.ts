import type { ResidentialBudget } from "../bom/residential";
import type { ExecutionTask } from "./types";

function taskTypeForCategory(category: ResidentialBudget["items"][number]["category"]): ExecutionTask["taskType"] {
  if (["现场准备", "拆除与局部改造", "水电与隐蔽工程", "泥瓦与防水", "墙面与顶面", "地面与门窗", "安装与交付"].includes(category)) return "现场施工";
  if (["定制柜体", "洁具与五金", "家具与软装", "家电与设备"].includes(category)) return "安装";
  return "制造";
}

function deviceForTask(taskType: ExecutionTask["taskType"], category: string): ExecutionTask["device"] {
  if (taskType === "现场施工") return "现场施工";
  if (taskType === "安装" || category === "定制柜体") return "机械臂";
  return "3D打印机";
}

export function createExecutionTasks(budget: ResidentialBudget | null): ExecutionTask[] {
  if (!budget) return [];
  const tasks: ExecutionTask[] = [];
  const add = (item: ResidentialBudget["items"][number], taskType: ExecutionTask["taskType"], device: ExecutionTask["device"], name: string, prerequisiteIds: string[]) => {
    const index = tasks.length;
    tasks.push({
      id: `execution-${budget.id}-${item.id}-${index}`,
      name,
      budgetItemId: item.id,
      budgetItemName: item.name,
      taskType,
      device,
      status: index === 0 ? "进行中" : "待执行",
      progress: index === 0 ? 34 : 0,
      prerequisiteIds,
    });
    return tasks.at(-1)!.id;
  };
  budget.items.forEach((item) => {
    const taskType = taskTypeForCategory(item.category);
    const device = deviceForTask(taskType, item.category);
    const prerequisiteIds = tasks.length ? [tasks.at(-1)!.id] : [];
    if (["定制柜体", "地面与门窗"].includes(item.category)) {
      const manufactureId = add(item, "制造", "3D打印机", `制造${item.name}`, prerequisiteIds);
      add(item, "安装", "机械臂", `安装${item.name}`, [manufactureId]);
    } else {
      add(item, taskType, device, `${taskType}${item.name}`, prerequisiteIds);
    }
  });
  return tasks;
}
