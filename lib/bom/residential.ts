import type { DesignVersion, SceneGraph } from "../types";

export type ResidentialBudgetSettings = {
  city: string;
  condition: "毛坯装修" | "旧房翻新" | "精装局部改造";
  scope: "全屋装修" | "指定房间" | "指定项目";
  roomId?: string;
  grade: "经济" | "标准" | "品质" | "自定义";
  contract: "清包" | "半包" | "全包";
  furniture: "全部新购" | "部分保留" | "已有设备继续使用";
  targetBudget?: number;
  priceDate: string;
};

export type ResidentialBudgetItem = {
  id: string;
  category: "现场准备" | "拆除与局部改造" | "水电与隐蔽工程" | "泥瓦与防水" | "墙面与顶面" | "地面与门窗" | "定制柜体" | "洁具与五金" | "家具与软装" | "家电与设备" | "安装与交付";
  name: string;
  room?: string;
  roomId?: string;
  specification: string;
  quantity: number;
  unit: string;
  materialUnitPrice?: number;
  laborUnitPrice?: number;
  installationUnitPrice?: number;
  materialCost: number;
  laborCost: number;
  installationCost: number;
  total: number;
  source: "地区参考数据" | "商品参考报价" | "业主录入" | "供应商报价";
  priceStatus: "参考估算" | "待询价" | "已确认报价";
  quantityStatus: "估算" | "工程量待复核" | "现场复尺后确认";
  purchaseBy: "施工方" | "业主自购" | "待确认";
  action: "原有保留" | "表面翻新" | "更换" | "新增" | "拆除" | "待确认";
  calculationBasis: string;
  includedInstallation: boolean;
  notes?: string;
};

export type ResidentialBudget = {
  id: string;
  version: number;
  sourceDesignVersion: number;
  variantId?: string;
  generatedAt: string;
  updatedAt: string;
  settings: ResidentialBudgetSettings;
  items: ResidentialBudgetItem[];
  summary: {
    pricedTotal: number;
    constructionTotal: number;
    materialTotal: number;
    furnitureTotal: number;
    applianceTotal: number;
    pendingTotal: number;
    pendingCount: number;
    reserveAmount: number;
    plannedFunds: number;
    status: "初步估算" | "工程量待复核" | "待双方确认的报价版本";
  };
};

const round = (value: number) => Math.round(value * 100) / 100;
const polygonArea = (polygon: number[][] = []) => Math.abs(polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2);
const areaOf = (node: any) => polygonArea(node.polygon || []);
const gradeFactor = (grade: ResidentialBudgetSettings["grade"]) => ({ 经济: 0.82, 标准: 1, 品质: 1.28, 自定义: 1 }[grade]);
const roomText = (node: any) => String(node?.name || "").replace(/\s+/g, "");
const roomMatches = (settings: ResidentialBudgetSettings, roomId?: string) => settings.scope !== "指定房间" || !settings.roomId || settings.roomId === roomId;

function line(input: Omit<ResidentialBudgetItem, "materialCost" | "laborCost" | "installationCost" | "total">): ResidentialBudgetItem {
  const materialCost = input.materialUnitPrice === undefined ? 0 : round(input.quantity * input.materialUnitPrice);
  const laborCost = input.laborUnitPrice === undefined ? 0 : round(input.quantity * input.laborUnitPrice);
  const installationCost = input.installationUnitPrice === undefined ? 0 : round(input.quantity * input.installationUnitPrice);
  return { ...input, materialCost, laborCost, installationCost, total: round(materialCost + laborCost + installationCost) };
}

export function defaultResidentialBudgetSettings(): ResidentialBudgetSettings {
  return { city: "", condition: "毛坯装修", scope: "全屋装修", grade: "标准", contract: "半包", furniture: "部分保留", priceDate: new Date().toISOString().slice(0, 10) };
}

