import { qwenChatJson } from "./qwen-client";
import type {
  FloorplanOpening,
  FloorplanRoom,
  FloorplanSpec,
  FloorplanWall,
  Point,
} from "../floorplans/types";
import { polygonArea } from "../floorplans/types";

const ROOM_COLORS = [
  "#8298bd",
  "#c9b989",
  "#9da8ab",
  "#78a4aa",
  "#a9967c",
  "#d8d0aa",
  "#88aa9c",
  "#a69ac1",
];

function id(value: unknown, prefix: string, index: number) {
  const clean = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || `${prefix}_${index + 1}`;
}

function points(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((point) =>
      Array.isArray(point) && point.length >= 2
        ? [Number(point[0]), Number(point[1])]
        : null,
    )
    .filter(
      (point): point is Point =>
        Boolean(point) && Number.isFinite(point![0]) && Number.isFinite(point![1]),
    );
  const largest = Math.max(0, ...parsed.flat().map((v) => Math.abs(v)));
  const scale = largest > 100 ? 0.001 : 1;
  return parsed.map((point) => [
    Number((point[0] * scale).toFixed(4)),
    Number((point[1] * scale).toFixed(4)),
  ]);
}

function sameSegment(a: FloorplanWall, start: Point, end: Point) {
  const near = (p: Point, q: Point) =>
    Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.04;
  return (
    (near(a.start, start) && near(a.end, end)) ||
    (near(a.start, end) && near(a.end, start))
  );
}

export function normalizeFloorplan(
  raw: any,
  input: {
    residenceType: "one" | "two" | "three";
    variantId: string;
    imageUrl: string;
  },
): FloorplanSpec {
  // A polygon is implicitly closed by modulo indexing below. Repeating the
  // closing vertex or an adjacent vertex must not manufacture a zero-length wall.
  // Remove exact duplicates only; near-but-distinct real wall segments survive.
  const outerPolygon = points(raw?.outerPolygon).filter((point, index, polygon) =>
    index === 0 || point[0] !== polygon[index - 1][0] || point[1] !== polygon[index - 1][1],
  );
  if (outerPolygon.length > 1 && outerPolygon[0][0] === outerPolygon.at(-1)![0] && outerPolygon[0][1] === outerPolygon.at(-1)![1]) outerPolygon.pop();
  if (outerPolygon.length < 3)
    throw new Error("Qwen 户型识别未返回有效住宅外轮廓");

  const walls: FloorplanWall[] = (Array.isArray(raw?.walls) ? raw.walls : [])
    .map((wall: any, index: number) => ({
      id: id(wall?.id, "wall", index),
      start: points([wall?.start])[0],
      end: points([wall?.end])[0],
      structural:
        wall?.structural === "load_bearing" ? "load_bearing" : "partition",
    }))
    .filter(
      (wall: FloorplanWall) =>
        wall.start && wall.end &&
        Math.hypot(
          wall.end[0] - wall.start[0],
          wall.end[1] - wall.start[1],
        ) > 0.08,
    );

  for (let index = 0; index < outerPolygon.length; index += 1) {
    const start = outerPolygon[index];
    const end = outerPolygon[(index + 1) % outerPolygon.length];
    if (walls.some((wall) => sameSegment(wall, start, end))) continue;
    walls.push({
      id: `wall_outer_${index + 1}`,
      start,
      end,
      structural: "load_bearing",
    });
  }
  if (!walls.length) throw new Error("Qwen 户型识别未返回有效墙体");
  if (new Set(walls.map((wall) => wall.id)).size !== walls.length)
    throw new Error("Qwen 户型识别返回了重复 wall id");

  const rooms: FloorplanRoom[] = (Array.isArray(raw?.rooms) ? raw.rooms : [])
    .map((room: any, index: number) => {
      const polygon = points(room?.polygon);
      const area = polygonArea(polygon);
      return {
        id: id(room?.id, "zone", index).replace(/^room_/, "zone_"),
        name: String(room?.name || `空间 ${index + 1}`),
        semantic: String(room?.semantic || "room"),
        polygon,
        expectedArea: Number(
          (Number(room?.expectedArea) > 0
            ? Number(room.expectedArea)
            : area
          ).toFixed(2),
        ),
        color: ROOM_COLORS[index % ROOM_COLORS.length],
      };
    })
    .filter((room: FloorplanRoom) => room.polygon.length >= 3);
  if (!rooms.length) throw new Error("Qwen 户型识别未返回有效房间区域");
  if (new Set(rooms.map((room) => room.id)).size !== rooms.length)
    throw new Error("Qwen 户型识别返回了重复 room id");

  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  const normalizeOpenings = (
    value: unknown,
    prefix: "door" | "window",
  ): FloorplanOpening[] =>
    (Array.isArray(value) ? value : [])
      .map((opening: any, index: number) => {
        const wallId = id(opening?.wallId, "wall", index);
        const wall = wallById.get(wallId);
        if (!wall) return null;
        const wallLength = Math.hypot(
          wall.end[0] - wall.start[0],
          wall.end[1] - wall.start[1],
        );
        const width = Math.min(
          Math.max(Number(opening?.width) || (prefix === "door" ? 0.86 : 1.2), 0.45),
          Math.max(0.45, wallLength - 0.12),
        );
        return {
          id: id(opening?.id, prefix, index),
          name: String(opening?.name || `${prefix === "door" ? "门" : "窗"}${index + 1}`),
          wallId,
          distance: Math.min(
            Math.max(Number(opening?.distance) || wallLength / 2, width / 2 + 0.03),
            Math.max(width / 2 + 0.03, wallLength - width / 2 - 0.03),
          ),
          width,
        };
      })
      .filter((opening): opening is FloorplanOpening => Boolean(opening));

  const doors = normalizeOpenings(raw?.doors, "door");
  const windows = normalizeOpenings(raw?.windows, "window");
  const allIds = [
    ...walls.map((wall) => wall.id),
    ...rooms.map((room) => room.id),
    ...doors.map((door) => door.id),
    ...windows.map((window) => window.id),
  ];
  if (new Set(allIds).size !== allIds.length)
    throw new Error("Qwen 户型识别返回了重复 Pascal node id");

  return {
    id: input.variantId,
    name: String(raw?.name || input.variantId),
    factory: `QwenFloorplanImport(${input.variantId})`,
    sourceImage: input.imageUrl,
    outerPolygon,
    walls,
    rooms,
    doors,
    windows,
  };
}

