import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { getAiConfig } from "./config";

export type McpTool = { name: string; description?: string; inputSchema: Record<string, unknown> };

type McpRequestOptions = { signal?: AbortSignal; timeout?: number };

export async function withPascalMcp<T>(work: (client: Client) => Promise<T>, options: McpRequestOptions = {}) {
  const client = new Client({ name: "dreamhouse-local-agent", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(getAiConfig().mcpUrl));
  try {
    await client.connect(transport, { timeout: 30_000, ...options });
    return await work(client);
  } finally {
    await transport.close().catch(() => undefined);
  }
}

export async function listPascalTools(client: Client, options: McpRequestOptions = {}): Promise<McpTool[]> {
  const result = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema, { timeout: 30_000, ...options });
  return result.tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema as Record<string, unknown> }));
}

export async function callPascalTool(client: Client, name: string, args: Record<string, unknown>, options: McpRequestOptions = {}) {
  const result = await client.request({ method: "tools/call", params: { name, arguments: args } }, CallToolResultSchema, { timeout: 30_000, ...options });
  if (result.isError) throw new Error(`Pascal MCP ${name} failed: ${result.content.map((item: any) => item.text || "").join(" ")}`);
  if (result.structuredContent) return result.structuredContent as any;
  const text = result.content.find((item: any) => item.type === "text") as any;
  if (!text?.text) throw new Error(`Pascal MCP ${name} returned no structured result`);
  return JSON.parse(text.text);
}
