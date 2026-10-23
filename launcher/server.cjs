const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const net = require("net");

const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");
const htmlPath = path.join(__dirname, "index.html");
const logDir = path.join(projectRoot, "logs");
const launcherPort = 3210;
const appProcesses = new Map();
let appStartedAt = null;
let lastAppError = "";

const managedKeys = [
  "DREAMHOUSE_HOST",
  "DREAMHOUSE_PORT",
  "DREAMHOUSE_PORTS",
  "ROBOT_MONITOR_MODE",
  "ROBOT_MONITOR_BASE_URL",
  "ROBOT_API_ENDPOINT",
  "NEXT_PUBLIC_ROBOT_VIDEO",
  "NEXT_PUBLIC_SITE_CAMERA_URL",
  "NEXT_PUBLIC_SITE_VIDEO",
  "DEMO_ROBOT_MODE",
  "DEMO_CAMERA_MODE",
  "BAMBU_PRINTER_IP",
  "BAMBU_DEVICE_ID",
  "BAMBU_ACCESS_CODE",
  "BAMBU_MODEL",
  "NEXT_PUBLIC_PRINTER_VIDEO",
  "DEMO_PRINTER_MODE",
  "QWEN_API_KEY",
  "QWEN_COMPAT_BASE_URL",
  "QWEN_NATIVE_BASE_URL",
  "QWEN_LAYOUT_MODEL",
  "QWEN_BOM_MODEL",
  "QWEN_IMAGE_MODEL"
];

function readEnv() {
  const values = {};
  if (!fs.existsSync(envPath)) return values;
  const lines = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function backupAndWriteEnv(updates) {
  const previousText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "") : "";
  const lines = previousText ? previousText.split(/\r?\n/) : [];
  const seen = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !Object.prototype.hasOwnProperty.call(updates, match[1])) return line;
    seen.add(match[1]);
    return `${match[1]}=${updates[match[1]]}`;
  });
  for (const key of managedKeys) {
    if (Object.prototype.hasOwnProperty.call(updates, key) && !seen.has(key)) output.push(`${key}=${updates[key]}`);
  }
  const nextText = `${output.join("\r\n").replace(/(?:\r?\n)+$/, "")}\r\n`;
  if (nextText === previousText.replace(/\r?\n/g, "\r\n")) return null;
  let backupName = null;
  if (fs.existsSync(envPath)) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    backupName = `.env.local.backup-${stamp}`;
    fs.copyFileSync(envPath, path.join(projectRoot, backupName));
  }
  fs.writeFileSync(envPath, nextText, "utf8");
  return backupName;
}

function publicConfig() {
  const env = readEnv();
  return {
    DREAMHOUSE_HOST: env.DREAMHOUSE_HOST || "0.0.0.0",
    DREAMHOUSE_PORT: env.DREAMHOUSE_PORT || "3000",
    DREAMHOUSE_PORTS: env.DREAMHOUSE_PORTS || env.DREAMHOUSE_PORT || "3000",
    ROBOT_MONITOR_MODE: env.ROBOT_MONITOR_MODE || "real",
    ROBOT_MONITOR_BASE_URL: env.ROBOT_MONITOR_BASE_URL || "",
    ROBOT_API_ENDPOINT: env.ROBOT_API_ENDPOINT || "",
    NEXT_PUBLIC_ROBOT_VIDEO: env.NEXT_PUBLIC_ROBOT_VIDEO || "",
    NEXT_PUBLIC_SITE_CAMERA_URL: env.NEXT_PUBLIC_SITE_CAMERA_URL || "",
    NEXT_PUBLIC_SITE_VIDEO: env.NEXT_PUBLIC_SITE_VIDEO || "",
    DEMO_ROBOT_MODE: env.DEMO_ROBOT_MODE !== "false",
    DEMO_CAMERA_MODE: env.DEMO_CAMERA_MODE !== "false",
    BAMBU_PRINTER_IP: env.BAMBU_PRINTER_IP || "",
    BAMBU_DEVICE_ID: env.BAMBU_DEVICE_ID || "",
    BAMBU_ACCESS_CODE: "",
    BAMBU_ACCESS_CODE_CONFIGURED: Boolean(env.BAMBU_ACCESS_CODE),
    BAMBU_MODEL: env.BAMBU_MODEL || "",
    NEXT_PUBLIC_PRINTER_VIDEO: env.NEXT_PUBLIC_PRINTER_VIDEO || "",
    DEMO_PRINTER_MODE: env.DEMO_PRINTER_MODE !== "false",
    QWEN_API_KEY: "",
    QWEN_API_KEY_CONFIGURED: Boolean(env.QWEN_API_KEY),
    QWEN_COMPAT_BASE_URL: env.QWEN_COMPAT_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    QWEN_NATIVE_BASE_URL: env.QWEN_NATIVE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1",
    QWEN_LAYOUT_MODEL: env.QWEN_LAYOUT_MODEL || "qwen3.8-flash",
    QWEN_BOM_MODEL: env.QWEN_BOM_MODEL || "qwen3.8-flash",
    QWEN_IMAGE_MODEL: env.QWEN_IMAGE_MODEL || "qwen-image-3.0-pro"
  };
}

