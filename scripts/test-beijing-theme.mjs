import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.DREAMHOUSE_PLAYWRIGHT_PATH || "playwright");
const baseUrl = process.env.DREAMHOUSE_TEST_URL || "http://localhost:3000";
const output = path.resolve("artifacts/beijing-construction-theme");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checks = [];
try {
  await page.goto(`${baseUrl}/`);
  await page.getByRole("heading", { name: "可变空间智能建造平台", exact: true }).waitFor();
  assert.equal(await page.locator(".home .bjg-logo-slot").count(), 1);
  assert.equal(await page.getByText("施工方入口", { exact: true }).count(), 1);
  await page.screenshot({ path: path.join(output, "home.png"), fullPage: true });
  checks.push("首页企业Header、Hero、能力标签与双入口");
  await page.goto(`${baseUrl}/customer`);
  await page.getByRole("heading", { name: "先选择一个喜欢的户型", exact: true }).waitFor();
  assert.equal(await page.locator(".touch-topbar .bjg-logo-slot").count(), 1);
  assert.equal(await page.getByText("施工方入口", { exact: true }).count(), 0);
  await page.screenshot({ path: path.join(output, "step1.png"), fullPage: true });
  await page.locator(".touch-step-footer button").nth(1).click();
  await page.getByRole("heading", { name: "调整您的户型", exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "step2.png"), fullPage: true });
  for (const [index, name] of [[2, "step3-viewer"], [3, "step4"], [4, "step5"]]) {
    const stepButton = page.locator(".touch-step-footer button").nth(index);
    if (await stepButton.count()) { await stepButton.click(); await page.waitForTimeout(250); await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); }
    if (name === "step3-viewer") await page.screenshot({ path: path.join(output, "step3-loading.png"), fullPage: true });
  }
  checks.push("客户头部与STEP1/STEP2红白主题");

  await page.goto(`${baseUrl}/contractor`);
  await page.getByRole("heading", { name: "制造与施工监控", exact: true }).waitFor();
  assert.equal(await page.locator(".execution-camera-grid > button").count(), 2);
  await page.screenshot({ path: path.join(output, "step6.png"), fullPage: true });
  await page.getByRole("tab", { name: "机械臂", exact: true }).click();
  await page.getByRole("heading", { name: "机械臂工作站", exact: true }).waitFor();
  assert.equal(await page.locator(".robot-camera-grid .execution-camera-panel").count(), 4);
  await page.screenshot({ path: path.join(output, "robot.png"), fullPage: true });
  await page.getByRole("tab", { name: "3D打印", exact: true }).click();
  await page.getByRole("heading", { name: "3D打印机", exact: true }).waitFor();
  assert.equal(await page.locator(".execution-detail-media .execution-camera-panel").count(), 1);
  await page.screenshot({ path: path.join(output, "printer.png"), fullPage: true });
  checks.push("施工方拓竹单画面与机械臂四宫格");

  for (const [width, height] of [[1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${width}x${height} horizontal overflow`);
  }
  checks.push("响应式无横向溢出");
  await fs.writeFile(path.join(output, "验收.json"), JSON.stringify({ checks, errors }, null, 2));
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Beijing construction theme checks: PASS");
} finally { await browser.close(); }