export async function importFloorplanWithQwen(input: {
  residenceType: "one" | "two" | "three";
  variantId: string;
  imageUrl: string;
  imageDataUrl: string;
}) {
  const system = `你是建筑户型图识别器。请从用户提供的二维户型 PNG 中提取可编译为 Pascal SceneGraph 的 FloorplanSpec。必须以图片中的粗灰墙线、尺寸标注、门扇弧线、窗线和房间标签为准，不能套用任何默认模板。必须逐字列出图片内每一个带中文名称和面积标注的空间，包括阳台、玄关、储物间、电梯等，禁止遗漏或凭空增加。先分别求和图片顶部/底部的水平毫米尺寸链、左侧/右侧的垂直毫米尺寸链，以此确定整体宽高，再把所有毫米尺寸除以1000转换为米。坐标原点放在住宅最左上角，x 向右、z 向下，所有坐标必须非负。outerPolygon 必须沿最外侧粗墙中心线逐拐角闭合，完整反映凹凸轮廓，并包住全部 rooms。walls 同时包含外墙和室内隔墙；外墙 structural=load_bearing，内墙 structural=partition。每个 door/window 必须通过 wallId 绑定真实墙段，distance 是从 wall.start 沿墙方向到洞口中心的米数。rooms 的 polygon 必须对应图中实际空间边界，semantic 使用 bedroom/master_bedroom/living_room/kitchen/bathroom/storage/balcony/corridor/entrance/elevator 等。只返回 JSON 对象，不解释。`;
  const schema = {
    name: "户型名称",
    outerPolygon: [[0, 0], [8.5, 0], [8.5, 6.2], [0, 6.2]],
    walls: [
      { id: "wall_outer_1", start: [0, 0], end: [8.5, 0], structural: "load_bearing" },
      { id: "wall_partition_1", start: [3.2, 0], end: [3.2, 4.1], structural: "partition" },
    ],
    rooms: [
      { id: "zone_bedroom", name: "卧室", semantic: "bedroom", polygon: [[0, 0], [3.2, 0], [3.2, 4.1], [0, 4.1]], expectedArea: 13.1 },
    ],
    doors: [
      { id: "door_bedroom", name: "卧室门", wallId: "wall_partition_1", distance: 3.3, width: 0.86 },
    ],
    windows: [
      { id: "window_bedroom", name: "卧室外窗", wallId: "wall_outer_1", distance: 1.6, width: 1.4 },
    ],
  };
  const raw = await qwenChatJson(
    [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: input.imageDataUrl } },
          {
            type: "text",
            text: `识别这张 ${input.residenceType} 户型图（${input.variantId}）。返回结构必须与这个示例字段一致：${JSON.stringify(schema)}`,
          },
        ],
      },
    ],
    { stage: "floorplan-import" },
  );
  const first = normalizeFloorplan(raw?.floorplanSpec || raw, input);
  const audited = await qwenChatJson(
    [
      {
        role: "system",
        content:
          "你是建筑图纸复核工程师。对照原始户型图审查候选 FloorplanSpec，并直接返回修正后的完整 JSON。逐项核对：1) 图片中每个中文房间标签都存在且没有多余房间；2) outerPolygon 包住所有房间并包含所有凹凸拐角；3) 总宽高与图上毫米尺寸链求和一致；4) 每条室内粗墙都有 wall；5) 每个门扇弧线和窗线都存在且绑定正确 wallId；6) 房间面积与图片标注接近。不得只给审查意见，不得返回 markdown。",
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: input.imageDataUrl } },
          {
            type: "text",
            text: `这是第一遍候选结果，请根据同一张原图修正遗漏和坐标错误：${JSON.stringify(first)}`,
          },
        ],
      },
    ],
    { stage: "floorplan-import-audit" },
  );
  return normalizeFloorplan(audited?.floorplanSpec || audited, input);
}
