import type { FloorplanOpening, FloorplanRoom, FloorplanWall, Point } from "./types";
import { pointInPolygon } from "./blueprint";

/**
 * Deterministic room-partition solver.
 *
 * The LLM reliably recognises *what* is in a floorplan (room names, roughly
 * where walls run) but cannot be trusted to emit a topologically valid planar
 * partition: measured runs left 20-24% of the outline uncovered and placed room
 * vertices outside the building. Those defects used to pass validation and get
 * committed.
 *
 * Here the geometry is solved instead of guessed: rooms are the connected
 * components of (outer polygon minus walls). Tiling and containment therefore
 * hold by construction, and the LLM output only supplies labels and rough
 * positions.
 */

const GRID = 0.05;          // raster resolution, 5 cm
const WALL_HALF = 0.065;    // cells within this distance of a wall are blocked
const MIN_ROOM_AREA = 0.7;  // m^2, smaller components are wall interstices
const SNAP = 0.01;          // metres

export const snap = (value: number, grid = SNAP) => Math.round(value / grid) * grid;

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared))
    : 0;
  return Math.hypot(point[0] - (start[0] + dx * t), point[1] - (start[1] + dz * t));
}

function polygonArea(polygon: Point[]) {
  return Math.abs(
    polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2,
  );
}

function boundsOf(points: Point[]) {
  const xs = points.map((point) => point[0]);
  const zs = points.map((point) => point[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/** Force every wall segment to be exactly horizontal or vertical. */
export function orthogonalizeWalls(walls: FloorplanWall[]): FloorplanWall[] {
  return walls.map((wall) => {
    const start: Point = [snap(wall.start[0]), snap(wall.start[1])];
    const end: Point = [snap(wall.end[0]), snap(wall.end[1])];
    const dx = Math.abs(end[0] - start[0]);
    const dz = Math.abs(end[1] - start[1]);
    const fixed: Point = dx >= dz ? [end[0], start[1]] : [start[0], end[1]];
    return { ...wall, start, end: fixed };
  }).filter((wall) => Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) >= 0.15);
}

/**
 * Push wall endpoints onto the outline when they stop just short of it, so the
 * flood fill cannot leak between rooms through a 2 cm gap at a junction.
 */
export function healWalls(walls: FloorplanWall[], outerPolygon: Point[]): FloorplanWall[] {
  const project = (point: Point): Point => {
    let best: Point | null = null;
    let bestDistance = 0.28;
    for (let index = 0; index < outerPolygon.length; index += 1) {
      const start = outerPolygon[index];
      const end = outerPolygon[(index + 1) % outerPolygon.length];
      const distance = distanceToSegment(point, start, end);
      if (distance < bestDistance) {
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const lengthSquared = dx * dx + dz * dz;
        const t = lengthSquared
          ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared))
          : 0;
        best = [snap(start[0] + dx * t), snap(start[1] + dz * t)];
        bestDistance = distance;
      }
    }
    return best ?? point;
  };
  return walls.map((wall) => ({ ...wall, start: project(wall.start), end: project(wall.end) }));
}

type Grid = {
  minX: number;
  minZ: number;
  width: number;
  height: number;
  inside: Uint8Array;  // 1 = inside the outline
  free: Uint8Array;    // 1 = usable floor (inside and clear of any wall)
};

function rasterize(outerPolygon: Point[], walls: FloorplanWall[]): Grid {
  const bound = boundsOf(outerPolygon);
  const minX = Math.floor(bound.minX / GRID) * GRID;
  const minZ = Math.floor(bound.minZ / GRID) * GRID;
  const width = Math.ceil((bound.maxX - minX) / GRID) + 1;
  const height = Math.ceil((bound.maxZ - minZ) / GRID) + 1;
  const inside = new Uint8Array(width * height);
  const free = new Uint8Array(width * height);
  for (let ix = 0; ix < width; ix += 1) {
    for (let iz = 0; iz < height; iz += 1) {
      const centre: Point = [minX + (ix + 0.5) * GRID, minZ + (iz + 0.5) * GRID];
      if (!pointInPolygon(centre, outerPolygon)) continue;
      inside[iz * width + ix] = 1;
      const blocked = walls.some((wall) => distanceToSegment(centre, wall.start, wall.end) <= WALL_HALF);
      if (!blocked) free[iz * width + ix] = 1;
    }
  }
  return { minX, minZ, width, height, inside, free };
}