export function buildResidentialBudget(design: DesignVersion, settings = defaultResidentialBudgetSettings()): ResidentialBudget {
  const scene = design.scene as SceneGraph;
  const factor = gradeFactor(settings.grade);
  const rooms = Object.values(scene.nodes).filter((node: any) => node.type === "zone") as any[];
  const scopeRooms = rooms.filter((room) => roomMatches(settings, room.id));
  const items: ResidentialBudgetItem[] = [];
  const push = (item: ResidentialBudgetItem) => { if (settings.scope === "指定项目" && !["现场准备", "水电与隐蔽工程", "泥瓦与防水", "墙面与顶面", "地面与门窗", "安装与交付"].includes(item.category)) return; items.push(item); };
  const floorRooms = scopeRooms.filter((room) => !["balcony", "storage"].includes(String(room.metadata?.semantic_type || "")));
  const floorArea = floorRooms.reduce((sum, room) => sum + areaOf(room), 0);
  if (floorArea > 0) push(line({ id: "site-preparation", category: "现场准备", name: "现场复尺与成品保护", specification: "按本次装修范围暂估", quantity: 1, unit: "项", materialUnitPrice: round(900 * factor), laborUnitPrice: round(600 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "新增", calculationBasis: `按 ${round(floorArea)} 平方米装修范围暂估`, includedInstallation: false, notes: "需现场复尺后确认。" }));
  if (settings.condition !== "毛坯装修") push(line({ id: "surface-demolition", category: "拆除与局部改造", name: "旧饰面与基层拆除", specification: settings.condition === "旧房翻新" ? "按需拆除" : "局部拆除", quantity: round(floorArea), unit: "平方米", materialUnitPrice: undefined, laborUnitPrice: round(45 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "现场复尺后确认", purchaseBy: "施工方", action: "拆除", calculationBasis: "按需要拆除的实际施工面估算", includedInstallation: false }));
  const electricalPoints = Math.max(1, Math.round(floorArea / 8));
  push(line({ id: "water-electric", category: "水电与隐蔽工程", name: "水电点位与管线调整", specification: "点位数量需现场确认", quantity: electricalPoints, unit: "点", materialUnitPrice: round(85 * factor), laborUnitPrice: round(65 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "新增", calculationBasis: `按 ${round(floorArea)} 平方米估算，每约 8 平方米 1 点`, includedInstallation: false, notes: "未确认的排水、燃气和结构条件不计入。" }));
  for (const room of floorRooms) {
    const area = round(areaOf(room)); const name = roomText(room); const semantic = String(room.metadata?.semantic_type || "");
    const isWet = semantic === "bathroom" || semantic === "kitchen";
    push(line({ id: `floor-${room.id}`, category: "地面与门窗", name: isWet ? "墙地砖铺贴" : "地面饰面铺装", room: name, roomId: room.id, specification: isWet ? "防滑砖，规格待选" : "地板或地砖，规格待选", quantity: area, unit: "平方米", materialUnitPrice: round((isWet ? 145 : 185) * factor), laborUnitPrice: round((isWet ? 85 : 55) * factor), installationUnitPrice: undefined, source: "商品参考报价", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "业主自购", action: "新增", calculationBasis: `按房间 polygon 净面积 ${area} 平方米计算；采购损耗另计`, includedInstallation: false }));
    if (isWet) push(line({ id: `waterproof-${room.id}`, category: "泥瓦与防水", name: "卫生间或厨房防水", room: name, roomId: room.id, specification: semantic === "bathroom" ? "地面及墙面上翻，施工高度待确认" : "厨房湿区，施工高度待确认", quantity: round(area * (semantic === "bathroom" ? 1.8 : 1.2)), unit: "平方米", materialUnitPrice: round(68 * factor), laborUnitPrice: round(42 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "新增", calculationBasis: "按净面积及暂估墙面上翻高度计算", includedInstallation: false, notes: "防水试验和实际上翻高度需现场确认。" }));
    push(line({ id: `wall-finish-${room.id}`, category: "墙面与顶面", name: "墙面基层与面层", room: name, roomId: room.id, specification: "腻子、底漆、面漆，颜色待选", quantity: round(area * 2.7), unit: "平方米", materialUnitPrice: round(38 * factor), laborUnitPrice: round(48 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "表面翻新", calculationBasis: `按房间面积 × 暂估层高 2.7 米，未扣门窗洞口`, includedInstallation: false }));
    if (semantic === "bathroom") {
      const sanitary = ["马桶", "洗手盆或浴室柜", "淋浴花洒与隔断", "镜子及毛巾架"];
      sanitary.forEach((name, index) => push(line({ id: `sanitary-${room.id}-${index}`, category: "洁具与五金", name, room: roomText(room), roomId: room.id, specification: "功能类别已确定，品牌型号待选", quantity: 1, unit: "套", materialUnitPrice: [1800, 2200, 2600, 580][index] * factor, laborUnitPrice: [260, 380, 500, 120][index] * factor, installationUnitPrice: undefined, source: "商品参考报价", priceStatus: "参考估算", quantityStatus: "估算", purchaseBy: "业主自购", action: "新增", calculationBasis: "按已确认卫生间用途配置，具体规格待选", includedInstallation: false, notes: "排水和安装条件需现场核实。" })));
    }
    if (semantic === "bedroom" || semantic === "master_bedroom" || semantic === "child_room") {
      const bedName = semantic === "master_bedroom" ? "主卧床具" : semantic === "child_room" ? "儿童房床具" : "卧室床具";
      if (settings.furniture !== "已有设备继续使用") push(line({ id: `bed-${room.id}`, category: "家具与软装", name: bedName, room: name, roomId: room.id, specification: "尺寸和软包材质待选", quantity: 1, unit: "套", materialUnitPrice: round(3600 * factor), laborUnitPrice: undefined, installationUnitPrice: round(180 * factor), source: "商品参考报价", priceStatus: "参考估算", quantityStatus: "估算", purchaseBy: "业主自购", action: "新增", calculationBasis: "按房间用途配置 1 套", includedInstallation: true }));
      if (settings.furniture === "全部新购") push(line({ id: `wardrobe-${room.id}`, category: "定制柜体", name: "衣物收纳柜", room: name, roomId: room.id, specification: "长度现场复尺，板材和五金待选", quantity: 2.4, unit: "延米", materialUnitPrice: round(2200 * factor), laborUnitPrice: round(280 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "现场复尺后确认", purchaseBy: "施工方", action: "新增", calculationBasis: "按暂估 2.4 延米，现场复尺后调整", includedInstallation: false }));
    }
    if (semantic === "living_room") push(line({ id: `living-${room.id}`, category: "家具与软装", name: "客厅沙发与茶几", room: name, roomId: room.id, specification: "尺寸和面料待选", quantity: 1, unit: "套", materialUnitPrice: round(5200 * factor), installationUnitPrice: round(150 * factor), laborUnitPrice: undefined, source: "商品参考报价", priceStatus: "参考估算", quantityStatus: "估算", purchaseBy: "业主自购", action: "新增", calculationBasis: "按客厅用途配置 1 套", includedInstallation: true }));
    if (semantic === "kitchen") push(line({ id: `kitchen-${room.id}`, category: "定制柜体", name: "厨房橱柜与台面", room: name, roomId: room.id, specification: "长度、台面材质和五金待选", quantity: 3.6, unit: "延米", materialUnitPrice: round(2600 * factor), laborUnitPrice: round(420 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "现场复尺后确认", purchaseBy: "施工方", action: "新增", calculationBasis: "按暂估 3.6 延米，现场复尺后调整", includedInstallation: false }));
  }
  if (settings.furniture !== "已有设备继续使用") {
    const applianceRoom = scopeRooms.find((room) => String(room.metadata?.semantic_type || "") === "kitchen");
    if (applianceRoom) push(line({ id: "appliance-refrigerator", category: "家电与设备", name: "冰箱", room: roomText(applianceRoom), roomId: applianceRoom.id, specification: "容量和尺寸待选", quantity: 1, unit: "台", materialUnitPrice: round(4200 * factor), laborUnitPrice: undefined, installationUnitPrice: round(120 * factor), source: "商品参考报价", priceStatus: "参考估算", quantityStatus: "估算", purchaseBy: "业主自购", action: "新增", calculationBasis: "按厨房配置 1 台，型号和尺寸待选", includedInstallation: true, notes: "需核实进场尺寸、插座和散热空间。" }));
  }
  push(line({ id: "delivery-cleaning", category: "安装与交付", name: "安装调试与开荒保洁", specification: "按确认项目综合暂估", quantity: 1, unit: "项", materialUnitPrice: undefined, laborUnitPrice: round(1800 * factor), installationUnitPrice: undefined, source: "地区参考数据", priceStatus: "参考估算", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "新增", calculationBasis: "按当前装修范围暂估，最终按合同确认", includedInstallation: false }));
  const priced = items.filter((item) => item.priceStatus !== "待询价");
  const materialTotal = round(priced.reduce((sum, item) => sum + item.materialCost, 0));
  const laborTotal = round(priced.reduce((sum, item) => sum + item.laborCost, 0));
  const installationTotal = round(priced.reduce((sum, item) => sum + item.installationCost, 0));
  const furnitureTotal = round(priced.filter((item) => item.category === "家具与软装").reduce((sum, item) => sum + item.total, 0));
  const applianceTotal = round(priced.filter((item) => item.category === "家电与设备").reduce((sum, item) => sum + item.total, 0));
  const constructionTotal = round(priced.filter((item) => !["家具与软装", "家电与设备"].includes(item.category)).reduce((sum, item) => sum + item.total, 0));
  const pendingCount = items.filter((item) => item.priceStatus === "待询价" || item.quantityStatus !== "估算").length;
  const pricedTotal = round(priced.reduce((sum, item) => sum + item.total, 0));
  const reserveAmount = round(pricedTotal * 0.08);
  const now = new Date().toISOString();
  return { id: `住宅预算-${design.version}-${Date.now()}`, version: design.version, sourceDesignVersion: design.version, variantId: String((scene.nodes.building_house?.metadata as any)?.variantId || ""), generatedAt: now, updatedAt: now, settings, items, summary: { pricedTotal, constructionTotal, materialTotal, furnitureTotal, applianceTotal, pendingTotal: 0, pendingCount, reserveAmount, plannedFunds: round(pricedTotal + reserveAmount), status: pendingCount ? "工程量待复核" : "初步估算" } };
}

export function recalculateResidentialBudget(budget: ResidentialBudget): ResidentialBudget {
  const items = budget.items.map((item) => line(item));
  const priced = items.filter((item) => item.priceStatus !== "待询价");
  const pricedTotal = round(priced.reduce((sum, item) => sum + item.total, 0));
  const summary = { ...budget.summary, pricedTotal, constructionTotal: round(priced.filter((item) => !["家具与软装", "家电与设备"].includes(item.category)).reduce((sum, item) => sum + item.total, 0)), materialTotal: round(priced.reduce((sum, item) => sum + item.materialCost, 0)), furnitureTotal: round(priced.filter((item) => item.category === "家具与软装").reduce((sum, item) => sum + item.total, 0)), applianceTotal: round(priced.filter((item) => item.category === "家电与设备").reduce((sum, item) => sum + item.total, 0)), reserveAmount: round(pricedTotal * 0.08), plannedFunds: round(pricedTotal * 1.08), pendingCount: items.filter((item) => item.priceStatus === "待询价" || item.quantityStatus !== "估算").length };
  return { ...budget, items, summary, updatedAt: new Date().toISOString() };
}
