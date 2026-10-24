import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";
import { pathToFileURL } from "node:url";
import {
  beginFloorplanScene,
  commitScene,
  getPascalSession,
  populateBasicFurniture,
  setFloorStructure,
  setOpenings,
  validateScene,
} from "./session-store";

const point = z.tuple([z.number(), z.number()]);
const identity = {
  sessionId: z.string().min(1),
  sourceImageHash: z.string().min(8),
  revision: z.number().int().nonnegative(),
};
const wall = z.object({
  id: z.string().min(1),
  start: point,
  end: point,
  structural: z.enum(["load_bearing", "partition"]),
});
const room = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  semantic: z.string().min(1),
  polygon: z.array(point).min(3),
  expectedArea: z.number().nonnegative(),
  color: z.string().default("#9da8ab"),
});
const opening = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  wallId: z.string().min(1),
  distance: z.number().nonnegative().describe("Opening center distance from wall start in metres"),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  sillHeight: z.number().nonnegative().optional(),
});

function toolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

export function createServer() {
  const server = new McpServer({ name: "dreamhouse-pascal-editor", version: "1.0.0" });
  server.registerTool("begin_floorplan_scene", {
    description: "Start a new Pascal floorplan generation session for one confirmed image. Always call this first. Dimensions without labels are estimated from a standard 0.86 metre door.",
    inputSchema: {
      sessionId: z.string().min(1),
      sourceImageHash: z.string().min(8),
      sourceImage: z.string().min(1).describe("Stable local source image identifier; do not send the base64 payload"),
    },
  }, async (args) => toolResult(beginFloorplanScene(args)));
  server.registerTool("set_floor_structure", {
    description: "Create the metre-based outer boundary, walls, and room polygons extracted from the confirmed floorplan image. Use 0.86m as the scale of a standard visible door when dimensions are absent.",
    inputSchema: {
      ...identity,
      name: z.string().optional(),
      scaleMethod: z.enum(["drawing-dimensions", "standard-door-estimate"]).default("standard-door-estimate"),
      outerPolygon: z.array(point).min(3),
      walls: z.array(wall).min(4),
      rooms: z.array(room).min(1),
    },
  }, async (args) => toolResult(setFloorStructure(args as Parameters<typeof setFloorStructure>[0])));
  server.registerTool("set_openings", {
    description: "Add every visible door and window to existing walls. distance is the opening centre measured from wall.start in metres.",
    inputSchema: { ...identity, doors: z.array(opening), windows: z.array(opening) },
  }, async (args) => toolResult(setOpenings(args as Parameters<typeof setOpenings>[0])));
  server.registerTool("populate_basic_furniture", {
    description: "Place one basic furniture preset in each recognized room without changing walls, rooms, doors, or windows.",
    inputSchema: identity,
  }, async (args) => toolResult(populateBasicFurniture(args)));
  server.registerTool("validate_scene", {
    description: "Validate the compiled Pascal SceneGraph. Call after all geometry and furniture tools and repair any reported issue before committing.",
    inputSchema: identity,
  }, async (args) => toolResult(validateScene(args)));
  server.registerTool("commit_scene", {
    description: "Persist a successfully validated Pascal SceneGraph. This is the final tool call.",
    inputSchema: identity,
  }, async (args) => toolResult(commitScene(args)));
  return server;
}

export function createPascalMcpApp() {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.get("/health", (req, res) => {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    res.json({ ok: true, service: "dreamhouse-pascal-editor", protocol: "mcp-streamable-http", session: sessionId ? getPascalSession(sessionId) : undefined });
  });
  app.post("/mcp", async (req, res) => {
    const server = createServer();
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("[Pascal MCP] request failed", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal MCP error" }, id: null });
    }
  });
  app.get("/mcp", (_req, res) => res.status(405).json({ error: "Use Streamable HTTP POST" }));
  app.delete("/mcp", (_req, res) => res.status(405).json({ error: "Stateless transport has no session to terminate" }));
  return app;
}

export function startPascalMcpServer() {
  const port = Number(process.env.PASCAL_MCP_PORT || 3100);
  return createPascalMcpApp().listen(port, (error?: Error) => {
    if (error) throw error;
    console.log(`Pascal MCP listening on http://0.0.0.0:${port}/mcp`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startPascalMcpServer();