function isIPv4(value) {
  return net.isIP(String(value || "").trim()) === 4;
}

function asBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function normalizeConfig(input) {
  const current = readEnv();
  const value = (key) => String(input[key] == null ? "" : input[key]).trim();
  const host = value("DREAMHOUSE_HOST") || "0.0.0.0";
  const port = Number(value("DREAMHOUSE_PORT") || 3000);
  if (!isIPv4(host)) throw new Error("本机监听地址必须是有效的 IPv4，例如 0.0.0.0 或 192.168.1.20。 ");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("应用端口必须是 1 到 65535 之间的整数。");
  const portsText = value("DREAMHOUSE_PORTS") || current.DREAMHOUSE_PORTS || String(port);
  const ports = [...new Set(portsText.split(/[，,\s]+/).filter(Boolean).map(Number))];
  if (!ports.length || ports.some((item) => !Number.isInteger(item) || item < 1 || item > 65535))
    throw new Error("启动端口列表必须是 1 到 65535 之间的整数，例如 3001,3002,3003,3004。");
  if (ports.length > 8) throw new Error("一次最多启动 8 个端口实例。");
  const bambuIp = value("BAMBU_PRINTER_IP");
  if (bambuIp && !isIPv4(bambuIp)) throw new Error("拓竹打印机地址必须是有效的 IPv4。");
  const demoPrinter = asBoolean(input.DEMO_PRINTER_MODE);
  const accessCode = value("BAMBU_ACCESS_CODE") || current.BAMBU_ACCESS_CODE || "";
  if (!demoPrinter && (!bambuIp || !accessCode)) throw new Error("连接真实拓竹打印机时，必须填写打印机 IPv4 和访问码。");
  const monitorMode = ["real", "demo", "offline"].includes(value("ROBOT_MONITOR_MODE")) ? value("ROBOT_MONITOR_MODE") : "real";
  const updates = {
    DREAMHOUSE_HOST: host,
    DREAMHOUSE_PORT: String(port),
    DREAMHOUSE_PORTS: ports.join(","),
    ROBOT_MONITOR_MODE: monitorMode,
    ROBOT_MONITOR_BASE_URL: value("ROBOT_MONITOR_BASE_URL"),
    ROBOT_API_ENDPOINT: value("ROBOT_API_ENDPOINT"),
    NEXT_PUBLIC_ROBOT_VIDEO: value("NEXT_PUBLIC_ROBOT_VIDEO"),
    NEXT_PUBLIC_SITE_CAMERA_URL: value("NEXT_PUBLIC_SITE_CAMERA_URL"),
    NEXT_PUBLIC_SITE_VIDEO: value("NEXT_PUBLIC_SITE_VIDEO"),
    DEMO_ROBOT_MODE: asBoolean(input.DEMO_ROBOT_MODE) ? "true" : "false",
    DEMO_CAMERA_MODE: asBoolean(input.DEMO_CAMERA_MODE) ? "true" : "false",
    BAMBU_PRINTER_IP: bambuIp,
    BAMBU_DEVICE_ID: value("BAMBU_DEVICE_ID"),
    BAMBU_ACCESS_CODE: accessCode,
    BAMBU_MODEL: value("BAMBU_MODEL"),
    NEXT_PUBLIC_PRINTER_VIDEO: value("NEXT_PUBLIC_PRINTER_VIDEO"),
    DEMO_PRINTER_MODE: demoPrinter ? "true" : "false",
    QWEN_API_KEY: value("QWEN_API_KEY") || current.QWEN_API_KEY || "",
    QWEN_COMPAT_BASE_URL: value("QWEN_COMPAT_BASE_URL"),
    QWEN_NATIVE_BASE_URL: value("QWEN_NATIVE_BASE_URL"),
    QWEN_LAYOUT_MODEL: value("QWEN_LAYOUT_MODEL"),
    QWEN_BOM_MODEL: value("QWEN_BOM_MODEL"),
    QWEN_IMAGE_MODEL: value("QWEN_IMAGE_MODEL")
  };
  return { updates, host, port, ports };
}

