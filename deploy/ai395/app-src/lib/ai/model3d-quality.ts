type Point = [number, number];
type Room = { id: string; name?: string; polygon: Point[]; expectedArea?: number };
type Wall = { id: string; start: Point; end: Point };
type Opening = { id: string; wallId: string; distance: number; width: number; height?: number; sillHeight?: number };
export type ModelStructure = { outerPolygon: Point[]; walls: Wall[]; rooms: Room[] };

function inside(point: Point, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function area(polygon: Point[]) {
  return Math.abs(polygon.reduce((sum, a, i) => { const b = polygon[(i + 1) % polygon.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
}

/** Additional live-mode checks. They never edit coordinates or fill omitted openings. */
export function inspectModel3dQuality(structure: ModelStructure, openings: { doors?: Opening[]; windows?: Opening[] }, scene?: { nodes: Record<string, any> }) {
  const issues: string[] = [];
  const doors = openings.doors || [], windows = openings.windows || [];
  const all = [...doors.map(v => ({ ...v, kind: 'door' })), ...windows.map(v => ({ ...v, kind: 'window' }))];
  const wallMap = new Map(structure.walls.map(w => [w.id, w]));
  const ids = new Set<string>();
  for (const opening of all) {
    const wall = wallMap.get(opening.wallId);
    if (ids.has(opening.id)) issues.push(`duplicate opening id ${opening.id}`);
    ids.add(opening.id);
    const length = wall ? Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) : 0;
    if (!wall || !Number.isFinite(opening.width) || opening.width <= 0 || !Number.isFinite(opening.distance) ||
        opening.distance - opening.width / 2 < -.001 || opening.distance + opening.width / 2 > length + .001)
      issues.push(`opening ${opening.id} has missing/invalid dimensions or exceeds its actual host wall`);
  }
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (a.wallId !== b.wallId) continue;
    const overlap = Math.min(a.distance + a.width / 2, b.distance + b.width / 2) - Math.max(a.distance - a.width / 2, b.distance - b.width / 2);
    const lower = (v: typeof a) => v.kind === 'window' ? v.sillHeight ?? .9 : 0;
    const upper = (v: typeof a) => lower(v) + (v.height ?? (v.kind === 'window' ? 1.5 : 2.1));
    if (overlap > .01 && Math.min(upper(a), upper(b)) - Math.max(lower(a), lower(b)) > .01)
      issues.push(`openings ${a.id}/${b.id} overlap on wall ${a.wallId}`);
  }
  for (const room of structure.rooms) {
    const measured = area(room.polygon), labelled = Number(room.expectedArea);
    if (labelled > 0 && Number.isFinite(labelled) && Math.abs(measured - labelled) / labelled > .35)
      issues.push(`room ${room.name || room.id}: polygon area ${measured.toFixed(2)}m2 differs from labelled expectedArea ${labelled}m2; mm dimensions and m2 area labels must not be confused`);
  }
  const graph = new Map(structure.rooms.map(r => [r.id, new Set<string>()]));
  const links: Record<string, Array<string | null>> = {};
  let exteriorDoors = 0;
  for (const door of doors) {
    const wall = wallMap.get(door.wallId);
    if (!wall || !Number.isFinite(door.distance)) continue;
    const dx = wall.end[0] - wall.start[0], dz = wall.end[1] - wall.start[1], length = Math.hypot(dx, dz);
    if (length < .05) continue;
    const center: Point = [wall.start[0] + dx * door.distance / length, wall.start[1] + dz * door.distance / length];
    const sides = [-1, 1].map(sign => {
      const p: Point = [center[0] - dz / length * .2 * sign, center[1] + dx / length * .2 * sign];
      const rooms = structure.rooms.filter(r => inside(p, r.polygon));
      if (rooms.length > 1) issues.push(`door ${door.id} has overlapping rooms on one side`);
      if (!rooms.length && inside(p, structure.outerPolygon)) issues.push(`door ${door.id} opens into unassigned interior space; include the corridor in an actual room polygon`);
      return { room: rooms[0]?.id || null, exterior: !rooms.length && !inside(p, structure.outerPolygon) };
    });
    links[door.id] = sides.map(s => s.room);
    if (sides.some(s => s.exterior) && sides.some(s => s.room)) exteriorDoors++;
    const [a, b] = sides.map(s => s.room);
    if (a && b && a !== b) { graph.get(a)?.add(b); graph.get(b)?.add(a); }
    if (scene?.nodes[door.id]) {
      const actual = (scene.nodes[door.id].connects || []).filter(Boolean).sort();
      const expected = links[door.id].filter(Boolean).sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        issues.push(`door ${door.id}: stored room links ${actual.join('/')} differ from geometric sides ${expected.join('/')}; split host wall ${door.wallId} at room boundaries so it does not span multiple unrelated rooms`);
    }
  }
  if (!exteriorDoors) issues.push('no exterior entrance door; read the actual entry opening, not a window');
  const visited = new Set<string>();
  const visit = (id: string) => { if (visited.has(id)) return; visited.add(id); for (const next of graph.get(id) || []) visit(next); };
  if (structure.rooms[0]) visit(structure.rooms[0].id);
  const disconnected = structure.rooms.filter(r => !visited.has(r.id)).map(r => r.name || r.id);
  if (disconnected.length) issues.push(`rooms disconnected by actual doors: ${disconnected.join(', ')}; retain every visible balcony/kitchen/room door`);
  return { valid: issues.length === 0, issues, exteriorDoors, connectedRoomCount: visited.size, roomCount: structure.rooms.length, geometricDoorLinks: links };
}
