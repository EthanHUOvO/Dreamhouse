"use client";

import { useEffect, useMemo, useState } from "react";

type Point = [number, number];
type Wall = {
  id: string;
  start: Point;
  end: Point;
  structural: "load_bearing" | "partition";
};
type Opening = {
  id: string;
  name: string;
  wallId: string;
  distance: number;
  width: number;
  height?: number;
  sillHeight?: number;
};
type Spec = {
  id: string;
  name: string;
  sourceImage: string;
  sourceImageDimensions?: { widthPx: number; heightPx: number };
  sourceCropPx?: { x: number; y: number; width: number; height: number };
  scale?: { pixelToMeterX: number; pixelToMeterZ: number };
  outerPolygon: Point[];
  walls: Wall[];
  rooms: any[];
  doors: Opening[];
  windows: Opening[];
  factory: string;
};
type Entry = { variantId: string; imageUrl: string; floorplanSpec: Spec };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const bounds = (points: Point[]) => ({
  minX: Math.min(...points.map((p) => p[0])),
  maxX: Math.max(...points.map((p) => p[0])),
  minY: Math.min(...points.map((p) => p[1])),
  maxY: Math.max(...points.map((p) => p[1])),
});

export default function FloorplanCalibrationPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [variantId, setVariantId] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [mode, setMode] = useState<"wall" | "door" | "window">("wall");
  const [selectedWall, setSelectedWall] = useState<string | null>(null);
  const [message, setMessage] = useState("加载校准目录…");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/floorplans/calibration")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        if (data.entries?.[0]) {
          setVariantId(data.entries[0].variantId);
          setSpec(clone(data.entries[0].floorplanSpec));
          setMessage("可在原图上拖动端点、增删墙体和调整门窗");
        }
      })
      .catch(() => setMessage("无法读取校准目录"));
  }, []);
  const entry = entries.find((item) => item.variantId === variantId);
  const box = useMemo(
    () =>
      spec ? bounds(spec.outerPolygon) : { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    [spec],
  );
  const width = Math.max(box.maxX - box.minX, 0.1),
    height = Math.max(box.maxY - box.minY, 0.1);
  const pad = Math.max(width, height) * 0.08;
  const viewBox = `${box.minX - pad} ${box.minY - pad} ${width + pad * 2} ${height + pad * 2}`;
  const imageTransform = useMemo(() => {
    const sx = spec?.scale?.pixelToMeterX || 1;
    const sz = spec?.scale?.pixelToMeterZ || sx;
    const crop = spec?.sourceCropPx || { x: 0, y: 0, width: 0, height: 0 };
    const dimensions = spec?.sourceImageDimensions || {
      widthPx: crop.width,
      heightPx: crop.height,
    };
    return {
      x: -crop.x * sx,
      y: -crop.y * sz,
      width: dimensions.widthPx * sx,
      height: dimensions.heightPx * sz,
    };
  }, [spec]);
  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      box.minX -
        pad +
        ((event.clientX - rect.left) / rect.width) * (width + pad * 2),
      box.minY -
        pad +
        ((event.clientY - rect.top) / rect.height) * (height + pad * 2),
    ];
  };
  const selectVariant = (id: string) => {
    const next = entries.find((item) => item.variantId === id);
    setVariantId(id);
    setSpec(next ? clone(next.floorplanSpec) : null);
    setSelectedWall(null);
    setMessage("已切换户型，尚未保存修改");
  };
  const updateWallPoint = (
    wallId: string,
    endpoint: "start" | "end",
    point: Point,
  ) =>
    setSpec((current) =>
      current
        ? {
            ...current,
            walls: current.walls.map((wall) =>
              wall.id === wallId
                ? {
                    ...wall,
                    [endpoint]: [
                      Number(point[0].toFixed(3)),
                      Number(point[1].toFixed(3)),
                    ],
                  }
                : wall,
            ),
          }
        : current,
    );
  const addWall = (start: Point, end: Point) =>
    setSpec((current) =>
      current
        ? {
            ...current,
            walls: [
              ...current.walls,
              {
                id: `wall_editor_${Date.now()}`,
                start: [
                  Number(start[0].toFixed(3)),
                  Number(start[1].toFixed(3)),
                ],
                end: [Number(end[0].toFixed(3)), Number(end[1].toFixed(3))],
                structural: "partition",
              },
            ],
          }
        : current,
    );
  const removeWall = () => {
    if (!selectedWall) return;
    setSpec((current) =>
      current
        ? {
            ...current,
            walls: current.walls.filter((wall) => wall.id !== selectedWall),
            doors: current.doors.filter(
              (opening) => opening.wallId !== selectedWall,
            ),
            windows: current.windows.filter(
              (opening) => opening.wallId !== selectedWall,
            ),
          }
        : current,
    );
    setSelectedWall(null);
  };
  const moveOpening = (
    opening: Opening,
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    if (!spec) return;
    const wall = spec.walls.find((item) => item.id === opening.wallId);
    if (!wall) return;
    const point = pointFromEvent(event as any);
    const dx = wall.end[0] - wall.start[0],
      dy = wall.end[1] - wall.start[1],
      length = Math.hypot(dx, dy) || 1;
    const distance = Math.max(
      0,
      Math.min(
        length - opening.width,
        ((point[0] - wall.start[0]) * dx + (point[1] - wall.start[1]) * dy) /
          length,
      ),
    );
    const key = mode === "door" ? "doors" : "windows";
    setSpec((current) =>
      current
        ? {
            ...current,
            [key]: (current[key] as Opening[]).map((item) =>
              item.id === opening.id
                ? { ...item, distance: Number(distance.toFixed(3)) }
                : item,
            ),
          }
        : current,
    );
  };
  const save = async () => {
    if (!spec) return;
    setSaving(true);
    const response = await fetch("/api/floorplans/calibration", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variantId, floorplanSpec: spec }),
    });
    setSaving(false);
    setMessage(response.ok ? "已写回 Pascal V2 户型覆盖文件" : "保存失败");
  };
  return (
    <main className="calibration-page">
      <header>
        <div>
          <small>开发工具</small>
          <h1>Pascal V2 户型校准编辑器</h1>
          <p>原始二维图是参考层，当前结构线可直接校准并写回米制户型定义。</p>
        </div>
        <div className="calibration-actions">
          <select
            value={variantId}
            onChange={(event) => selectVariant(event.target.value)}
          >
            {entries.map((item) => (
              <option key={item.variantId} value={item.variantId}>
                {item.variantId}
              </option>
            ))}
          </select>
          <button type="button" onClick={save} disabled={!spec || saving}>
            {saving ? "保存中…" : "保存到 Pascal V2"}
          </button>
        </div>
      </header>
      <section className="calibration-toolbar">
        <button
          className={mode === "wall" ? "active" : ""}
          onClick={() => setMode("wall")}
        >
          墙体
        </button>
        <button
          className={mode === "door" ? "active" : ""}
          onClick={() => setMode("door")}
        >
          门
        </button>
        <button
          className={mode === "window" ? "active" : ""}
          onClick={() => setMode("window")}
        >
          窗
        </button>
        <button type="button" onClick={removeWall} disabled={!selectedWall}>
          删除选中墙
        </button>
        <span>{message}</span>
      </section>
      <section className="calibration-workspace">
        <div className="calibration-canvas">
          <svg
            viewBox={viewBox}
            onPointerDown={(event) => {
              if (mode !== "wall" || !spec) return;
              const start = pointFromEvent(event);
              const move = (moveEvent: PointerEvent) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const end: Point = [
                  box.minX -
                    pad +
                    ((moveEvent.clientX - rect.left) / rect.width) *
                      (width + pad * 2),
                  box.minY -
                    pad +
                    ((moveEvent.clientY - rect.top) / rect.height) *
                      (height + pad * 2),
                ];
                setMessage(
                  `新墙预览 ${start.map((value) => value.toFixed(2)).join(", ")} → ${end.map((value) => value.toFixed(2)).join(", ")}`,
                );
              };
              const up = (upEvent: PointerEvent) => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                const rect = event.currentTarget.getBoundingClientRect();
                const end: Point = [
                  box.minX -
                    pad +
                    ((upEvent.clientX - rect.left) / rect.width) *
                      (width + pad * 2),
                  box.minY -
                    pad +
                    ((upEvent.clientY - rect.top) / rect.height) *
                      (height + pad * 2),
                ];
                if (Math.hypot(end[0] - start[0], end[1] - start[1]) > 0.25)
                  addWall(start, end);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          >
            <image
              href={entry?.imageUrl}
              x={imageTransform.x}
              y={imageTransform.y}
              width={imageTransform.width}
              height={imageTransform.height}
              // The image rectangle is already in the same metre coordinate
              // system as the V2 geometry. Do not fit it to the SVG viewport
              // again: the calibrated X/Z pixel scales are the mapping.
              preserveAspectRatio="none"
              opacity="0.7"
            />
            <polygon
              points={spec?.outerPolygon
                .map((point) => point.join(","))
                .join(" ")}
              fill="rgba(255,255,255,.22)"
              stroke="#143f4b"
              strokeWidth="0.08"
            />
            {spec?.walls.map((wall) => (
              <g key={wall.id}>
                <line
                  x1={wall.start[0]}
                  y1={wall.start[1]}
                  x2={wall.end[0]}
                  y2={wall.end[1]}
                  stroke={
                    wall.id === selectedWall
                      ? "#e87835"
                      : wall.structural === "load_bearing"
                        ? "#163e49"
                        : "#3e7480"
                  }
                  strokeWidth="0.12"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelectedWall(wall.id);
                  }}
                />
                <circle
                  cx={wall.start[0]}
                  cy={wall.start[1]}
                  r="0.13"
                  fill="#fff"
                  stroke="#e87835"
                  strokeWidth="0.05"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const move = (moveEvent: PointerEvent) => {
                      const rect =
                        event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!rect) return;
                      updateWallPoint(wall.id, "start", [
                        box.minX -
                          pad +
                          ((moveEvent.clientX - rect.left) / rect.width) *
                            (width + pad * 2),
                        box.minY -
                          pad +
                          ((moveEvent.clientY - rect.top) / rect.height) *
                            (height + pad * 2),
                      ]);
                    };
                    const up = () => {
                      window.removeEventListener("pointermove", move);
                      window.removeEventListener("pointerup", up);
                    };
                    window.addEventListener("pointermove", move);
                    window.addEventListener("pointerup", up);
                  }}
                />
                <circle
                  cx={wall.end[0]}
                  cy={wall.end[1]}
                  r="0.13"
                  fill="#fff"
                  stroke="#e87835"
                  strokeWidth="0.05"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const move = (moveEvent: PointerEvent) => {
                      const rect =
                        event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!rect) return;
                      updateWallPoint(wall.id, "end", [
                        box.minX -
                          pad +
                          ((moveEvent.clientX - rect.left) / rect.width) *
                            (width + pad * 2),
                        box.minY -
                          pad +
                          ((moveEvent.clientY - rect.top) / rect.height) *
                            (height + pad * 2),
                      ]);
                    };
                    const up = () => {
                      window.removeEventListener("pointermove", move);
                      window.removeEventListener("pointerup", up);
                    };
                    window.addEventListener("pointermove", move);
                    window.addEventListener("pointerup", up);
                  }}
                />
              </g>
            ))}
            {spec?.doors.map((opening) => {
              const wall = spec.walls.find(
                (item) => item.id === opening.wallId,
              );
              if (!wall) return null;
              const length =
                Math.hypot(
                  wall.end[0] - wall.start[0],
                  wall.end[1] - wall.start[1],
                ) || 1;
              const point: Point = [
                wall.start[0] +
                  (wall.end[0] - wall.start[0]) *
                    ((opening.distance + opening.width / 2) / length),
                wall.start[1] +
                  (wall.end[1] - wall.start[1]) *
                    ((opening.distance + opening.width / 2) / length),
              ];
              return (
                <circle
                  key={opening.id}
                  cx={point[0]}
                  cy={point[1]}
                  r="0.16"
                  fill="#db7132"
                  opacity={mode === "door" ? 1 : 0.72}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    moveOpening(opening, event);
                  }}
                />
              );
            })}
            {spec?.windows.map((opening) => {
              const wall = spec.walls.find(
                (item) => item.id === opening.wallId,
              );
              if (!wall) return null;
              const length =
                Math.hypot(
                  wall.end[0] - wall.start[0],
                  wall.end[1] - wall.start[1],
                ) || 1;
              const point: Point = [
                wall.start[0] +
                  (wall.end[0] - wall.start[0]) *
                    ((opening.distance + opening.width / 2) / length),
                wall.start[1] +
                  (wall.end[1] - wall.start[1]) *
                    ((opening.distance + opening.width / 2) / length),
              ];
              return (
                <circle
                  key={opening.id}
                  cx={point[0]}
                  cy={point[1]}
                  r="0.16"
                  fill="#348bb0"
                  opacity={mode === "window" ? 1 : 0.72}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    moveOpening(opening, event);
                  }}
                />
              );
            })}
          </svg>
        </div>
        <aside>
          <h2>{variantId || "户型"}</h2>
          <p>
            橙点为门，蓝点为窗。选中墙后可删除；拖动端点会直接修改米制坐标。
          </p>
          <dl>
            <div>
              <dt>墙体</dt>
              <dd>{spec?.walls.length || 0}</dd>
            </div>
            <div>
              <dt>门</dt>
              <dd>{spec?.doors.length || 0}</dd>
            </div>
            <div>
              <dt>窗</dt>
              <dd>{spec?.windows.length || 0}</dd>
            </div>
            <div>
              <dt>房间</dt>
              <dd>{spec?.rooms.length || 0}</dd>
            </div>
          </dl>
          <p className="calibration-warning">
            保存前请运行投影验收；编辑器不会把选区自动当作原生 mask。
          </p>
        </aside>
      </section>
    </main>
  );
}
