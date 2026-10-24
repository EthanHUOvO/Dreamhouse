/** Deterministic SVG geometry. No catalogue coordinates or model inference. */
export type Point = [number, number];
type Element = { tag: string; attrs: Record<string, string>; text: string; parent?: Element; children: Element[]; start: number; end: number };
const decode = (s: string) => s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, t) => t[0] === "#" ? String.fromCodePoint(t[1] === "x" ? parseInt(t.slice(2), 16) : +t.slice(1)) : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as any)[t]);
export function parseSvg(xml: string) {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|\b(?:href|onload|onclick)\s*=/i.test(xml)) throw new Error("SVG_UNSAFE_OR_TOO_LARGE");
  const nodes: Element[] = [], stack: Element[] = [], ids = new Set<string>();
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[\w:-]+(?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/?>|[^<]+/g;
  let last = 0;
  for (const m of xml.matchAll(re)) {
    if (m.index !== last) throw new Error("SVG_XML_INVALID");
    last = m.index! + m[0].length;
    const s = m[0];
    if (s.startsWith("<?") || s.startsWith("<!--")) continue;
    if (s.startsWith("</")) {
      const tag = s.slice(2, -1).trim().split(":").pop();
      const el = stack.pop(); if (!el || el.tag !== tag) throw new Error("SVG_XML_UNBALANCED"); el.end = last;
    } else if (s.startsWith("<")) {
      const tag = /^<([\w:-]+)/.exec(s)![1].split(":").pop()!;
      const attrs: Record<string, string> = {};
      for (const a of s.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        if (a[1] in attrs) throw new Error("SVG_DUPLICATE_ATTRIBUTE"); attrs[a[1]] = decode(a[2] ?? a[3]);
      }
      if(attrs.id){if(ids.has(attrs.id))throw new Error(`SVG_DUPLICATE_ID:${attrs.id}`);ids.add(attrs.id);}
      const el: Element = { tag, attrs, text: "", parent: stack.at(-1), children: [], start: m.index!, end: last };
      el.parent?.children.push(el); nodes.push(el); if (!/\/>$/.test(s)) stack.push(el);
    } else if (stack.length) stack.at(-1)!.text += decode(s);
  }
  if (last !== xml.length || stack.length || nodes.filter(n => !n.parent).length !== 1 || nodes[0]?.tag !== "svg") throw new Error("SVG_XML_INVALID");
  return nodes;
}
const inherited = (el: Element, key: string): string => el.attrs[key] ?? (el.parent ? inherited(el.parent, key) : "");
const inGroup = (el: Element, id: string): boolean => (el.attrs.id === id || el.attrs["data-kind"] === id) || !!el.parent && inGroup(el.parent, id);
const number = (el: Element, key: string, fallback?: number) => {
  const v = el.attrs[key] === undefined ? fallback : Number(el.attrs[key]);
  if (!Number.isFinite(v)) throw new Error(`SVG_NUMBER_INVALID:${el.attrs.id || el.tag}.${key}`); return v!;
};
const median = (v: number[]) => { const a = v.toSorted((a, b) => a - b); return a[Math.floor(a.length / 2)]; };
export const polygonArea = (p: Point[]) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
export function pointInPolygon(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  } return inside;
}
/** Only closed M/L/H/V filled contours are accepted; never approximate a curve as a wall. */
function contours(d: string): Point[][] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || [];
  if (d.replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?|[\s,]/gi, "")) throw new Error("SVG_PATH_INVALID");
  let i = 0, cmd = "", x = 0, y = 0, p: Point[] = []; const result: Point[][] = [];
  const read = () => { const n = Number(tokens[i++]); if (!Number.isFinite(n)) throw new Error("SVG_PATH_INVALID"); return n; };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
    const relative = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": { const a = read(), b = read(); x = a + (relative ? x : 0); y = b + (relative ? y : 0); if (p.length) throw new Error("SVG_PATH_NOT_CLOSED"); p = [[x, y]]; cmd = relative ? "l" : "L"; break; }
      case "L": { const a = read(), b = read(); x = a + (relative ? x : 0); y = b + (relative ? y : 0); p.push([x, y]); break; }
      case "H": x = read() + (relative ? x : 0); p.push([x, y]); break;
      case "V": y = read() + (relative ? y : 0); p.push([x, y]); break;
      case "Z": if (p.length < 3) throw new Error("SVG_PATH_DEGENERATE"); result.push(p); [x, y] = p[0]; p = []; cmd = ""; break;
      default: throw new Error(`SVG_WALL_COMMAND_UNSUPPORTED:${cmd}`);
    }
  }
  if (p.length) throw new Error("SVG_PATH_NOT_CLOSED"); return result;
}
type Glyph = { id: string; a: Point; b: Point; kind: "door" | "sliding" | "window"; box?: number[] };
type Label = { id: string; name: string; point: Point; sourceArea?: number; start: number; end: number };
// An additive partition must not reassign existing shared wall pixels to a
// neighbouring source room. Keep source ownership as a constraint on wall-only
// Voronoi growth; free-space extraction and all topology checks still run on
// the complete edited drawing. No room coordinates are supplied by metadata.
type Ownership = {walls:{start:Point;end:Point}[];regions:Int32Array;gw:number;gh:number;ox:number;oy:number;unit:number};
const ownership = new WeakMap<object,Ownership>();
const sourceOwnershipCache = new Map<string,Ownership>();
function partitionSourceOwnership(svg:string,nodes:Element[]):Ownership|undefined {
  const groups=nodes.filter(n=>n.parent===nodes[0]&&n.tag==='g'&&/^(?:bedroom|bathroom)-[\w-]+$/.test(n.attrs.id||'')&&n.children.some(c=>c.attrs['data-kind']==='room-labels'));
  if(!groups.length)return;
  if(groups.length>8)throw new Error('SVG_INCREMENTAL_PARTITION_LIMIT');
  const last=groups.at(-1)!,source=svg.slice(0,last.start)+svg.slice(last.end);
  const cached=sourceOwnershipCache.get(source);if(cached)return cached;
  const baseline=svgToStructure(source),result=ownership.get(baseline);
  if(!result)throw new Error('SVG_SOURCE_OWNERSHIP_MISSING');
  if(sourceOwnershipCache.size>=3)sourceOwnershipCache.delete(sourceOwnershipCache.keys().next().value!);
  sourceOwnershipCache.set(source,result);return result;
}
const SEMANTIC: Record<string, string> = { 主卧: "master_bedroom", 主卫: "bathroom", 卫生间: "bathroom", 洗漱区: "bathroom", 次卧: "bedroom", 卧室: "bedroom", 客餐厅: "living_room", 客厅: "living_room", 厨房: "kitchen", 阳台: "balcony", 书房: "study", 餐厅: "dining_room", 冷藏室: "storage", 储藏: "storage" };
export function svgToStructure(svg: string) {
  const nodes = parseSvg(svg), root = nodes[0], sourceOwnership=partitionSourceOwnership(svg,nodes);
  const vb = (root.attrs.viewBox || "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || !vb.every(Number.isFinite) || vb[2] <= 0 || vb[3] <= 0) throw new Error("SVG_VIEWBOX_INVALID");
  const pixel = nodes.some(n => n.attrs.id === "walls"), unit = pixel ? 1 : 20;
  // Reject geometric transforms rather than silently dropping them. Text rotation for rulers is supported.
  for (const n of nodes) if (inherited(n, "transform") && !["source-north-arrow", "source-dimensions", "dimension-labels"].some(id=>inGroup(n,id))) throw new Error("SVG_GEOMETRY_TRANSFORM_UNSUPPORTED");
  const polygons: Point[][][] = [], glyphs: Glyph[] = [], labels: Label[] = [];
  for (const n of nodes) {
    const wall = (inGroup(n, "walls") || inherited(n, "fill") === "#9a9a9a") && ["rect", "path"].includes(n.tag);
    if (wall) {
      if (n.tag === "path") polygons.push(contours(n.attrs.d || ""));
      else { const x = number(n, "x"), y = number(n, "y"), w = number(n, "width"), h = number(n, "height"); if (w <= 0 || h <= 0) throw new Error("SVG_ZERO_WALL"); polygons.push([[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]]); }
    }
    if (n.tag === "path" && (inGroup(n, "hinged-doors") || inherited(n, "stroke") === "#2e9e4f")) {
      const m = /^\s*M\s*([-\d.]+)[,\s]+([-\d.]+)\s*L\s*([-\d.]+)[,\s]+([-\d.]+)\s*A\s*([-\d.]+)[,\s]+([-\d.]+)\s+0\s+[01]\s+[01]\s+([-\d.]+)[,\s]+([-\d.]+)\s*Z\s*$/i.exec(n.attrs.d || "");
      if (!m) throw new Error("SVG_DOOR_PATH_INVALID");
      glyphs.push({ id: n.attrs.id || `hinged-${glyphs.length}`, a: [+m[1], +m[2]], b: [+m[7], +m[8]], kind: "door" });
    }
    if (n.tag === "rect" && (inGroup(n, "windows") || inherited(n, "stroke") === "#e8862a")) {
      const x = number(n, "x"), y = number(n, "y"), w = number(n, "width"), h = number(n, "height"); if (w <= 0 || h <= 0) throw new Error("SVG_WINDOW_NONPOSITIVE");
      glyphs.push({ id: n.attrs.id || `window-${glyphs.length}`, a: w >= h ? [x, y + h / 2] : [x + w / 2, y], b: w >= h ? [x + w, y + h / 2] : [x + w / 2, y + h], kind: "window", box: [x, y, w, h] });
    }
    if (n.tag === "text" && (inGroup(n, "room-labels") || !pixel && !n.parent?.parent)) {
      const name = n.text.trim(); if (!name || /^[\d.\s]+(?:m²|㎡)?$/.test(name)) continue;
      const siblings = n.parent?.children || [], following = siblings.slice(siblings.indexOf(n)+1).find(el=>el.tag==="text");
      const area = following && /(?:m²|㎡)\s*$/.test(following.text) ? following : undefined;
      labels.push({ id: n.parent?.attrs.id || `label-${labels.length}`, name, point: [n.parent?.attrs["data-seed-x"] ? number(n.parent,"data-seed-x") : number(n, "x"), n.parent?.attrs["data-seed-y"] ? number(n.parent,"data-seed-y") : number(n, "y")], sourceArea: area ? parseFloat(area.text) : undefined, start: n.start, end: n.end });
    }
  }
  const red = nodes.filter(n => n.tag === "line" && (inGroup(n, "parallel-openings") || inherited(n, "stroke") === "#d64545"));
  if (red.length % 2) throw new Error("SVG_SLIDING_PAIR_MISSING");
  for (let i = 0; i < red.length; i += 2) {
    const a = red[i], b = red[i + 1];
    glyphs.push({ id: a.parent?.attrs.id || `parallel-${i}`, a: [(number(a, "x1") + number(b, "x1")) / 2, (number(a, "y1") + number(b, "y1")) / 2], b: [(number(a, "x2") + number(b, "x2")) / 2, (number(a, "y2") + number(b, "y2")) / 2], kind: "sliding" });
  }
  if (!polygons.length || !labels.length) throw new Error("SVG_STRUCTURE_EMPTY");
  const scales = [[], []] as number[][];
  if (pixel) {
    for (const axis of [0, 1]) {
      const dimensions = nodes.filter(n => n.tag === "text" && inGroup(n, "dimension-labels") && /^\d+(?:\.\d+)?$/.test(n.text.trim()) && (axis === 1) === /rotate\(-90/.test(n.attrs.transform || ""));
      const rows = new Map<number, Element[]>();
      for (const n of dimensions) { const key = number(n, axis === 0 ? "y" : "x"); rows.set(key, [...(rows.get(key) || []), n]); }
      for (const row of rows.values()) {
        row.sort((a, b) => number(a, axis === 0 ? "x" : "y") - number(b, axis === 0 ? "x" : "y"));
        for (let i = 1; i < row.length; i++) {
          const spacing = number(row[i], axis === 0 ? "x" : "y") - number(row[i - 1], axis === 0 ? "x" : "y");
          if (spacing > 0) scales[axis].push((+row[i].text + +row[i - 1].text) / 2000 / spacing);
        }
      }
    }
    if (scales.some(s => !s.length)) throw new Error("SVG_SCALE_DIMENSIONS_MISSING");
  }
  const sx = pixel ? median(scales[0]) : .001, sy = pixel ? median(scales[1]) : .001;
  if (![sx, sy].every(s => s > 0 && s < 1)) throw new Error("SVG_SCALE_INVALID");
  const metric = (p: Point): Point => [(p[0] - vb[0]) * sx, (p[1] - vb[1]) * sy];
  const gw = Math.ceil(vb[2] / unit) + 4, gh = Math.ceil(vb[3] / unit) + 4, ox = vb[0] - 2 * unit, oy = vb[1] - 2 * unit, total = gw * gh;
  if (total > 2_000_000) throw new Error("SVG_GRID_LIMIT");
  const blocked = new Uint8Array(total);
  // Scanline parity handles subpaths/holes under the supplied evenodd wall group.
  for (const loops of polygons) for (let gy = 0; gy < gh; gy++) {
    const y = oy + (gy + .5) * unit, xs: number[] = [];
    for (const loop of loops) for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i += 2) for (let gx = Math.max(0, Math.ceil((xs[i] - ox) / unit - .5)); gx < gw && ox + (gx + .5) * unit < xs[i + 1]; gx++) blocked[gy * gw + gx] = 1;
  }
  const sourceMask = blocked.slice();
  const paint = (x: number, y: number, w: number, h: number) => {
    for (let gy = Math.max(0, Math.floor((y - oy) / unit)); gy < gh && oy + gy * unit < y + h; gy++) for (let gx = Math.max(0, Math.floor((x - ox) / unit)); gx < gw && ox + gx * unit < x + w; gx++) blocked[gy * gw + gx] = 1;
  };
  // The aperture itself is a topological barrier during room extraction, not a traversable flood-fill leak.
  const band = pixel ? 12 : 200;
  const gap = pixel ? 8 : 40;
  for (const g of glyphs) {
    if (g.box) {
      const [x,y,w,h] = g.box, horizontal = w >= h, samples: {c:number;score:number}[] = [];
      const occupied = (x:number,y:number) => sourceMask[Math.floor((y-oy)/unit)*gw+Math.floor((x-ox)/unit)] || 0;
      for (let c = horizontal ? y : x; c <= (horizontal ? y+h : x+w); c += unit) {
        let left=0,right=0;
        for(let d=-band;d<band;d+=unit) { left += horizontal ? occupied(x-d,c) : occupied(c,y-d); right += horizontal ? occupied(x+w+d,c) : occupied(c,y+h+d); }
        samples.push({c,score:Math.min(left,right)*100+left+right});
      }
      const best=Math.max(...samples.map(s=>s.score));
      const fixed=best ? median(samples.filter(s=>s.score===best).map(s=>s.c)) : horizontal ? y+h/2 : x+w/2;
      g.a=horizontal?[x,fixed]:[fixed,y]; g.b=horizontal?[x+w,fixed]:[fixed,y+h];
    }
    const covered = Array.from({length:31},(_,i)=>{const x=g.a[0]+(g.b[0]-g.a[0])*i/30,y=g.a[1]+(g.b[1]-g.a[1])*i/30;return sourceMask[Math.floor((y-oy)/unit)*gw+Math.floor((x-ox)/unit)]||0;});
    if(covered.every(Boolean)) continue;
    if (Math.abs(g.a[0] - g.b[0]) < 1e-6) paint(g.a[0] - band / 2, Math.min(g.a[1], g.b[1]) - gap, band, Math.abs(g.b[1] - g.a[1]) + gap * 2);
    else if (Math.abs(g.a[1] - g.b[1]) < 1e-6) paint(Math.min(g.a[0], g.b[0]) - gap, g.a[1] - band / 2, Math.abs(g.b[0] - g.a[0]) + gap * 2, band);
    else throw new Error(`SVG_APERTURE_NOT_ORTHOGONAL:${g.id}`);
  }
  const originalMask = blocked.slice();
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const i = y * gw + x; if (originalMask[i]) for (const d of [-gw-1,-gw,-gw+1,-1,0,1,gw-1,gw,gw+1]) blocked[i+d] = 1; }
  const regions = new Int32Array(total).fill(-1), counts: number[] = [], queue = new Int32Array(total);
  const neighbors = (i: number) => [i % gw ? i - 1 : -1, i % gw < gw - 1 ? i + 1 : -1, i >= gw ? i - gw : -1, i + gw < total ? i + gw : -1];
  for (let start = 0; start < total; start++) {
    if (blocked[start] || regions[start] >= 0) continue;
    const id = counts.length; let tail = 1; queue[0] = start; regions[start] = id;
    for (let head = 0; head < tail; head++) for (const ni of neighbors(queue[head])) if (ni >= 0 && !blocked[ni] && regions[ni] < 0) { regions[ni] = id; queue[tail++] = ni; }
    counts.push(tail);
  }
  const outside = regions[0], byRegion = new Map<number, Label>();
  for (const label of labels) {
    const gx = Math.floor((label.point[0] - ox) / unit), gy = Math.floor((label.point[1] - oy) / unit), cid = regions[gy * gw + gx];
    if (cid === undefined || cid < 0 || cid === outside) throw new Error(`SVG_LABEL_NOT_ENCLOSED:${label.name}`);
    if (byRegion.has(cid)) throw new Error(`SVG_ROOM_LABEL_COLLISION:${byRegion.get(cid)!.name}/${label.name}`);
    byRegion.set(cid, label);
  }
  const unknown = counts.flatMap((count, i) => i !== outside && !byRegion.has(i) && count * unit * unit * sx * sy > .2 ? [{ component: i, area: count * unit * unit * sx * sy }] : []);
  if (unknown.length) throw new Error(`SVG_UNLABELLED_SPACE:${JSON.stringify(unknown)}`);
  // Grow through wall cells only within their existing source room. Adding
  // an interior T-junction cannot move an untouched kitchen/bathroom centreline.
  const parentRegion=new Int32Array(counts.length).fill(-1);
  if(sourceOwnership){
    if(sourceOwnership.gw!==gw||sourceOwnership.gh!==gh||sourceOwnership.ox!==ox||sourceOwnership.oy!==oy||sourceOwnership.unit!==unit)throw new Error('SVG_SOURCE_OWNERSHIP_GRID_MISMATCH');
    for(let i=0;i<total;i++)if(regions[i]>=0){
      const cid=regions[i],source=sourceOwnership.regions[i];
      if(parentRegion[cid]>=0&&parentRegion[cid]!==source)throw new Error('SVG_INCREMENTAL_REGION_CROSSES_SOURCE_ROOM');
      parentRegion[cid]=source;
    }
  }
  let tail = 0;
  for (let i = 0; i < total; i++) if (regions[i] >= 0) queue[tail++] = i;
  for (let head = 0; head < tail; head++) for (const ni of neighbors(queue[head])) if (ni >= 0 && regions[ni] < 0 && (!sourceOwnership||sourceOwnership.regions[ni]===parentRegion[regions[queue[head]]])) { regions[ni] = regions[queue[head]]; queue[tail++] = ni; }
  if(regions.some(r=>r<0))throw new Error('SVG_INCREMENTAL_WALL_OWNERSHIP_UNRESOLVED');
  function trace(id: number | "outer"): Point[] {
    const edges = new Map<number, number[]>();
    const hit = (i: number) => i >= 0 && (id === "outer" ? byRegion.has(regions[i]) : regions[i] === id);
    const add = (a: number, b: number) => edges.set(a, [...(edges.get(a) || []), b]);
    const stride = gw + 1;
    for (let i = 0; i < total; i++) if (hit(i)) { const x = i % gw, y = Math.floor(i / gw), a = y * stride + x; if (y === 0 || !hit(i - gw)) add(a, a + 1); if (x === gw - 1 || !hit(i + 1)) add(a + 1, a + 1 + stride); if (y === gh - 1 || !hit(i + gw)) add(a + 1 + stride, a + stride); if (x === 0 || !hit(i - 1)) add(a + stride, a); }
    const loops: Point[][] = [];
    while (edges.size) {
      const first = edges.keys().next().value!; let cur = first; const loop: Point[] = [];
      do { loop.push([ox + cur % stride * unit, oy + Math.floor(cur / stride) * unit]); const dest = edges.get(cur); if (!dest?.length) throw new Error("SVG_BOUNDARY_OPEN"); const next = dest.pop()!; if (!dest.length) edges.delete(cur); cur = next; if (loop.length > total * 4) throw new Error("SVG_BOUNDARY_LOOP"); } while (cur !== first);
      loops.push(loop);
    }
    loops.sort((a, b) => polygonArea(b) - polygonArea(a));
    if (!loops.length) throw new Error("SVG_BOUNDARY_EMPTY");
    if (loops.slice(1).some(p => polygonArea(p) * sx * sy > .2)) throw new Error("SVG_POLYGON_HOLES_UNSUPPORTED");
    return loops[0].filter((a,i)=>{const p=loops[0],b=p[(i+1)%p.length],c=p[(i+p.length-1)%p.length];return !((a[0]===b[0]&&a[0]===c[0])||(a[1]===b[1]&&a[1]===c[1]));});
  }
  const rooms = [...byRegion].map(([cid, l], i) => { const polygon = trace(cid).map(metric); return { id: `room_${i + 1}`, name: l.name, semantic: Object.entries(SEMANTIC).find(([k]) => l.name.includes(k))?.[1] || "unknown", polygon, expectedArea: polygonArea(polygon), sourceArea: l.sourceArea, sourceLabel: l, color: "#c9d4d6" }; });
  type Seg = { start: Point; end: Point; edges: number[] };
  const segs: Seg[] = [];
  const rings: number[][] = [];
  let edgeId = 0;
  for (const r of rooms) {
   const ring: number[] = []; rings.push(ring);
   for (let i = 0; i < r.polygon.length; i++) {
    const a = r.polygon[i], b = r.polygon[(i + 1) % r.polygon.length];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < .05) continue;
    const edges = [edgeId++]; ring.push(edges[0]);
    const horizontal = Math.abs(a[1] - b[1]) < 1e-8;
    const axis = horizontal ? 0 : 1, cross = 1 - axis;
    let low = Math.min(a[axis], b[axis]), high = Math.max(a[axis], b[axis]), fixed = a[cross];
    for (let j = segs.length - 1; j >= 0; j--) {
      const s = segs[j]; if ((Math.abs(s.start[1] - s.end[1]) < 1e-8) !== horizontal) continue;
      if (Math.abs(s.start[cross] - fixed) > unit * (horizontal ? sy : sx) * 3) continue;
      if (Math.max(low, s.start[axis]) > Math.min(high, s.end[axis]) + unit * (horizontal ? sx : sy) * 3) continue;
      low = Math.min(low, s.start[axis]); high = Math.max(high, s.end[axis]); fixed = s.start[cross]; edges.push(...s.edges); segs.splice(j, 1);
    }
    const start: Point = horizontal ? [low, fixed] : [fixed, low], end: Point = horizontal ? [high, fixed] : [fixed, high]; segs.push({ start, end, edges });
   }
  }
  // Flood-fill centreline corners contain one-pixel stairs. Dropping their
  // short edges used to leave 10–30 cm gaps between the surviving long runs.
  // Keep the boundary's cyclic adjacency and extend neighbouring runs to their
  // exact axis intersection. Pascal's native miter joints require coincidence
  // within 1 mm; increasing renderer tolerance or wall thickness hides errors.
  const byEdge = new Map(segs.flatMap(s => s.edges.map(id => [id, s] as const)));
  const supported = (p: Point) => {
    const x = Math.floor((p[0] / sx + vb[0] - ox) / unit), y = Math.floor((p[1] / sy + vb[1] - oy) / unit);
    // One grid cell accounts for a contour lying exactly on a pixel boundary.
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x+dx>=0 && y+dy>=0 && x+dx<gw && y+dy<gh && originalMask[(y+dy)*gw+x+dx]) return true;
    return false;
  };
  const lineSupported = (q:Point,p:Point) => {
    const steps = Math.ceil(Math.hypot((p[0]-q[0])/sx,(p[1]-q[1])/sy)/unit)*2;
    for(let i=0;i<=steps;i++) if(!supported([q[0]+(p[0]-q[0])*(steps?i/steps:0),q[1]+(p[1]-q[1])*(steps?i/steps:0)])) return false;
    return true;
  };
  const extensionSupported = (s: Seg, p: Point) => {
    const axis = Math.abs(s.start[1]-s.end[1]) < 1e-8 ? 0 : 1;
    const q: Point = [...p]; q[axis] = Math.max(s.start[axis],Math.min(s.end[axis],p[axis]));
    return lineSupported(q,p);
  };
  for(const ring of rings) for(let i=0;i<ring.length;i++) {
    const a=byEdge.get(ring[i])!, b=byEdge.get(ring[(i+1)%ring.length])!;
    const ah=Math.abs(a.start[1]-a.end[1])<1e-8, bh=Math.abs(b.start[1]-b.end[1])<1e-8;
    if(a===b) continue;
    if(ah===bh) {
      // Consecutive parallel runs describe a real wall-face offset (often a
      // bay window), joined by stairs too short to survive the length filter.
      // Restore a square return inside that same source wall band.
      const axis=ah?0:1,cross=1-axis;
      const pairs=[a.start,a.end].flatMap(p=>[b.start,b.end].map(q=>({p,q,d:Math.hypot(p[0]-q[0],p[1]-q[1])}))).sort((p,q)=>p.d-q.d);
      const {p,q}=pairs[0],lo=Math.min(p[axis],q[axis]),hi=Math.max(p[axis],q[axis]),mid=(lo+hi)/2,step=unit*(ah?sx:sy);
      const positions=[mid,lo,hi];for(let v=lo;v<=hi;v+=step)positions.push(v);
      for(const v of positions) {
        const u:Point=ah?[v,a.start[cross]]:[a.start[cross],v],t:Point=ah?[v,b.start[cross]]:[b.start[cross],v];
        const connector:Seg={start:u,end:t,edges:[]};
        // Check the whole return and both endpoint extensions against the
        // original wall/aperture mask, never across an empty room.
        if(!extensionSupported(a,u)||!extensionSupported(b,t)||!lineSupported(u,t))continue;
        for(const s of [a,b]){s.start[axis]=Math.min(s.start[axis],v);s.end[axis]=Math.max(s.end[axis],v);}
        // The existing 12 cm wall bodies overlap for smaller offsets. Adding
        // a short transverse wall there creates a post that can invade a door
        // jamb; only larger, genuine returns need their own native segment.
        if(Math.abs(u[cross]-t[cross])>.12){if(u[cross]>t[cross])[connector.start,connector.end]=[t,u];segs.push(connector);}
        break;
      }
      continue;
    }
    const p:Point=ah?[b.start[0],a.start[1]]:[a.start[0],b.start[1]];
    if(!extensionSupported(a,p)||!extensionSupported(b,p)) continue;
    for(const s of [a,b]) {const axis=Math.abs(s.start[1]-s.end[1])<1e-8?0:1;s.start[axis]=Math.min(s.start[axis],p[axis]);s.end[axis]=Math.max(s.end[axis],p[axis]);}
  }
  // Adding a room splits source boundary runs. Re-fitting each shorter run
  // to raster stairs can shift an unchanged entrance onto the slab edge.
  // Reuse its physically supported source centreline, within one raster cell,
  // only when the entire new run is covered by that same original wall.
  if(sourceOwnership)for(const segment of segs){
    const horizontal=Math.abs(segment.start[1]-segment.end[1])<1e-8,axis=horizontal?0:1,cross=1-axis;
    const matches=sourceOwnership.walls.filter(w=>(Math.abs(w.start[1]-w.end[1])<1e-8)===horizontal&&Math.abs(w.start[cross]-segment.start[cross])<=unit*(horizontal?sy:sx)+1e-8&&segment.start[axis]>=w.start[axis]-1e-8&&segment.end[axis]<=w.end[axis]+1e-8).sort((a,b)=>Math.abs(a.start[cross]-segment.start[cross])-Math.abs(b.start[cross]-segment.start[cross]));
    const original=matches[0];if(!original)continue;
    const start:Point=[...segment.start],end:Point=[...segment.end];start[cross]=end[cross]=original.start[cross];
    if(lineSupported(start,end)){segment.start=start;segment.end=end;}
  }
  // Joining corners can make formerly separate collinear runs touch. Unify
  // them before binding openings so a second wall cannot cover an aperture.
  for(let i=segs.length-1;i>=0;i--)for(let j=0;j<i;j++) {
    const a=segs[i],b=segs[j],ah=Math.abs(a.start[1]-a.end[1])<1e-8,bh=Math.abs(b.start[1]-b.end[1])<1e-8,axis=ah?0:1,cross=1-axis;
    if(ah!==bh||Math.abs(a.start[cross]-b.start[cross])>1e-8)continue;
    const low=Math.min(a.end[axis],b.end[axis]),high=Math.max(a.start[axis],b.start[axis]);
    if(high>low+1e-8){
      const p:Point=ah?[low,a.start[cross]]:[a.start[cross],low],q:Point=ah?[high,a.start[cross]]:[a.start[cross],high];
      // Only bridge a sub-wall-thickness gap with continuous drawing support.
      if(high-low>.12||!lineSupported(p,q))continue;
    }
    b.start[axis]=Math.min(a.start[axis],b.start[axis]);b.end[axis]=Math.max(a.end[axis],b.end[axis]);segs.splice(i,1);break;
  }
  // A centreline trace can also leave a sub-wall-thickness spur crossing the
  // middle of a longer run at a T joint. Absorb that raster fragment into the
  // existing wall body; keep short returns whose junction is at an endpoint.
  for(let i=segs.length-1;i>=0;i--) {
    const s=segs[i],h=Math.abs(s.start[1]-s.end[1])<1e-8,axis=h?0:1,cross=1-axis;
    if(s.end[axis]-s.start[axis]>.12)continue;
    if(segs.some((v,j)=>j!==i&&[s.start,s.end].some(p=>{
      const vh=Math.abs(v.start[1]-v.end[1])<1e-8,va=vh?0:1,vc=1-va;
      return Math.abs(p[vc]-v.start[vc])<1e-8&&p[va]>=v.start[va]-1e-8&&p[va]<=v.end[va]+1e-8;
    })))continue;
    const allowance=.06+2*unit*(h?sx:sy);
    if(segs.some((v,j)=>j!==i&&(Math.abs(v.start[1]-v.end[1])<1e-8)!==h&&v.start[axis]>s.start[axis]+1e-8&&v.start[axis]<s.end[axis]-1e-8&&v.start[cross]<=s.start[cross]&&v.end[cross]>=s.start[cross]&&Math.max(v.start[axis]-s.start[axis],s.end[axis]-v.start[axis])<=allowance))segs.splice(i,1);
  }
  const walls = segs.map(({start,end}, i) => ({ id: `wall_${i + 1}`, start,end, structural: "partition" as const }));
  // Bay-window symbols can extend beyond the room's Voronoi corner. Extend
  // the existing, supported wall to the declared window span before binding
  // ANY openings (changing a start later would invalidate earlier offsets).
  // A duplicate aperture-only host used to leave the original solid wall
  // behind the glazing. Width and centre still come from the source symbol.
  for(const g of glyphs.filter(g=>g.kind==='window')) {
    const a=metric(g.a),b=metric(g.b),horizontal=Math.abs(a[1]-b[1])<1e-8,axis=horizontal?0:1,cross=1-axis,lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]);
    const candidates=walls.filter(w=>(Math.abs(w.start[1]-w.end[1])<1e-8)===horizontal&&Math.abs(w.start[cross]-a[cross])<=unit*(horizontal?sy:sx)*3+1e-8&&Math.min(w.end[axis],hi)>Math.max(w.start[axis],lo)).sort((u,v)=>Math.abs(u.start[cross]-a[cross])-Math.abs(v.start[cross]-a[cross]));
    const w=candidates[0];if(!w)continue;
    const p:Point=horizontal?[lo,w.start[cross]]:[w.start[cross],lo],q:Point=horizontal?[hi,w.start[cross]]:[w.start[cross],hi];
    if(!extensionSupported({...w,edges:[]},p)||!extensionSupported({...w,edges:[]},q))continue;
    w.start[axis]=Math.min(w.start[axis],lo);w.end[axis]=Math.max(w.end[axis],hi);
  }
  const associate = (g: Glyph) => {
    const a = metric(g.a), b = metric(g.b), p: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], width = Math.hypot(a[0] - b[0], a[1] - b[1]), horizontal = Math.abs(a[1] - b[1]) < 1e-8;
    const candidates = walls.flatMap(w => {
      if ((Math.abs(w.start[1] - w.end[1]) < 1e-8) !== horizontal) return [];
      const axis = horizontal ? 0 : 1, cross = 1 - axis, distance = p[axis] - w.start[axis], len = w.end[axis] - w.start[axis];
      if (distance - width / 2 < -.001 || distance + width / 2 > len + .001) return [];
      return [{ wallId: w.id, distance, error: Math.abs(p[cross] - w.start[cross]) }];
    }).sort((a, b) => a.error - b.error);
    const host = candidates[0];
    const tolerance = g.box ? Math.min(g.box[2] * sx, g.box[3] * sy) / 2 + Math.max(sx, sy) * unit * 5 : band * Math.max(sx, sy) / 2 + Math.max(sx, sy) * unit * 5;
    if (width <= 0) throw new Error(`SVG_OPENING_NONPOSITIVE:${g.id}`);
    if (!host || host.error > tolerance) {
      const support=(p:Point)=>{let hits=0;for(let dx=-band;dx<=band;dx+=unit)for(let dy=-band;dy<=band;dy+=unit){const x=Math.floor((p[0]+dx-ox)/unit),y=Math.floor((p[1]+dy-oy)/unit);if(x>=0&&y>=0&&x<gw&&y<gh)hits+=sourceMask[y*gw+x];}return hits>2;};
      const supported=(p:Point)=>support(p)||glyphs.some(other=>other!==g&&(support(other.a)||support(other.b))&&[other.a,other.b].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=band*1.5));
      if(!supported(g.a)||!supported(g.b))throw new Error(`SVG_APERTURE_HAS_NO_PHYSICAL_HOST_SUPPORT:${JSON.stringify(g)}`);
      // The explicitly drawn aperture supplies its own host span when contour
      // simplification splits a wall at a bay/corner. Never bind a remote wall.
      const start:Point=horizontal?[Math.min(a[0],b[0]),a[1]]:[a[0],Math.min(a[1],b[1])];
      const end:Point=horizontal?[Math.max(a[0],b[0]),a[1]]:[a[0],Math.max(a[1],b[1])];
      const id=`wall_aperture_${g.id.replace(/[^\w-]/g,'_')}`;
      walls.push({id,start,end,structural:'partition'});
      return {id:`${g.kind==='window'?'window':'door'}_${g.id}`,name:g.kind==='sliding'?'推拉门':g.kind==='door'?'门':'窗',wallId:id,width,distance:width/2,...(g.kind!=='window'?{doorType:g.kind==='sliding'?'sliding' as const:'hinged' as const}:{}),sourceGlyph:g.id,projectionErrorM:0,apertureHost:true};
    }
    return { id: `${g.kind === "window" ? "window" : "door"}_${g.id.replace(/[^\w-]/g, "_")}`, name: g.kind === "sliding" ? "推拉门" : g.kind === "door" ? "门" : "窗", wallId: host.wallId, width, distance: host.distance, ...(g.kind !== "window" ? { doorType: g.kind === "sliding" ? "sliding" as const : "hinged" as const } : {}), sourceGlyph: g.id, projectionErrorM: host.error };
  };
  const openings = glyphs.map(associate);
  const structure = { outerPolygon: trace("outer").map(metric), walls, rooms, doors: openings.filter((_, i) => glyphs[i].kind !== "window"), windows: openings.filter((_, i) => glyphs[i].kind === "window"), coordinates: { minX: vb[0], minY: vb[1], metersPerUnitX: sx, metersPerUnitY: sy, unit: pixel ? "pixel" : "millimeter", gridUnit: unit, scaleSamples: scales, method: "drawing-dimensions" as const }, warnings: pixel ? ["尺寸链与印刷面积可能不一致；sourceArea 保留原标注，expectedArea 为解析多边形面积。", "红色平行开口按交接任务约定解释为推拉门；除 one-01 外其通行语义尚未由用户确认。", "灰墙不证明承重属性，解析为 partition；墙厚为现有展示默认值，非施工尺寸。"] : [] };
  ownership.set(structure,{walls,regions,gw,gh,ox,oy,unit});
  return structure;
}
