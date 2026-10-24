import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function resolveFfmpeg() {
  const packagedName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const packaged = join(process.cwd(), "node_modules", "@ffmpeg-installer", `${process.platform}-${process.arch}`, packagedName);
  if (existsSync(packaged)) return packaged;
  try {
    await execFileAsync(process.platform === "win32" ? "where.exe" : "which", ["ffmpeg"], { windowsHide: true });
    return "ffmpeg";
  } catch { /* Continue with known local package locations. */ }
  const configured = String(process.env.FFMPEG_PATH || "").trim();
  if (configured && existsSync(configured)) return configured;
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const packageRoot = join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
    try {
      const packageNames = readdirSync(packageRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /ffmpeg/i.test(entry.name));
      for (const packageName of packageNames) {
        const packagePath = join(packageRoot, packageName.name);
        const builds = readdirSync(packagePath, { withFileTypes: true }).filter((entry) => entry.isDirectory());
        for (const build of builds) {
          const candidate = join(packagePath, build.name, "bin", "ffmpeg.exe");
          if (existsSync(candidate)) return candidate;
        }
      }
    } catch { /* Ignore inaccessible optional package directories. */ }
  }
  return null;
}

export async function GET(request: Request) {
  const printerIp = String(process.env.BAMBU_PRINTER_IP || "").trim();
  const accessCode = String(process.env.BAMBU_ACCESS_CODE || "").trim();
  if (!printerIp || !accessCode) {
    return Response.json({ available: false, message: "尚未配置拓竹打印机 IPv4 和访问码。" }, { status: 503 });
  }
  const ffmpegBinary = await resolveFfmpeg();
  if (!ffmpegBinary) {
    return Response.json({ available: false, message: "视频转码网关未找到 ffmpeg。请安装 ffmpeg 并将其加入 PATH。" }, { status: 503 });
  }

  const source = `rtsps://${encodeURIComponent("bblp")}:${encodeURIComponent(accessCode)}@${printerIp}:322/streaming/live/1`;
  const ffmpeg = (await import("node:child_process")).spawn(ffmpegBinary, [
    "-hide_banner", "-loglevel", "error", "-rtsp_transport", "tcp",
    "-i", source,
    "-an", "-c:v", "mjpeg", "-q:v", "5", "-r", "12", "-f", "mpjpeg", "-",
  ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stderrSnippet = "";
  ffmpeg.stderr?.on("data", (chunk: Buffer) => {
    if (stderrSnippet.length < 800) stderrSnippet += chunk.toString("utf8");
  });
  const cleanup = () => { if (!ffmpeg.killed) ffmpeg.kill(); };
  request.signal.addEventListener("abort", cleanup, { once: true });
  ffmpeg.once("close", (code) => {
    request.signal.removeEventListener("abort", cleanup);
    if (code && stderrSnippet.trim()) console.warn("[Bambu video] ffmpeg exited", { code, error: stderrSnippet.trim().slice(0, 800) });
  });
  const stream = Readable.toWeb(ffmpeg.stdout!) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "multipart/x-mixed-replace; boundary=ffmpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
