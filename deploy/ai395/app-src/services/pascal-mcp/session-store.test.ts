import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server";
import {
  beginFloorplanScene,
  clearPascalSessions,
  commitScene,
  getPascalSession,
  populateBasicFurniture,
  setFloorStructure,
  setOpenings,
  validateScene,
} from "./session-store";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

function structure(sessionId: string, sourceImageHash = hashA, revision = 1) {
  return setFloorStructure({
    sessionId,
    sourceImageHash,
    revision,
    scaleMethod: "standard-door-estimate",
    outerPolygon: [[0, 0], [6, 0], [6, 4], [0, 4]],
    walls: [
      { id: "wall_top", start: [0, 0], end: [6, 0], structural: "load_bearing" },
      { id: "wall_right", start: [6, 0], end: [6, 4], structural: "load_bearing" },
      { id: "wall_bottom", start: [6, 4], end: [0, 4], structural: "load_bearing" },
      { id: "wall_left", start: [0, 4], end: [0, 0], structural: "load_bearing" },
    ],
    rooms: [{ id: "room_living", name: "客厅", semantic: "living_room", polygon: [[0, 0], [6, 0], [6, 4], [0, 4]], expectedArea: 24, color: "#9da8ab" }],
  });
}

function begin(sessionId: string, sourceImageHash = hashA) {
  return beginFloorplanScene({ sessionId, sourceImageHash, sourceImage: `confirmed://${sessionId}` });
}

test("MCP exposes exactly the six floorplan tools with object schemas", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: "pascal-mcp-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name), [
      "begin_floorplan_scene",
      "set_floor_structure",
      "set_openings",
      "populate_basic_furniture",
      "validate_scene",
      "commit_scene",
    ]);
    for (const tool of tools.tools) assert.equal(tool.inputSchema.type, "object");
  } finally {
    await client.close();
    await server.close();
  }
});

test("sessions are isolated and reject source hashes or stale revisions", () => {
  clearPascalSessions();
  begin("session-a", hashA);
  begin("session-b", hashB);
  const a = structure("session-a", hashA);
  assert.equal(a.revision, 2);
  assert.equal(getPascalSession("session-b")?.revision, 1);
  assert.throws(() => structure("session-a", hashB), /sourceImageHash/);
  assert.throws(() => setOpenings({ sessionId: "session-a", sourceImageHash: hashA, revision: 1, doors: [], windows: [] }), /revision conflict/);
  assert.throws(() => begin("session-a", hashA), /already exists/);
});

test("invalid walls and out-of-range openings do not advance or corrupt a session", () => {
  clearPascalSessions();
  begin("invalid-geometry");
  assert.throws(() => setFloorStructure({
    sessionId: "invalid-geometry",
    sourceImageHash: hashA,
    revision: 1,
    outerPolygon: [[0, 0], [1, 0], [1, 1]],
    walls: [
      { id: "bad", start: [0, 0], end: [0, 0], structural: "partition" },
      { id: "w2", start: [0, 0], end: [1, 0], structural: "load_bearing" },
      { id: "w3", start: [1, 0], end: [1, 1], structural: "load_bearing" },
      { id: "w4", start: [1, 1], end: [0, 0], structural: "load_bearing" },
    ],
    rooms: [{ id: "room", name: "房间", semantic: "bedroom", polygon: [[0, 0], [1, 0], [1, 1]], expectedArea: 0.5, color: "#999999" }],
  }), /invalid wall geometry/);
  assert.equal(getPascalSession("invalid-geometry")?.revision, 1);

  const current = structure("invalid-geometry");
  assert.throws(() => setOpenings({
    sessionId: "invalid-geometry",
    sourceImageHash: hashA,
    revision: current.revision,
    doors: [{ id: "door_bad", name: "越界门", wallId: "wall_top", distance: 5.9, width: 1 }],
    windows: [],
  }), /超出墙体范围/);
  const unchanged = getPascalSession("invalid-geometry");
  assert.equal(unchanged?.revision, 2);
  assert.equal(unchanged?.status, "structure");
});

test("valid scene commits with Qwen Vulkan and scale provenance", () => {
  clearPascalSessions();
  const directory = mkdtempSync(join(tmpdir(), "pascal-mcp-"));
  process.env.PASCAL_SCENE_DIR = directory;
  process.env.LOCAL_TEXT_MODEL = "Qwen3.8-27B-UD-Q4_K_XL";
  try {
    begin("commit-scene");
    const floor = structure("commit-scene");
    const openings = setOpenings({
      sessionId: "commit-scene",
      sourceImageHash: hashA,
      revision: floor.revision,
      doors: [{ id: "door_entry", name: "入户门", wallId: "wall_top", distance: 1.5, width: 0.86, height: 2.1 }],
      windows: [{ id: "window_living", name: "客厅窗", wallId: "wall_bottom", distance: 3, width: 1.8, height: 1.4, sillHeight: 1 }],
    });
    const furnished = populateBasicFurniture({ sessionId: "commit-scene", sourceImageHash: hashA, revision: openings.revision });
    const validated = validateScene({ sessionId: "commit-scene", sourceImageHash: hashA, revision: furnished.revision });
    assert.equal(validated.validation.valid, true);
    const committed = commitScene({ sessionId: "commit-scene", sourceImageHash: hashA, revision: validated.revision });
    assert.equal(committed.status, "committed");
    assert.equal(committed.provenance.floorplanSource, "mcp-qwen38-vulkan");
    assert.equal(committed.provenance.sourceImageHash, hashA);
    assert.equal(committed.provenance.mcpSessionId, "commit-scene");
    assert.equal(committed.provenance.scaleMethod, "standard-door-estimate");
    assert.equal(committed.provenance.assumedDoorWidthM, 0.86);
    assert.equal(committed.provenance.scaleEstimated, true);
    assert.ok(String(committed.provenance.generatedAt).length > 10);
    assert.ok(existsSync(join(directory, "commit-scene.json")));
  } finally {
    delete process.env.PASCAL_SCENE_DIR;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("tool order is enforced", () => {
  clearPascalSessions();
  begin("ordered");
  const floor = structure("ordered");
  assert.throws(() => populateBasicFurniture({ sessionId: "ordered", sourceImageHash: hashA, revision: floor.revision }), /status is structure/);
  assert.throws(() => validateScene({ sessionId: "ordered", sourceImageHash: hashA, revision: floor.revision }), /status is structure/);
});
