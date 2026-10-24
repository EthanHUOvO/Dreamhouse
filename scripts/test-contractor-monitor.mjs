import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const { chromium } = await import(process.env.DREAMHOUSE_PLAYWRIGHT_PATH || "playwright");
const output = path.resolve("artifacts/contractor-monitor");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const errors = [];
const failedRobotMeshes = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().includes("/api/devices/robot/twin/assets/packages/") && response.status() >= 400) failedRobotMeshes.push(`${response.status()} ${response.url()}`);
});
const baseUrl = process.env.DREAMHOUSE_TEST_URL || "http://localhost:3000";
const monitor = () => page.getByRole("heading", { name: "制造与施工监控", exact: true });
const click = async (name) => page.getByRole("button", { name, exact: true }).click();
const assertCanvasNonBlank = async (canvas, fileName) => {
  const image = await canvas.screenshot();
  await fs.writeFile(path.join(output, fileName), image);
  const stats = await sharp(image).stats();
  assert.ok(stats.channels.slice(0, 3).some((channel) => channel.stdev > 8), `${fileName}: canvas is blank or a single color`);
};
const inspectLayout = async () => page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > innerWidth,
  tiles: Array.from(document.querySelectorAll(".execution-camera-grid > button")).map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, x: Math.round(rect.x), y: Math.round(rect.y) };
  }),
}));

