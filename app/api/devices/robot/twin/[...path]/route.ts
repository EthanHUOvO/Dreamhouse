const PROXY_PREFIX = "/api/devices/robot/twin";

export const dynamic = "force-dynamic";

function configuredBaseUrl() {
  return (process.env.ROBOT_MONITOR_BASE_URL || "").replace(/\/$/, "");
}

function rewriteRootPaths(body: string) {
  return body
    .replace(/(["'`])\/(?!\/)/g, `$1${PROXY_PREFIX}/`)
    .replace(/url\(\s*\/(?!\/)/gi, `url(${PROXY_PREFIX}/`);
}

function isTextResponse(contentType: string) {
  return /(?:text\/|javascript|json|xml|svg)/i.test(contentType);
}

function shouldRewriteRootPaths(resourcePath: string, contentType: string) {
  if (/html|json/i.test(contentType)) return true;
  if (resourcePath === "simulation.js" || resourcePath === "simulation.css") return true;
  return resourcePath.startsWith("assets/door2-joint/") && /javascript/i.test(contentType);
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) return new Response("机械臂地址尚未配置", { status: 503 });

  const { path } = await context.params;
  if (!Array.isArray(path) || !path.length || path.some((segment) => !segment || segment === "." || segment === "..")) {
    return new Response("无效的数字孪生资源地址", { status: 400 });
  }

  const resourcePath = path.join("/");
  const incoming = new URL(request.url);
  const upstreamUrl = new URL(`/${path.map(encodeURIComponent).join("/")}${incoming.search}`, `${baseUrl}/`);
  try {
    const headers = new Headers();
    const range = request.headers.get("range");
    const accept = request.headers.get("accept");
    if (range) headers.set("range", range);
    if (accept) headers.set("accept", accept);
    const upstream = await fetch(upstreamUrl, { method: request.method, headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(12_000) });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.set("cache-control", "no-store");

    const contentType = responseHeaders.get("content-type") || "application/octet-stream";
    if (isTextResponse(contentType)) {
      const sourceBody = await upstream.text();
      const body = shouldRewriteRootPaths(resourcePath, contentType) ? rewriteRootPaths(sourceBody) : sourceBody;
      return new Response(request.method === "HEAD" ? null : body, { status: upstream.status, headers: responseHeaders });
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "连接失败";
    return new Response(`数字孪生服务暂时不可用：${message}`, { status: 502 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