/** Trace the outline of one connected component and simplify it to a rectilinear polygon. */
function traceComponent(grid: Grid, cells: number[]): Point[] {
  const inComponent = new Set(cells);
  const edges = new Map<string, string[]>();
  const key = (x: number, z: number) => `${x},${z}`;
  const push = (from: string, to: string) => {
    const list = edges.get(from) ?? [];
    list.push(to);
    edges.set(from, list);
  };
  for (const index of cells) {
    const ix = index % grid.width;
    const iz = Math.floor(index / grid.width);
    const has = (x: number, z: number) => x >= 0 && z >= 0 && x < grid.width && z < grid.height && inComponent.has(z * grid.width + x);
    if (!has(ix, iz - 1)) push(key(ix, iz), key(ix + 1, iz));
    if (!has(ix + 1, iz)) push(key(ix + 1, iz), key(ix + 1, iz + 1));
    if (!has(ix, iz + 1)) push(key(ix + 1, iz + 1), key(ix, iz + 1));
    if (!has(ix - 1, iz)) push(key(ix, iz + 1), key(ix, iz));
  }
  const loops: Point[][] = [];
  const remaining = new Map<string, string[]>();
  for (const [from, to] of edges) remaining.set(from, [...to]);
  while (remaining.size) {
    const startKey = remaining.keys().next().value as string;
    const loop: string[] = [startKey];
    let current = startKey;
    while (true) {
      const outgoing = remaining.get(current);
      if (!outgoing || !outgoing.length) break;
      const next = outgoing.shift() as string;
      if (!outgoing.length) remaining.delete(current);
      loop.push(next);
      current = next;
      if (current === startKey) break;
    }
    if (loop.length >= 5) {
      const points = loop.slice(0, -1).map((entry) => {
        const [x, z] = entry.split(",").map(Number);
        return [snap(grid.minX + x * GRID), snap(grid.minZ + z * GRID)] as Point;
      });
      loops.push(points);
    }
  }
  if (!loops.length) return [];
  loops.sort((a, b) => polygonArea(b) - polygonArea(a));
  const raw = loops[0];
  // drop duplicate and collinear vertices
  const deduped: Point[] = [];
  for (const point of raw) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > 1e-6) deduped.push(point);
  }
  const simplified: Point[] = [];
  for (let index = 0; index < deduped.length; index += 1) {
    const previous = deduped[(index - 1 + deduped.length) % deduped.length];
    const current = deduped[index];
    const next = deduped[(index + 1) % deduped.length];
    const cross = (current[0] - previous[0]) * (next[1] - current[1]) - (current[1] - previous[1]) * (next[0] - current[0]);
    if (Math.abs(cross) > 1e-9) simplified.push(current);
  }
  return simplified.length >= 3 ? simplified : deduped;
}

function labelFor(
  polygon: Point[],
  labelledRooms: FloorplanRoom[],
  fallbackIndex: number,
): { name: string; semantic: string } {
  const centre: Point = [
    polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
    polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
  ];
  const containing = labelledRooms.find((room) => pointInPolygon(centre, room.polygon));
  if (containing) return { name: containing.name, semantic: containing.semantic };
  let best: FloorplanRoom | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const room of labelledRooms) {
    const roomCentre: Point = [
      room.polygon.reduce((sum, point) => sum + point[0], 0) / room.polygon.length,
      room.polygon.reduce((sum, point) => sum + point[1], 0) / room.polygon.length,
    ];
    const distance = Math.hypot(roomCentre[0] - centre[0], roomCentre[1] - centre[1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = room;
    }
  }
  if (best && bestDistance < 6) return { name: best.name, semantic: best.semantic };
  return { name: `房间${fallbackIndex}`, semantic: "bedroom" };
}

const COLOURS = ["#c9d4d6", "#a8bcc0", "#93a9ae", "#bcc7a8", "#d6cfc0", "#c0b6a8", "#aab6c0", "#cbb6b6"];