function saveConfig(input) {
  const normalized = normalizeConfig(input);
  const backup = backupAndWriteEnv(normalized.updates);
  return { ...normalized, backup };
}

function isProcessRunning(process) {
  return Boolean(process && process.exitCode === null && !process.killed);
}

function isAppRunning() {
  return [...appProcesses.values()].some(isProcessRunning);
}

function findAppNode() {
  const appsDir = path.resolve(projectRoot, "..", "apps");
  try {
    const candidates = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^node-v22.*-win-x64$/i.test(entry.name))
      .map((entry) => path.join(appsDir, entry.name, "node.exe"))
      .filter((candidate) => fs.existsSync(candidate));
    if (candidates.length) return candidates.sort().reverse()[0];
  } catch {}
  return process.execPath;
}

function waitForProcessExit(process, timeoutMs = 5000) {
  if (!isProcessRunning(process)) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    process.once("exit", finish);
    process.kill();
  });
}

async function waitForAppExit(timeoutMs = 5000) {
  await Promise.all([...appProcesses.values()].map((process) => waitForProcessExit(process, timeoutMs)));
  appProcesses.clear();
}

async function startApp(input) {
  const saved = saveConfig(input);
  const desiredPorts = saved.ports;
  const runningPorts = [...appProcesses.entries()].filter(([, process]) => isProcessRunning(process)).map(([item]) => item);
  const samePorts = runningPorts.length === desiredPorts.length && desiredPorts.every((item) => runningPorts.includes(item));
  if (samePorts && !saved.backup) return { ...saved, alreadyRunning: true, pids: runningPorts.map((item) => appProcesses.get(item).pid) };
  if (runningPorts.length) await waitForAppExit();
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) throw new Error("缺少 Next.js 依赖。请先安装项目依赖（node_modules）。");
  fs.mkdirSync(logDir, { recursive: true });
  lastAppError = "";
  appStartedAt = new Date().toISOString();
  for (const instancePort of desiredPorts) {
    const logPath = path.join(logDir, `launcher-app-${instancePort}.log`);
    const log = fs.openSync(logPath, "a");
    const instanceEnv = {
      ...process.env,
      DREAMHOUSE_HOST: saved.host,
      DREAMHOUSE_PORT: String(instancePort),
      DREAMHOUSE_PORTS: desiredPorts.join(","),
      DREAMHOUSE_DIST_DIR: `.next-${instancePort}`,
    };
    const child = spawn(findAppNode(), [nextBin, "dev", "--webpack", "-p", String(instancePort), "--hostname", saved.host], {
      cwd: projectRoot,
      env: instanceEnv,
      windowsHide: true,
      stdio: ["ignore", log, log]
    });
    appProcesses.set(instancePort, child);
    child.once("error", (error) => { lastAppError = `端口 ${instancePort}：${error.message}`; });
    child.once("exit", (code) => {
      if (appProcesses.get(instancePort) === child) appProcesses.delete(instancePort);
      if (code && !lastAppError) lastAppError = `端口 ${instancePort} 应用进程已退出（代码 ${code}）`;
    });
  }
  return { ...saved, alreadyRunning: false, pids: desiredPorts.map((item) => appProcesses.get(item).pid) };
}

