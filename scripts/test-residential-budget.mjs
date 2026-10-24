import assert from "node:assert/strict";
import { buildResidentialBudget, defaultResidentialBudgetSettings } from "../lib/bom/residential.ts";

const scene = { nodes: {
  building_house: { type: "building", metadata: { variantId: "test-option" } },
  living: { type: "zone", id: "living", name: "客厅", polygon: [[0, 0], [4, 0], [4, 3], [0, 3]], metadata: { semantic_type: "living_room" } },
  bath: { type: "zone", id: "bath", name: "卫生间", polygon: [[4, 0], [6, 0], [6, 2], [4, 2]], metadata: { semantic_type: "bathroom" } },
  kitchen: { type: "zone", id: "kitchen", name: "厨房", polygon: [[0, 3], [3, 3], [3, 5], [0, 5]], metadata: { semantic_type: "kitchen" } },
} };
const design = { version: 3, scene };
const full = buildResidentialBudget(design, defaultResidentialBudgetSettings());
assert(full.items.length > 0 && !full.items.some((item) => item.name.includes("打印") || item.name.includes("连接件")), "住宅预算不得出现制造条目");
assert(full.items.some((item) => item.name === "马桶") && full.items.some((item) => item.name === "客厅沙发与茶几"), "房间配置缺失");
const bathroomOnly = buildResidentialBudget(design, { ...defaultResidentialBudgetSettings(), scope: "指定房间", roomId: "bath", furniture: "已有设备继续使用" });
assert(bathroomOnly.items.every((item) => item.roomId === "bath" || ["现场准备", "水电与隐蔽工程", "安装与交付"].includes(item.category)), "指定卫生间不应生成客厅采购");
assert(!bathroomOnly.items.some((item) => item.name === "冰箱"), "保留家电时不应新增冰箱");
const total = full.items.reduce((sum, item) => sum + item.total, 0);
assert.equal(Math.round(total * 100) / 100, full.summary.pricedTotal, "页面明细和总额必须一致");
console.log(JSON.stringify({ fullItems: full.items.length, bathroomOnlyItems: bathroomOnly.items.length, total: full.summary.pricedTotal, status: full.summary.status }));
