/** Read native face/vertex topology without converting or modifying source nodes. */
export type NativeBlock = {
  id: string; type: string; parentId?: string | null; visible?: boolean;
  position?: number[]; rotation?: number | number[]; scale?: number[];
  topology?: { vertices?: Array<{ id: string; position: number[] }>; faces?: Array<{ id?: string; vertexIds: string[]; materialSlot?: string }> };
  slots?: Record<string, string>; material?: any;
  [key: string]: any;
};
export type BlockMeshData = { positions: number[]; groups: Array<{ start: number; count: number; materialIndex: number }>; slots: string[]; faceCount: number };
export type FaceTriangulator = (contour: Array<[number, number]>) => number[][];

export function needsBlockCompatibility(kindRegistered: boolean, node: NativeBlock) {
  return !kindRegistered && node.type === "block" && node.visible !== false;
}

export function buildBlockMeshData(node: NativeBlock, triangulate: FaceTriangulator): BlockMeshData {
  const vertices = new Map((node.topology?.vertices || []).map((vertex) => [vertex.id, vertex.position]));
  const batches = new Map<string, number[]>();
  let faceCount = 0;
  for (const face of node.topology?.faces || []) {
    const ids = face.vertexIds.filter((id, index, array) => index === 0 || id !== array[index - 1]);
    if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    if (ids.length < 3) throw new Error(`${node.id}: face ${face.id || "<unnamed>"} needs three vertices`);
    const points = ids.map((id) => {
      const point = vertices.get(id);
      if (!point || point.length !== 3 || !point.every((value) => typeof value === "number" && Number.isFinite(value))) throw new Error(`${node.id}: invalid vertex ${id}`);
      return point;
    });
    const normal = [0, 0, 0];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      normal[0] += (a[1] - b[1]) * (a[2] + b[2]);
      normal[1] += (a[2] - b[2]) * (a[0] + b[0]);
      normal[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    if (Math.hypot(...normal) < 1e-10) throw new Error(`${node.id}: degenerate face ${face.id || "<unnamed>"}`);
    const drop = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const contour = points.map((point) => point.filter((_value, axis) => axis !== drop) as [number, number]);
    const triangles = points.length === 3 ? [[0, 1, 2]] : triangulate(contour);
    if (triangles.length !== points.length - 2) throw new Error(`${node.id}: incomplete triangulation for face ${face.id || "<unnamed>"}`);
    const slot = face.materialSlot || "body";
    const batch = batches.get(slot) || [];
    for (const triangle of triangles) {
      if (triangle.length !== 3 || triangle.some((index) => !Number.isInteger(index) || !points[index])) throw new Error(`${node.id}: invalid triangle`);
      const ordered = [...triangle];
      const a = points[ordered[0]], b = points[ordered[1]], c = points[ordered[2]];
      const ab = b.map((value, i) => value - a[i]), ac = c.map((value, i) => value - a[i]);
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      if (cross.reduce((sum, value, i) => sum + value * normal[i], 0) < 0) [ordered[1], ordered[2]] = [ordered[2], ordered[1]];
      for (const index of ordered) batch.push(...points[index]);
    }
    batches.set(slot, batch);
    faceCount++;
  }
  const positions: number[] = [], groups: BlockMeshData["groups"] = [], slots: string[] = [];
  for (const [slot, batch] of batches) {
    groups.push({ start: positions.length / 3, count: batch.length / 3, materialIndex: slots.length });
    positions.push(...batch);
    slots.push(slot);
  }
  return { positions, groups, slots, faceCount };
}

export function blockLocalTransform(node: NativeBlock) {
  return {
    position: (node.position || [0, 0, 0]) as [number, number, number],
    rotation: (typeof node.rotation === "number" ? [0, node.rotation, 0] : node.rotation || [0, 0, 0]) as [number, number, number],
    scale: (node.scale || [1, 1, 1]) as [number, number, number],
  };
}