try {
  await page.goto(`${baseUrl}/contractor`);
  await monitor().waitFor();
  await page.locator(".execution-mode-badge").first().waitFor();
  assert.equal(await page.getByText("当前订单尚未绑定住宅预算", { exact: true }).count(), 1);
  assert.equal(await page.locator(".execution-camera-grid > button").count(), 2);
  assert.equal(await page.locator(".contractor-detail").count(), 0);
  assert.equal(await page.getByText("第六步", { exact: true }).count(), 0);
  assert.equal(await page.getByText("订单与清单", { exact: true }).count(), 0);
  assert.equal(await page.getByText("查看订单与清单", { exact: true }).count(), 0);
  assert.equal(await page.getByText("三居室 · AI/Pascal联动方案", { exact: true }).count(), 0);
  assert.equal(await page.locator(".order-sidebar button").count(), 0);
  assert.equal(await page.locator(".order-sidebar-item").count(), 5);
  await page.screenshot({ path: path.join(output, "施工方监控-桌面.png"), fullPage: true });
  const reports = [];
  for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const layout = await inspectLayout();
    assert.equal(layout.overflow, false, `${width}x${height}: horizontal overflow`);
    assert.equal(layout.tiles.length, 2);
    assert.ok(layout.tiles.every((tile) => tile.width >= 44 && tile.height >= 44));
    if (width > 620) assert.equal(layout.tiles[0].y, layout.tiles[1].y, "Overview should use two columns");
    await page.locator(".execution-camera-grid > button").first().click();
    await page.getByRole("heading", { name: "打印任务队列", exact: true }).waitFor();
    await click("← 返回项目总览");
    await page.screenshot({ path: path.join(output, `施工方监控-${width}x${height}.png`), fullPage: true });
    reports.push({ viewport: `${width}x${height}`, status: "通过", ...layout });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [name, heading] of [["3D打印", "3D打印机"], ["机械臂", "机械臂工作站"], ["施工记录", "施工记录"]]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await click("← 返回项目总览");
  }
  await page.getByRole("tab", { name: "机械臂", exact: true }).click();
  assert.equal(await page.locator(".robot-camera-grid > button").count(), 4);
  assert.equal(await page.locator('iframe[title="机械臂 ROS2 数字孪生"]').count(), 1);
  assert.ok((await page.locator('iframe[title="机械臂 ROS2 数字孪生"]').getAttribute("src"))?.includes("/api/devices/robot/twin/simulation.html?scene=1"));
  assert.equal(await page.getByRole("tab", { name: "数字孪生", exact: true }).count(), 0);
  const twin = page.frameLocator('iframe[title="机械臂 ROS2 数字孪生"]');
  await twin.locator("#loading").waitFor({ state: "hidden", timeout: 30_000 });
  await twin.locator("canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  assert.equal(failedRobotMeshes.length, 0, failedRobotMeshes.join("\n"));
  assert.ok(await page.locator('iframe[title="机械臂 ROS2 数字孪生"]').contentFrame().locator("canvas").count());
  await assertCanvasNonBlank(twin.locator("canvas"), "机械臂数字孪生画布-1366x768.png");
  await page.screenshot({ path: path.join(output, "机械臂五路-1366x768.png"), fullPage: true });
  await page.locator(".robot-camera-grid > button").first().click();
  await page.getByRole("dialog").waitFor();
  const desktopLightbox = await page.locator(".robot-camera-lightbox img").evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, viewportX: innerWidth / 2, viewportY: innerHeight / 2 };
  });
  assert.ok(Math.abs(desktopLightbox.centerX - desktopLightbox.viewportX) < 2);
  assert.ok(Math.abs(desktopLightbox.centerY - desktopLightbox.viewportY) < 2);
  await page.screenshot({ path: path.join(output, "机械臂视频放大-1366x768.png") });
  await page.getByRole("button", { name: "关闭视频", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.waitForTimeout(400);
  await assertCanvasNonBlank(twin.locator("canvas"), "机械臂数字孪生画布-390x844.png");
  await page.screenshot({ path: path.join(output, "机械臂五路-390x844.png"), fullPage: true });
  await page.locator(".robot-camera-grid > button").first().click();
  await page.getByRole("dialog").waitFor();
  const mobileLightbox = await page.locator(".robot-camera-lightbox img").evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, viewportX: innerWidth / 2, viewportY: innerHeight / 2 };
  });
  assert.ok(Math.abs(mobileLightbox.centerX - mobileLightbox.viewportX) < 2);
  assert.ok(Math.abs(mobileLightbox.centerY - mobileLightbox.viewportY) < 2);
  await page.screenshot({ path: path.join(output, "机械臂视频放大-390x844.png") });
  await page.getByRole("button", { name: "关闭视频", exact: true }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await click("← 返回项目总览");
  await page.locator(".execution-camera-grid > button").nth(1).click();
  await page.getByRole("heading", { name: "机械臂工作站", exact: true }).waitFor();
  await click("← 返回项目总览");
  await page.reload();
  await monitor().waitFor();

  // Seed only this isolated browser context to verify a submitted residential budget.
  await page.evaluate(() => {
    const orders = JSON.parse(localStorage.getItem("dreamhouse.v11.orders"));
    const order = orders[0];
    order.residentialBudget = {
      id: "browser-test-budget", version: 2, sourceDesignVersion: order.approvedVersion,
      generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      settings: { city: "", condition: "毛坯装修", scope: "全屋装修", grade: "标准", contract: "半包", furniture: "部分保留", priceDate: "2026-09-05" },
      items: [{ id: "browser-test-wall", category: "墙面与顶面", name: "测试墙面翻新", room: "客餐厅", specification: "交互测试项目", quantity: 10, unit: "平方米", materialCost: 0, laborCost: 0, installationCost: 0, total: 0, source: "业主录入", priceStatus: "待询价", quantityStatus: "工程量待复核", purchaseBy: "施工方", action: "表面翻新", calculationBasis: "测试响应", includedInstallation: false }],
      summary: { pricedTotal: 0, constructionTotal: 0, materialTotal: 0, furnitureTotal: 0, applianceTotal: 0, pendingTotal: 0, pendingCount: 1, reserveAmount: 0, plannedFunds: 0, status: "初步估算" },
    };
    localStorage.setItem("dreamhouse.v11.orders", JSON.stringify(orders));
  });
  const request = page.waitForRequest((request) => request.url().endsWith("/api/execution/status") && request.postDataJSON()?.tasks?.[0]?.budgetItemId === "browser-test-wall");
  await page.reload();
  await request;
  await page.getByText("现场施工测试墙面翻新", { exact: true }).first().waitFor();
  assert.equal(await page.getByText("当前订单尚未绑定住宅预算", { exact: true }).count(), 0);
  await page.getByRole("tab", { name: "施工记录", exact: true }).click();
  await page.getByText("现场施工测试墙面翻新已开始", { exact: true }).waitFor();
  await page.reload();
  await monitor().waitFor();
  await page.getByRole("tab", { name: "施工记录", exact: true }).click();
  await page.getByText("现场施工测试墙面翻新已开始", { exact: true }).waitFor();
  await page.goto(`${baseUrl}/customer`);
  await page.getByRole("heading", { name: "先选择一个喜欢的户型", exact: true }).waitFor();
  assert.equal(errors.length, 0, errors.join("\n"));
  await fs.writeFile(path.join(output, "浏览器验收.json"), JSON.stringify({ reports, errors, checks: ["默认监控入口", "机械臂四路视频", "机械臂内嵌数字孪生", "四屏点击", "订单中心只读", "订单清单入口移除", "预算项目关联", "记录保存恢复", "客户入口回归"] }, null, 2));
  console.log("Contractor monitor browser checks: PASS");
} finally {
  await browser.close();
}