export function solveRoomPartition(input: {
  outerPolygon: Point[];
  walls: FloorplanWall[];
  rooms: FloorplanRoom[];
}): { outerPolygon: Point[]; walls: FloorplanWall[]; rooms: FloorplanRoom[]; notes: string[] } {
  const notes: string[] = [];
  const outerPolygon = input.outerPolygon.map((point) => [snap(point[0]), snap(point[1])] as Point);
  let walls = healWalls(orthogonalizeWalls(input.walls), outerPolygon);
  const grid = rasterize(outerPolygon, walls);

  // connected components of the free space
  const seen = new Uint8Array(grid.width * grid.height);
  const components: number[][] = [];
  for (let index = 0; index < grid.free.length; index += 1) {
    if (!grid.free[index] || seen[index]) continue;
    const queue = [index];
    const component: number[] = [];
    seen[index] = 1;
    while (queue.length) {
      const current = queue.pop() as number;
      component.push(current);
      const ix = current % grid.width;
      const iz = Math.floor(current / grid.width);
      const neighbours = [
        ix > 0 ? current - 1 : -1,
        ix < grid.width - 1 ? current + 1 : -1,
        iz > 0 ? current - grid.width : -1,
        iz < grid.height - 1 ? current + grid.width : -1,
      ];
      for (const next of neighbours) {
        if (next >= 0 && grid.free[next] && !seen[next]) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    components.push(component);
  }

  // A room in a real plan extends to the wall centreline. The raster blocks a
  // band around every wall, so without this step the wall footprint stays
  // unassigned and coverage swings with wall count, which intermittently
  // tripped the coverage validator. Grow every component into the band.
  const owner = new Int32Array(grid.width * grid.height).fill(-1);
  components.forEach((component, index) => { for (const cell of component) owner[cell] = index; });
  let frontier = components.map((component) => component);
  for (let depth = 0; depth < 600; depth += 1) {
    let moved = false;
    const next: number[][] = components.map(() => []);
    for (let index = 0; index < frontier.length; index += 1) {
      for (const cell of frontier[index]) {
        const ix = cell % grid.width;
        const iz = Math.floor(cell / grid.width);
        const neighbours = [
          ix > 0 ? cell - 1 : -1,
          ix < grid.width - 1 ? cell + 1 : -1,
          iz > 0 ? cell - grid.width : -1,
          iz < grid.height - 1 ? cell + grid.width : -1,
        ];
        for (const neighbour of neighbours) {
          if (neighbour < 0 || owner[neighbour] !== -1 || !grid.inside[neighbour]) continue;
          owner[neighbour] = index;
          next[index].push(neighbour);
          moved = true;
        }
      }
    }
    frontier = next;
    if (!moved) break;
  }
  const grown: number[][] = components.map(() => []);
  for (let cell = 0; cell < owner.length; cell += 1) if (owner[cell] >= 0) grown[owner[cell]].push(cell);
  notes.push(`房间已延伸至墙中心线（含 ${owner.filter((v) => v >= 0).length} 个栅格）`);

  const traced = grown
    .map((component) => ({ component, polygon: traceComponent(grid, component) }))
    .filter(({ polygon }) => polygon.length >= 3 && polygonArea(polygon) >= MIN_ROOM_AREA)
    .sort((a, b) => polygonArea(b.polygon) - polygonArea(a.polygon));

  const rooms: FloorplanRoom[] = traced.map(({ polygon }, index) => {
    const label = labelFor(polygon, input.rooms, index + 1);
    return {
      id: `room_${index + 1}`,
      name: label.name,
      semantic: label.semantic,
      polygon,
      expectedArea: Math.round(polygonArea(polygon) * 100) / 100,
      color: COLOURS[index % COLOURS.length],
    };
  });

  const dropped = grown.length - rooms.length;
  if (dropped > 0) notes.push(`丢弃 ${dropped} 个过小的空腔（墙体缝隙）`);
  if (!rooms.length) throw new Error("分区求解失败：未能从外轮廓与墙体中解出任何房间");

  const covered = rooms.reduce((sum, room) => sum + polygonArea(room.polygon), 0);
  const outline = polygonArea(outerPolygon);
  notes.push(`房间 ${rooms.length} 个，覆盖 ${(covered / outline * 100).toFixed(1)}% 外轮廓`);

  return { outerPolygon, walls, rooms, notes };
}

/**
 * Clamp openings onto their wall and repair doors that ended up on a wall
 * which does not separate two rooms (a frequent LLM mistake). A door that
 * cannot be placed on a two-room boundary is dropped rather than committed
 * with a wrong connection.
 */
export function repairOpenings(input: {
  walls: FloorplanWall[];
  rooms: FloorplanRoom[];
  doors: FloorplanOpening[];
  windows: FloorplanOpening[];
}) {
  const notes: string[] = [];
  const roomSides = (wall: FloorplanWall, offset: number, width: number) => {
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const length = Math.hypot(dx, dz) || 1;
    const centre = offset + width / 2;
    const cx = wall.start[0] + (dx / length) * centre;
    const cz = wall.start[1] + (dz / length) * centre;
    const nx = -dz / length;
    const nz = dx / length;
    const probe = Math.max(0.3, width);
    const side = (sign: number) => {
      for (const scale of [1, 1.6, 2.4]) {
        const point: Point = [cx + nx * probe * scale * sign, cz + nz * probe * scale * sign];
        const hit = input.rooms.find((room) => pointInPolygon(point, room.polygon));
        if (hit) return hit.id;
      }
      return null;
    };
    return { centre: [cx, cz] as Point, connects: [side(1), side(-1)] as [string | null, string | null] };
  };

  const clamp = (opening: FloorplanOpening, wall: FloorplanWall): FloorplanOpening => {
    const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
    const width = Math.min(Math.max(Number(opening.width) || 0.86, 0.5), Math.max(0.6, length - 0.12));
    const minimum = width / 2 + 0.06;
    const maximum = Math.max(minimum, length - width / 2 - 0.06);
    const centre = Math.min(Math.max(Number(opening.distance) || length / 2, minimum), maximum);
    return { ...opening, width, distance: centre };
  };

  const doors: FloorplanOpening[] = [];
  const usedIds = new Set<string>();
  for (const door of input.doors) {
    const wall = input.walls.find((candidate) => candidate.id === door.wallId);
    if (!wall) { notes.push(`门 ${door.id} 的墙体不存在，已丢弃`); continue; }
    const clamped = clamp(door, wall);
    let sides = roomSides(wall, clamped.distance - clamped.width / 2, clamped.width);
    if (door.id !== "door_entry" && (!sides.connects[0] || !sides.connects[1])) {
      // try the closest wall that actually separates two rooms
      let best: { wall: FloorplanWall; offset: number; distance: number } | null = null;
      for (const candidate of input.walls) {
        const length = Math.hypot(candidate.end[0] - candidate.start[0], candidate.end[1] - candidate.start[1]);
        if (length < clamped.width + 0.3) continue;
        for (let t = clamped.width / 2 + 0.06; t <= length - clamped.width / 2 - 0.06; t += 0.25) {
          const local = roomSides(candidate, t - clamped.width / 2, clamped.width);
          if (!local.connects[0] || !local.connects[1]) continue;
          const distance = Math.hypot(local.centre[0] - sides.centre[0], local.centre[1] - sides.centre[1]);
          if (!best || distance < best.distance) best = { wall: candidate, offset: t, distance };
        }
      }
      if (best && best.distance <= 2.5) {
        notes.push(`门 ${door.id} 已从 ${door.wallId} 移到 ${best.wall.id}（原位置未连接两个房间）`);
        const moved = { ...clamped, wallId: best.wall.id, distance: best.offset };
        sides = roomSides(best.wall, best.offset - clamped.width / 2, clamped.width);
        const id = usedIds.has(moved.id) ? `${moved.id}_2` : moved.id;
        usedIds.add(id);
        doors.push({ ...moved, id });
        continue;
      }
      notes.push(`门 ${door.id} 未连接两个房间且无法就近修正，已丢弃`);
      continue;
    }
    const id = usedIds.has(clamped.id) ? `${clamped.id}_2` : clamped.id;
    usedIds.add(id);
    doors.push({ ...clamped, id });
  }

  const windows = input.windows.flatMap((window) => {
    const wall = input.walls.find((candidate) => candidate.id === window.wallId);
    if (!wall) { notes.push(`窗 ${window.id} 的墙体不存在，已丢弃`); return []; }
    return [clamp(window, wall)];
  });

  if (!doors.some((door) => door.id === "door_entry") && doors.length) {
    const entry = { ...doors[0], id: "door_entry", name: doors[0].name || "入户门" };
    doors[0] = entry;
  }

  return { doors, windows, notes };
}