function stopApp() {
  if (!isAppRunning()) return false;
  for (const process of appProcesses.values()) process.kill();
  return true;
}

function appStatus() {
  const env = readEnv();
  const host = env.DREAMHOUSE_HOST || "0.0.0.0";
  const configuredPorts = (env.DREAMHOUSE_PORTS || env.DREAMHOUSE_PORT || "3000").split(/[，,\s]+/).filter(Boolean).map(Number);
  const instances = configuredPorts.map((port) => {
    const process = appProcesses.get(port);
    return {
      port,
      pid: isProcessRunning(process) ? process.pid : null,
      running: isProcessRunning(process),
      appUrl: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`,
      logPath: path.join("logs", `launcher-app-${port}.log`),
    };
  });
  return {
    running: instances.some((item) => item.running),
    pid: instances.find((item) => item.running)?.pid || null,
    startedAt: appStartedAt,
    error: lastAppError,
    appUrl: instances.find((item) => item.running)?.appUrl || instances[0]?.appUrl || `http://127.0.0.1:${env.DREAMHOUSE_PORT || 3000}`,
    logPath: path.join("logs", "launcher-app.log"),
    instances,
  };
}

function sendJson(response, status, data) {
  const body = Buffer.from(JSON.stringify(data), "utf8");
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("请求内容过大。"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("配置数据格式不正确。")); }
    });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${launcherPort}`);
    if (request.method === "GET" && url.pathname === "/") {
      const body = fs.readFileSync(htmlPath);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY"
      });
      response.end(body);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/config") return sendJson(response, 200, publicConfig());
    if (request.method === "GET" && url.pathname === "/api/status") return sendJson(response, 200, appStatus());
    if (request.method === "POST" && url.pathname === "/api/config") {
      const saved = saveConfig(await readJson(request));
      return sendJson(response, 200, { ok: true, message: saved.backup ? `配置已保存，原文件备份为 ${saved.backup}` : "配置没有变化，无需重复写入。" });
    }
    if (request.method === "POST" && url.pathname === "/api/start") {
      const body = await readJson(request);
      const result = await startApp(Object.keys(body).length ? body : readEnv());
      return sendJson(response, 200, { ok: true, message: result.alreadyRunning ? "DreamHouse 已经在运行。" : "配置已保存，DreamHouse 正在启动。", status: appStatus() });
    }
    if (request.method === "POST" && url.pathname === "/api/stop") {
      const stopped = stopApp();
      return sendJson(response, 200, { ok: true, message: stopped ? "已发送停止指令。" : "DreamHouse 当前没有运行。" });
    }
    sendJson(response, 404, { ok: false, message: "未找到该地址。" });
  } catch (error) {
    sendJson(response, 400, { ok: false, message: error.message || "操作失败。" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    openBrowser();
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

function openBrowser() {
  const url = `http://127.0.0.1:${launcherPort}`;
  const child = spawn("cmd.exe", ["/c", "start", "", url], { detached: true, windowsHide: true, stdio: "ignore" });
  child.unref();
}

server.listen(launcherPort, "127.0.0.1", () => {
  console.log(`DreamHouse launcher: http://127.0.0.1:${launcherPort}`);
  if (process.env.DREAMHOUSE_LAUNCHER_NO_BROWSER !== "1") openBrowser();
  if (process.env.DREAMHOUSE_LAUNCHER_AUTO_START === "1") {
    setTimeout(() => {
      startApp(readEnv()).catch((error) => {
        lastAppError = error instanceof Error ? error.message : String(error);
        console.error("[DreamHouse] auto-start failed", error);
      });
    }, 400);
  }
});
