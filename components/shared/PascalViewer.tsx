"use client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { emitter, sceneRegistry } from "@pascal-app/core";
import { applySceneSnapshot } from "@pascal-app/editor";
import { SceneEnvironment, Viewer, useViewer } from "@pascal-app/viewer";
import { ensurePascalPlugin } from "@/lib/pascal/bootstrap";
import { assertPascalSceneIntegrity } from "@/lib/pascal/scene-integrity";
import { withResidentialWallFinish } from "@/lib/pascal/wall-finish";
import { CameraControls, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import type { SceneGraph, PascalViewCapture } from "@/lib/types";
import type { ViewerActions } from "@/lib/viewer-actions";
import type { BlueprintCalibration, WallEndpoint } from "@/lib/floorplans";
import { overviewBounds, overviewCamera, overviewSceneKey, presentationWallMode, type OverviewWallMode } from "@/lib/pascal/presentation";
import PascalWalkthroughController from "./PascalWalkthroughController";
import TouchJoystick from "./TouchJoystick";
import PascalBlockMeshes from "./PascalBlockMeshes";
import {
  clampValue,
  FURNITURE_MOVE_STEP,
  FURNITURE_ROTATE_STEP_DEG,
  getFurnitureBounds,
} from "@/lib/furniture-edit";
import { getWalkthroughScaleMetrics } from "@/lib/walkthrough-runtime";
import {
  findNearestDoorPlacement,
  type DoorPlacementPreview,
} from "@/lib/floorplans/door-edit";

const pluginReady = ensurePascalPlugin();
type Anchor = { x: number; y: number };
type CaptureContext = {
  gl: any;
  scene: any;
  camera: any;
};

function CaptureContextBridge({ contextRef }: { contextRef: MutableRefObject<CaptureContext | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    contextRef.current = { gl, scene, camera };
    return () => {
      if (contextRef.current?.gl === gl) contextRef.current = null;
    };
  }, [gl, scene, camera, contextRef]);
  return null;
}
type Props = {
  scene: SceneGraph;
  revision: number;
  editMode?: boolean;
  selectedItemId?: string;
  selectedItemLabel?: string;
  onSelectItem?: (id: string) => void;
  onNudgeItem?: (id: string, dx: number, dz: number) => void;
  onRotateItem?: (id: string, d: number) => void;
  onDragCommit?: (id: string, x: number, z: number) => void;
  onClearSelection?: () => void;
  doorEditMode?: boolean;
  selectedDoorId?: string;
  onSelectDoor?: (id: string) => void;
  onMoveDoor?: (doorId: string, wallId: string, offset: number) => void;
  onDeleteDoor?: (doorId: string) => void;
  onToggleDoorHinge?: (doorId: string) => void;
  onToggleDoorSwing?: (doorId: string) => void;
  doorPlacementMode?: boolean;
  onPickDoorWall?: (wallId: string) => void;
  wallEditMode?: boolean;
  selectedWallIds?: string[];
  wallAddMode?: boolean;
  onSelectWall?: (wallId: string, additive: boolean) => void;
  onWallEndpointCommit?: (wallId: string, endpoint: WallEndpoint, point: [number, number]) => void;
  onWallParallelCommit?: (wallId: string, normalDistance: number) => void;
  onAddWallCommit?: (start: [number, number], end: [number, number]) => void;
  debugUi?: boolean;
  viewMode?: "3d" | "top" | "overlay";
  /** Original drawing shown as a translucent reference in overlay mode. */
  blueprintImageUrl?: string;
  /** Selected modified floorplan shown as the overlay mode base image. */
  modifiedBlueprintImageUrl?: string;
  overlayOpacity?: number;
  blueprintCalibration?: BlueprintCalibration;
  walkthroughMode?: boolean;
  onExitWalkthrough?: () => void;
  onCaptureView?: (capture: PascalViewCapture) => void;
  captureDisabled?: boolean;
  sessionId?: string;
  roomName?: string;
};

function BlueprintTopView({
  scene,
  imageUrl,
  modifiedImageUrl,
  overlayOpacity = 45,
  calibration,
  wallEditMode = false,
  selectedWallIds = [],
  wallAddMode = false,
  onSelectWall,
  onWallEndpointCommit,
  onWallParallelCommit,
  onAddWallCommit,
  debugUi = false,
}: {
  scene: SceneGraph;
  imageUrl?: string;
  modifiedImageUrl?: string;
  overlayOpacity?: number;
  calibration?: BlueprintCalibration;
  wallEditMode?: boolean;
  selectedWallIds?: string[];
  wallAddMode?: boolean;
  onSelectWall?: (wallId: string, additive: boolean) => void;
  onWallEndpointCommit?: (wallId: string, endpoint: WallEndpoint, point: [number, number]) => void;
  onWallParallelCommit?: (wallId: string, normalDistance: number) => void;
  onAddWallCommit?: (start: [number, number], end: [number, number]) => void;
  debugUi?: boolean;
}) {
  type Draft =
    | { kind: "endpoint"; wallId: string; endpoint: WallEndpoint; current: [number, number] }
    | { kind: "parallel"; wallId: string; pointerStart: [number, number]; current: [number, number] };
  const [draft, setDraft] = useState<Draft | null>(null);
  // Selection details can resize/reposition the SVG during pointer capture.
  // Keep a gesture in the coordinate frame in which it began.
  const gestureMatrix = useRef<DOMMatrix | null>(null);
  const [addStart, setAddStart] = useState<[number, number] | null>(null);
  const [pointer, setPointer] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!wallAddMode) setAddStart(null);
  }, [wallAddMode]);
  const slab: any = Object.values(scene.nodes).find(
    (node: any) => node.type === "slab" && Array.isArray(node.polygon),
  );
  const polygon: [number, number][] = slab?.polygon || [];
  const xs = polygon.map((point) => Number(point[0]));
  const zs = polygon.map((point) => Number(point[1]));
  if (!polygon.length) return <div className="viewer-loading">当前户型暂时无法显示</div>;
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const width = Math.max(0.1, maxX - minX), depth = Math.max(0.1, maxZ - minZ), pad = Math.max(width, depth) * 0.04;
  const crop = calibration?.imageCrop || { left: 0, top: 0, right: 1, bottom: 1 };
  const cropWidth = Math.max(0.05, crop.right - crop.left), cropHeight = Math.max(0.05, crop.bottom - crop.top);
  const imageWidth = width / cropWidth, imageHeight = depth / cropHeight;
  const imageX = minX - crop.left * imageWidth, imageY = minZ - crop.top * imageHeight;
  const imageScale = Math.max(0.1, Number(calibration?.imageScale || 1));
  const imageRotation = Number(calibration?.imageRotation || 0);
  const imageOffsetX = Number(calibration?.imageOffsetX || 0), imageOffsetY = Number(calibration?.imageOffsetY || 0);
  const centreX = minX + width / 2, centreY = minZ + depth / 2;
  const handleRadius = Math.max(width, depth) * 0.018;
  function eventPoint(event: any): [number, number] {
    const svg = event.currentTarget.ownerSVGElement || event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = gestureMatrix.current || svg.getScreenCTM()?.inverse();
    if (!matrix) return [0, 0];
    const transformed = point.matrixTransform(matrix);
    return [transformed.x, transformed.y];
  }
  const previewWall = draft ? scene.nodes[draft.wallId] : null;
  const previewCoordinates = (() => {
    if (!draft || !previewWall || previewWall.type !== "wall") return null;
    if (draft.kind === "endpoint") return {
      start: draft.endpoint === "start" ? draft.current : previewWall.start as [number, number],
      end: draft.endpoint === "end" ? draft.current : previewWall.end as [number, number],
    };
    const dx = Number(previewWall.end[0]) - Number(previewWall.start[0]);
    const dz = Number(previewWall.end[1]) - Number(previewWall.start[1]);
    const length = Math.hypot(dx, dz) || 1;
    const deltaX = draft.current[0] - draft.pointerStart[0];
    const deltaZ = draft.current[1] - draft.pointerStart[1];
    const normalDistance = deltaX * (-dz / length) + deltaZ * (dx / length);
    return {
      start: [Number(previewWall.start[0]) - dz / length * normalDistance, Number(previewWall.start[1]) + dx / length * normalDistance] as [number, number],
      end: [Number(previewWall.end[0]) - dz / length * normalDistance, Number(previewWall.end[1]) + dx / length * normalDistance] as [number, number],
    };
  })();
  const openings = Object.values(scene.nodes).filter((node) => node.type === "door" || node.type === "window");
  const openingLine = (node: any) => {
    const wall: any = scene.nodes[node.hostWallId || node.wallId || node.parentId];
    if (!wall) return null;
    const dx = wall.end[0] - wall.start[0], dz = wall.end[1] - wall.start[1], length = Math.hypot(dx, dz) || 1;
    const startDistance = Number(node.metadata?.blueprintOffset ?? (Number(node.position?.[0] || 0) - Number(node.width || 0) / 2));
    const endDistance = startDistance + Number(node.width || 0);
    return {
      x1: wall.start[0] + dx / length * startDistance,
      y1: wall.start[1] + dz / length * startDistance,
      x2: wall.start[0] + dx / length * endDistance,
      y2: wall.start[1] + dz / length * endDistance,
    };
  };
  return (
    <div className="blueprint-top-view">
      <svg
        viewBox={`${minX - pad} ${minZ - pad} ${width + pad * 2} ${depth + pad * 2}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={(event) => {
          const current = eventPoint(event);
          setPointer(current);
          if (draft) setDraft({ ...draft, current } as Draft);
        }}
        onPointerUp={(event) => {
          if (!draft) return;
          const current = eventPoint(event);
          if (draft.kind === "endpoint") onWallEndpointCommit?.(draft.wallId, draft.endpoint, current);
          else {
            const wall = scene.nodes[draft.wallId];
            if (wall?.type === "wall") {
              const dx = Number(wall.end[0]) - Number(wall.start[0]);
              const dz = Number(wall.end[1]) - Number(wall.start[1]);
              const length = Math.hypot(dx, dz) || 1;
              const normalDistance = (current[0] - draft.pointerStart[0]) * (-dz / length) + (current[1] - draft.pointerStart[1]) * (dx / length);
              if (Math.abs(normalDistance) > 0.005) onWallParallelCommit?.(draft.wallId, normalDistance);
            }
          }
          gestureMatrix.current = null;
          setDraft(null);
        }}
        onPointerCancel={() => { gestureMatrix.current = null; setDraft(null); }}
        onClick={(event) => {
          if (!wallEditMode || !wallAddMode || draft) return;
          const current = eventPoint(event);
          if (!addStart) setAddStart(current);
          else {
            onAddWallCommit?.(addStart, current);
            setAddStart(null);
          }
        }}
      >
        <rect x={minX - pad} y={minZ - pad} width={width + pad * 2} height={depth + pad * 2} fill="transparent" />
        {modifiedImageUrl && (
          <image
            href={modifiedImageUrl}
            x={imageX}
            y={imageY}
            width={imageWidth}
            height={imageHeight}
            opacity={1}
            preserveAspectRatio="none"
          />
        )}
        {imageUrl && (
          <g transform={`translate(${imageOffsetX} ${imageOffsetY}) rotate(${imageRotation} ${centreX} ${centreY}) translate(${centreX} ${centreY}) scale(${imageScale}) translate(${-centreX} ${-centreY})`}>
            <image
              href={imageUrl}
              x={imageX}
              y={imageY}
              width={imageWidth}
              height={imageHeight}
              opacity={overlayOpacity / 100}
              preserveAspectRatio="none"
            />
          </g>
        )}
        <polygon points={polygon.map((point) => point.join(",")).join(" ")} fill="rgba(216,229,231,.28)" stroke="#163f4c" strokeWidth={0.055} />
        {Object.values(scene.nodes).filter((node) => node.type === "wall").map((wall: any) => {
          const selected = selectedWallIds.includes(wall.id);
          return (
            <g key={wall.id}>
              {wallEditMode && (
                <line
                  x1={wall.start[0]} y1={wall.start[1]} x2={wall.end[0]} y2={wall.end[1]}
                  stroke="rgba(23,63,76,0.001)" strokeWidth={Math.max(0.34, Number(wall.thickness || 0.12) * 3)}
                  className="wall-hit-line"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    gestureMatrix.current = event.currentTarget.ownerSVGElement?.getScreenCTM()?.inverse() || null;
                    onSelectWall?.(wall.id, event.shiftKey || event.ctrlKey || event.metaKey);
                    setDraft({ kind: "parallel", wallId: wall.id, pointerStart: eventPoint(event), current: eventPoint(event) });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                />
              )}
              <line x1={wall.start[0]} y1={wall.start[1]} x2={wall.end[0]} y2={wall.end[1]} stroke={selected ? "#ed742f" : wall.metadata?.structural_type === "load_bearing" ? "#183e49" : "#4c7784"} strokeWidth={selected ? Math.max(0.18, Number(wall.thickness || 0.12) * 1.45) : wall.thickness || 0.12} strokeLinecap="square" pointerEvents="none" />
              <title>{`${debugUi ? `${wall.id} · ` : ""}${Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]).toFixed(2)}m`}</title>
            </g>
          );
        })}
        {openings.map((node: any) => {
          const line = openingLine(node);
          return line ? <line key={node.id} {...line} stroke={node.type === "door" ? "#d97431" : "#3a91b2"} strokeWidth={0.15} strokeLinecap="round" /> : null;
        })}
        {wallEditMode && selectedWallIds.length === 1 && (() => {
          const wall: any = scene.nodes[selectedWallIds[0]];
          if (!wall || wall.type !== "wall") return null;
          return (["start", "end"] as WallEndpoint[]).map((endpoint) => (
            <circle
              key={endpoint}
              cx={wall[endpoint][0]}
              cy={wall[endpoint][1]}
              r={handleRadius}
              fill="#fff"
              stroke="#ed742f"
              strokeWidth={handleRadius * 0.35}
              className="wall-endpoint-handle"
              onPointerDown={(event) => {
                event.stopPropagation();
                gestureMatrix.current = event.currentTarget.ownerSVGElement?.getScreenCTM()?.inverse() || null;
                setDraft({ kind: "endpoint", wallId: wall.id, endpoint, current: eventPoint(event) });
                event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              }}
            />
          ));
        })()}
        {previewCoordinates && <line x1={previewCoordinates.start[0]} y1={previewCoordinates.start[1]} x2={previewCoordinates.end[0]} y2={previewCoordinates.end[1]} stroke="#f0a163" strokeWidth={0.12} strokeDasharray="0.18 0.12" pointerEvents="none" />}
        {wallEditMode && wallAddMode && addStart && pointer && <line x1={addStart[0]} y1={addStart[1]} x2={pointer[0]} y2={pointer[1]} stroke="#27906e" strokeWidth={0.12} strokeDasharray="0.18 0.12" pointerEvents="none" />}
      </svg>
      <div className="blueprint-top-legend">
        <span>深色：外墙</span><span>浅色：隔墙</span><span>橙色：门</span><span>蓝色：窗</span>
        {wallEditMode && <span>{wallAddMode ? addStart ? "点击墙体终点" : "点击墙体起点" : "拖端点改长度 · 拖墙身平移"}</span>}
      </div>
    </div>
  );
}

function DoorInteractionBridge({
  scene,
  active,
  selectedDoorId,
  onSelectDoor,
  onMoveDoor,
  onDeleteDoor,
  onToggleDoorHinge,
  onToggleDoorSwing,
  debugUi = false,
  onInteractionActive,
}: {
  scene: SceneGraph;
  active: boolean;
  selectedDoorId?: string;
  onSelectDoor?: (id: string) => void;
  onMoveDoor?: (doorId: string, wallId: string, offset: number) => void;
  onDeleteDoor?: (doorId: string) => void;
  onToggleDoorHinge?: (doorId: string) => void;
  onToggleDoorSwing?: (doorId: string) => void;
  debugUi?: boolean;
  onInteractionActive: (active: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster()), pointer = useRef(new Vector2()), plane = useRef(new Plane(new Vector3(0, 1, 0), 0)), point = useRef(new Vector3());
  const drag = useRef<{ id: string } | null>(null);
  const [preview, setPreview] = useState<DoorPlacementPreview | null>(null);
  const previewRef = useRef<DoorPlacementPreview | null>(null);
  useEffect(() => {
    if (!active) return;
    const select = (event: any) => {
      const id = event?.node?.id;
      if (!id || scene.nodes[id]?.type !== "door" || scene.nodes[id]?.locked || scene.nodes[id]?.metadata?.locked) return;
      event.stopPropagation?.();
      onSelectDoor?.(id);
    };
    const down = (event: any) => {
      const id = event?.node?.id;
      if (!id || scene.nodes[id]?.type !== "door" || scene.nodes[id]?.locked || scene.nodes[id]?.metadata?.locked) return;
      event.stopPropagation?.();
      onSelectDoor?.(id);
      drag.current = { id };
      onInteractionActive(true);
    };
    emitter.on("door:click", select as any);
    emitter.on("door:pointerdown", down as any);
    return () => {
      emitter.off("door:click", select as any);
      emitter.off("door:pointerdown", down as any);
    };
  }, [active, scene, onSelectDoor, onInteractionActive]);
  useEffect(() => {
    if (!active) return;
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.current.setFromCamera(pointer.current, camera);
      if (!raycaster.current.ray.intersectPlane(plane.current, point.current)) return;
      const next = findNearestDoorPlacement(scene, drag.current.id, point.current.x, point.current.z);
      previewRef.current = next;
      setPreview(next);
    };
    const up = () => {
      const current = drag.current;
      drag.current = null;
      onInteractionActive(false);
      const placement = previewRef.current;
      if (current && placement?.valid) onMoveDoor?.(current.id, placement.wallId, placement.offset);
      previewRef.current = null;
      setPreview(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [active, scene, camera, gl, onMoveDoor, onInteractionActive]);
  useEffect(() => {
    const selection: any[] | undefined = useViewer.getState()?.outliner?.selectedObjects;
    if (!selection) return;
    selection.length = 0;
    if (active && selectedDoorId) {
      const object = sceneRegistry.nodes.get(selectedDoorId);
      if (object) selection.push(object);
    }
  }, [active, selectedDoorId, scene]);
  if (!preview) return null;
  return (
    <>
      <mesh position={[preview.centre[0], 1.05, preview.centre[1]]} rotation={[0, preview.rotationY, 0]}>
        <boxGeometry args={[0.86, 2.1, 0.08]} />
        <meshBasicMaterial color={preview.valid ? "#29a36a" : "#d34f45"} transparent opacity={0.48} depthTest={false} />
      </mesh>
      <Html fullscreen style={{ pointerEvents: "none" }}><div className={`door-edit-status ${preview.valid ? "valid" : "invalid"}`}>{preview.valid ? (debugUi ? `${preview.wallId} · ${preview.offset.toFixed(2)}m` : "可以放置在这里") : preview.reason}</div></Html>
    </>
  );
}

function CameraRig({
  scene,
  reset,
  interactionActive,
}: {
  scene: SceneGraph;
  reset: number;
  interactionActive: boolean;
}) {
  const controls = useRef<any>(null);
  const { camera, size } = useThree();
  const currentScene = useRef(scene);
  currentScene.current = scene;
  const sceneKey = overviewSceneKey(scene);
  const framing = overviewCamera(overviewBounds(scene), size.width / Math.max(1, size.height), (camera as any).fov);
  useEffect(() => {
    const pending = requestAnimationFrame(() => {
      const frame = overviewCamera(overviewBounds(currentScene.current), size.width / Math.max(1, size.height), (camera as any).fov);
      controls.current?.setLookAt(...frame.position, ...frame.target, false);
    });
    return () => cancelAnimationFrame(pending);
  }, [camera, sceneKey, reset, size.width, size.height]);
  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={!interactionActive}
      minDistance={framing.minDistance}
      maxDistance={framing.maxDistance}
      dollySpeed={0.55}
      truckSpeed={0.65}
    />
  );
}

function WalkthroughOverlay({
  scene,
  pointerLocked,
  ready,
  onExit,
  onCapture,
  onInteract,
  captureDisabled = false,
  onMoveVector,
}: {
  scene: SceneGraph;
  pointerLocked: boolean;
  ready: boolean;
  onExit?: () => void;
  onCapture?: () => void;
  onInteract?: () => void;
  captureDisabled?: boolean;
  onMoveVector?: (x: number, y: number) => void;
}) {
  const hoveredId = useViewer((s) => s.hoveredId),
    hovered: any = hoveredId ? scene.nodes[hoveredId] : null,
    door = hovered?.type === "door" ? hovered : null,
    scale = getWalkthroughScaleMetrics(scene);
  return (
    <div className="walkthrough-overlay">
      <TouchJoystick onMove={(x, y) => onMoveVector?.(x, y)} />
      <div className="walkthrough-topbar">
        <div>
          <b>第一人称漫游</b>
          <span>
            WASD 移动 · 点击锁定鼠标或按住拖动转向 · Shift 加速 · E 开关门 · C 拍照 · Esc 退出
          </span>
          <span>
            真实尺度 {scale.areaM2}㎡ · {scale.widthM} × {scale.depthM}m · 视点 1.65m
          </span>
        </div>
        <div>
          <button onClick={onInteract} disabled={!door}>开门</button>
          <button onClick={onCapture} disabled={captureDisabled} title={captureDisabled ? "已达到5个视角" : "拍摄当前3D视角"}>{captureDisabled ? "已达到5个视角" : "拍摄"}</button>
          <button onClick={onExit}>退出漫游</button>
        </div>
      </div>
      <div className={`walkthrough-crosshair ${door ? "interactive" : ""}`}>
        <i />
        <i />
      </div>
      {door && (
        <div className="walkthrough-interact-tip">
          <b>{door.name || "门"}</b>
          <span>左键 / E：开关门</span>
        </div>
      )}
      {!ready && (
        <div className="walkthrough-start-card">
          <b>正在切换到室内视角…</b>
        </div>
      )}
      {ready && !pointerLocked && (
        <div className="walkthrough-start-card">
          <b>已经进入住宅内部 · 点击3D画面锁定鼠标</b>
          <span>无法锁定时可直接按住左键拖动转向，WASD 继续移动。</span>
        </div>
      )}
    </div>
  );
}

function FurnitureInteractionBridge({
  scene,
  editMode,
  selectedItemId,
  onSelectItem,
  onAnchorChange,
  onInteractionActive,
  onDragCommit,
}: {
  scene: SceneGraph;
  editMode: boolean;
  selectedItemId?: string;
  onSelectItem?: (id: string) => void;
  onAnchorChange: (a: Anchor | null) => void;
  onInteractionActive: (a: boolean) => void;
  onDragCommit?: (id: string, x: number, z: number) => void;
}) {
  const { camera, gl } = useThree(),
    raycaster = useRef(new Raycaster()),
    pointer = useRef(new Vector2()),
    plane = useRef(new Plane()),
    point = useRef(new Vector3()),
    tempWorld = useRef(new Vector3()),
    lastProjectedAt = useRef(0),
    drag = useRef<any>(null);
  function anchorFromClient(clientX: number, clientY: number) {
    const rect = gl.domElement.getBoundingClientRect(),
      panelW = 176,
      panelH = 168;
    return {
      x: clampValue(
        clientX - rect.left + 14,
        8,
        Math.max(8, rect.width - panelW - 8),
      ),
      y: clampValue(
        clientY - rect.top - panelH * 0.46,
        8,
        Math.max(8, rect.height - panelH - 8),
      ),
    };
  }
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.furnitureEdit = editMode ? "true" : "false";
    canvas.style.touchAction = editMode ? "none" : "";
    if (!editMode) {
      drag.current = null;
      onInteractionActive(false);
      onAnchorChange(null);
    }
    return () => {
      delete canvas.dataset.furnitureEdit;
      canvas.style.touchAction = "";
    };
  }, [editMode, gl, onAnchorChange, onInteractionActive]);
  useEffect(() => {
    if (!editMode) return;
    const click = (event: any) => {
      const id = event?.node?.id;
      if (!id || scene.nodes[id]?.type !== "item") return;
      event.stopPropagation?.();
      const n = event.nativeEvent,
        cx = Number(n?.clientX ?? 0),
        cy = Number(n?.clientY ?? 0);
      onSelectItem?.(id);
      if (cx || cy) onAnchorChange(anchorFromClient(cx, cy));
    };
    const down = (event: any) => {
      const id = event?.node?.id,
        node: any = scene.nodes[id];
      if (!id || node?.type !== "item") return;
      event.stopPropagation?.();
      const n = event.nativeEvent,
        cx = Number(n?.clientX ?? 0),
        cy = Number(n?.clientY ?? 0);
      onSelectItem?.(id);
      if (cx || cy) onAnchorChange(anchorFromClient(cx, cy));
      onInteractionActive(true);
      const object = sceneRegistry.nodes.get(id),
        parent = object?.parent ?? null,
        localHit = new Vector3(
          ...(event.position ?? node.position ?? [0, 0, 0]),
        );
      if (parent) parent.worldToLocal(localHit);
      const world =
        object?.getWorldPosition(tempWorld.current) ??
        new Vector3(...node.position);
      drag.current = {
        id,
        y: Number(node.position?.[1] ?? 0),
        worldY: world.y,
        offsetX: Number(node.position?.[0] ?? 0) - localHit.x,
        offsetZ: Number(node.position?.[2] ?? 0) - localHit.z,
        lastX: Number(node.position?.[0] ?? 0),
        lastZ: Number(node.position?.[2] ?? 0),
        startClientX: cx,
        startClientY: cy,
        moved: false,
      };
    };
    emitter.on("item:click", click as any);
    emitter.on("item:pointerdown", down as any);
    return () => {
      emitter.off("item:click", click as any);
      emitter.off("item:pointerdown", down as any);
    };
  }, [editMode, scene, onSelectItem, onAnchorChange, onInteractionActive]);
  useEffect(() => {
    if (!editMode) return;
    const move = (e: PointerEvent) => {
      const st = drag.current;
      if (!st) return;
      const object = sceneRegistry.nodes.get(st.id);
      if (!object) return;
      const dist = Math.hypot(
        e.clientX - st.startClientX,
        e.clientY - st.startClientY,
      );
      if (dist < 3 && !st.moved) return;
      st.moved = true;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(pointer.current, camera);
      plane.current.set(new Vector3(0, 1, 0), -st.worldY);
      const hit = raycaster.current.ray.intersectPlane(
        plane.current,
        point.current,
      );
      if (!hit) return;
      const local = hit.clone();
      if (object.parent) object.parent.worldToLocal(local);
      const b = getFurnitureBounds(scene, st.id),
        x = clampValue(local.x + st.offsetX, b.minX, b.maxX),
        z = clampValue(local.z + st.offsetZ, b.minZ, b.maxZ);
      object.position.set(x, st.y, z);
      object.updateMatrixWorld(true);
      st.lastX = x;
      st.lastZ = z;
    };
    const up = () => {
      const st = drag.current;
      if (!st) return;
      drag.current = null;
      onInteractionActive(false);
      if (st.moved) onDragCommit?.(st.id, st.lastX, st.lastZ);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [editMode, scene, camera, gl, onInteractionActive, onDragCommit]);
  useEffect(() => {
    const viewer: any = useViewer.getState(),
      arr: any[] = viewer?.outliner?.selectedObjects;
    if (!arr) return;
    arr.length = 0;
    if (editMode && selectedItemId) {
      const o = sceneRegistry.nodes.get(selectedItemId);
      if (o) arr.push(o);
    }
  }, [editMode, selectedItemId, scene]);
  useFrame(({ clock }) => {
    if (!editMode || !selectedItemId || drag.current) return;
    const elapsed = clock.elapsedTime;
    if (elapsed - lastProjectedAt.current < 0.12) return;
    lastProjectedAt.current = elapsed;
    const object = sceneRegistry.nodes.get(selectedItemId);
    if (!object) return;
    const world = object.getWorldPosition(tempWorld.current),
      projected = world.clone().project(camera),
      rect = gl.domElement.getBoundingClientRect(),
      cx = rect.left + ((projected.x + 1) / 2) * rect.width,
      cy = rect.top + ((1 - projected.y) / 2) * rect.height;
    if (projected.z > 1 || projected.z < -1) return;
    onAnchorChange(anchorFromClient(cx, cy));
  });
  return null;
}

function FurniturePalette({
  scene,
  selectedItemId,
  onSelectItem,
  onAnchorChange,
}: {
  scene: SceneGraph;
  selectedItemId?: string;
  onSelectItem?: (id: string) => void;
  onAnchorChange: (anchor: Anchor | null) => void;
}) {
  const { camera, gl } = useThree();
  const items = Object.values(scene.nodes).filter((node: any) => node.type === "item") as any[];
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
    <div className="furniture-edit-list" style={{ pointerEvents: "auto" }}>
      <b>家具选择</b>
      {items.map((node) => (
        <button
          key={node.id}
          className={selectedItemId === node.id ? "active" : ""}
          onClick={() => {
            onSelectItem?.(node.id);
            const object = sceneRegistry.nodes.get(node.id);
            const rect = gl.domElement.getBoundingClientRect();
            if (!object) {
              onAnchorChange({ x: 18, y: 92 });
              return;
            }
            const projected = object.getWorldPosition(new Vector3()).project(camera);
            onAnchorChange({
              x: clampValue(((projected.x + 1) / 2) * rect.width + 14, 8, Math.max(8, rect.width - 184)),
              y: clampValue(((1 - projected.y) / 2) * rect.height - 70, 8, Math.max(8, rect.height - 176)),
            });
          }}
        >
          {node.name || node.id}
        </button>
      ))}
      {!items.length && <span>当前户型暂无可调整家具</span>}
    </div>
    </Html>
  );
}

export default function PascalViewer({
  scene,
  revision,
  editMode = false,
  selectedItemId,
  selectedItemLabel,
  onSelectItem,
  onNudgeItem,
  onRotateItem,
  onDragCommit,
  onClearSelection,
  doorEditMode = false,
  selectedDoorId,
  onSelectDoor,
  onMoveDoor,
  onDeleteDoor,
  onToggleDoorHinge,
  onToggleDoorSwing,
  doorPlacementMode = false,
  onPickDoorWall,
  wallEditMode = false,
  selectedWallIds = [],
  wallAddMode = false,
  onSelectWall,
  onWallEndpointCommit,
  onWallParallelCommit,
  onAddWallCommit,
  debugUi = false,
  viewMode = "3d",
  blueprintImageUrl,
  modifiedBlueprintImageUrl,
  overlayOpacity = 45,
  blueprintCalibration,
  walkthroughMode = false,
  onExitWalkthrough,
  onCaptureView,
  captureDisabled = false,
  sessionId = "local-session",
  roomName,
}: Props) {
  const actionsRef = useRef<ViewerActions | null>(null);
  const captureContextRef = useRef<CaptureContext | null>(null);
  const previousTheme = useRef<string | null>(null);
  // 小人（漫游位置标志）：记录上次漫游位置，退出后停在该处，下次从该处进入
  const [walkthroughPos, setWalkthroughPos] = useState<{ x: number; z: number; yaw: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("dreamhouse.walkthrough.position") || "null"); } catch { return null; }
  });
  const [overviewWalls, setOverviewWalls] = useState<OverviewWallMode>("translucent");
  const [overviewReset, setOverviewReset] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [ready, setReady] = useState(false),
    [interactionActive, setInteractionActive] = useState(false),
    [anchor, setAnchor] = useState<Anchor | null>(null),
    [pointerLocked, setPointerLocked] = useState(false),
    [walkthroughReady, setWalkthroughReady] = useState(false),
    [captureFlash, setCaptureFlash] = useState(false);
  const captureFlashTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (captureFlashTimer.current) window.clearTimeout(captureFlashTimer.current);
  }, []);
  useEffect(() => {
    let disposed = false;
    void pluginReady.then(() => {
      if (disposed) return;
      const integrity = assertPascalSceneIntegrity(scene);
      if (!integrity.valid) {
        console.error("[Pascal] refusing invalid scene", integrity);
        return;
      }
      applySceneSnapshot(withResidentialWallFinish(scene) as any, { origin: "load" });
      const v = useViewer.getState(),
        mobile = typeof window !== "undefined" && window.innerWidth < 800;
      if (previousTheme.current === null) previousTheme.current = v.sceneTheme;
      v.setSceneTheme(walkthroughMode ? previousTheme.current : "studio");
      v.setRenderContext("viewer");
      v.setCameraMode("perspective");
      v.setWallMode(presentationWallMode(walkthroughMode, overviewWalls));
      v.setLevelMode("stacked");
      v.setShowZones(false);
      v.setShowGrid(false);
      v.setShowMeasurements(false);
      v.setShowGuides(false);
      v.setShowScans(false);
      v.setShading(mobile ? "solid" : "rendered");
      v.setTextures(true);
      v.setShadows(!mobile);
      v.setEdges(mobile ? "off" : "soft");
      setReady(true);
    });
    return () => {
      disposed = true;
    };
  }, [scene, revision]);
  useEffect(() => {
    if (!editMode) {
      setAnchor(null);
      setInteractionActive(false);
    }
  }, [editMode]);
  useEffect(() => {
    if (!doorPlacementMode) return;
    const pick = (event: any) => {
      const id = event?.node?.id;
      if (!id || scene.nodes[id]?.type !== "wall") return;
      const wall: any = scene.nodes[id];
      if (wall.metadata?.editable === false || wall.metadata?.locked || wall.metadata?.structural_type === "load_bearing") return;
      event.stopPropagation?.();
      onPickDoorWall?.(id);
    };
    emitter.on("wall:click", pick as any);
    emitter.on("wall:pointerdown", pick as any);
    return () => {
      emitter.off("wall:click", pick as any);
      emitter.off("wall:pointerdown", pick as any);
    };
  }, [doorPlacementMode, scene, onPickDoorWall]);
  useEffect(() => {
    if (!ready) return;
    const v = useViewer.getState();
    if (walkthroughMode) {
      setOverviewExpanded(false);
      setAnchor(null);
      setInteractionActive(false);
      setWalkthroughReady(false);
      v.setCameraMode("perspective");
      v.setWallMode(presentationWallMode(true, overviewWalls));
      if (previousTheme.current) v.setSceneTheme(previousTheme.current);
      v.setWalkthroughMode(true);
      v.setSelection({ selectedIds: [], zoneId: null });
      return;
    }
    v.setWalkthroughMode(false);
    v.setWalkthroughSuspended(false);
    setWalkthroughReady(false);
    v.setHoveredId(null);
    v.setWallMode(presentationWallMode(false, overviewWalls));
    v.setSceneTheme("studio");
    setPointerLocked(false);
  }, [ready, walkthroughMode, overviewWalls]);
  useEffect(() => () => {
    if (previousTheme.current) useViewer.getState().setSceneTheme(previousTheme.current);
  }, []);
  if (!ready) return <div className="viewer-loading">正在加载住宅模型…</div>;
  if (viewMode !== "3d" && !walkthroughMode)
    return (
      <div className="pascal-viewer-shell is-blueprint-view">
        <BlueprintTopView
          scene={scene}
          imageUrl={viewMode === "overlay" ? blueprintImageUrl : undefined}
          modifiedImageUrl={viewMode === "overlay" ? modifiedBlueprintImageUrl : undefined}
          overlayOpacity={overlayOpacity}
          calibration={blueprintCalibration}
          wallEditMode={wallEditMode}
          selectedWallIds={selectedWallIds}
          wallAddMode={wallAddMode}
          onSelectWall={onSelectWall}
          onWallEndpointCommit={onWallEndpointCommit}
          onWallParallelCommit={onWallParallelCommit}
          onAddWallCommit={onAddWallCommit}
          debugUi={debugUi}
        />
      </div>
    );
  const captureCurrentView = () => {
    const context = captureContextRef.current;
    const canvas = (context?.gl?.domElement || null) as HTMLCanvasElement | null;
    if (!canvas || !canvas.width || !canvas.height) {
      console.warn("[Pascal] captureCurrentView: canvas unavailable");
      return;
    }
    let camera: any = { position: [0, 0, 0] };
    try {
      camera = JSON.parse(canvas.dataset.cameraPose || JSON.stringify(camera));
    } catch {}
    const p = camera.position || [0, 0, 0];
    const pointIn = (poly: any[], x: number, z: number) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0],
          zi = poly[i][1],
          xj = poly[j][0],
          zj = poly[j][1],
          hit =
            zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
        if (hit) inside = !inside;
      }
      return inside;
    };
    const zone = Object.values(scene.nodes).find(
      (n: any) =>
        n.type === "zone" &&
        pointIn(n.polygon || [], Number(p[0]), Number(p[2])),
    ) as any;
    let image = "";
    try {
      // Pascal Viewer uses frameloop="never". Render this exact R3F scene and
      // camera immediately before exporting so the drawing buffer is current.
      context?.gl?.render?.(context.scene, context.camera);
      image = canvas.toDataURL("image/png");
    } catch (error) {
      console.error("[3D CAPTURE] canvas export failed", error);
      return;
    }
    console.info("[3D CAPTURE]", {
      hasImage: Boolean(image),
      prefix: image.slice(0, 30),
      length: image.length,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });
    if (!/^data:image\/(?:png|jpeg|jpg);base64,/i.test(image) || image.length < 1000) {
      console.warn("[3D CAPTURE] rejected empty or invalid image", { length: image.length });
      return;
    }
    onCaptureView?.({
      id: `view-${Date.now()}`,
      sessionId,
      sceneRevision: revision,
      roomId: zone?.id,
      roomName: zone?.name || roomName,
      image,
      screenshotDataUrl: image,
      camera,
      capturedAt: new Date().toISOString(),
    });
    setCaptureFlash(true);
    if (captureFlashTimer.current) window.clearTimeout(captureFlashTimer.current);
    captureFlashTimer.current = window.setTimeout(() => setCaptureFlash(false), 100);
  };
  return (
    <div
      className={`pascal-viewer-shell ${editMode ? "is-furniture-editing" : ""} ${doorEditMode ? "is-door-editing" : ""} ${walkthroughMode ? "is-walkthrough" : overviewExpanded ? "is-overview-expanded" : ""}`}
    >
      <div className="pascal-viewer">
        <Viewer
          selectionManager="custom"
          sceneReadyKey={`${revision}:${walkthroughMode ? "walkthrough" : "editor"}`}
        >
          <CaptureContextBridge contextRef={captureContextRef} />
          <PascalBlockMeshes scene={scene} />
          {!walkthroughMode && (
            <CameraRig
              scene={scene}
              reset={overviewReset}
              interactionActive={interactionActive}
            />
          )}{" "}
          {!walkthroughMode && <SceneEnvironment />}
          {!walkthroughMode && (
            <FurnitureInteractionBridge
              scene={scene}
              editMode={editMode && !doorEditMode}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
              onAnchorChange={setAnchor}
              onInteractionActive={setInteractionActive}
              onDragCommit={onDragCommit}
            />
          )}{" "}
          {!walkthroughMode && (
            <DoorInteractionBridge
              scene={scene}
              active={doorEditMode}
              selectedDoorId={selectedDoorId}
              onSelectDoor={onSelectDoor}
              onMoveDoor={onMoveDoor}
              onDeleteDoor={onDeleteDoor}
              onToggleDoorHinge={onToggleDoorHinge}
              onToggleDoorSwing={onToggleDoorSwing}
              debugUi={debugUi}
              onInteractionActive={setInteractionActive}
            />
          )}{" "}
          {walkthroughMode && (
            <PascalWalkthroughController
              scene={scene}
              active
              onExit={onExitWalkthrough}
              onPointerLockChange={setPointerLocked}
              onReadyChange={setWalkthroughReady}
              onCapture={captureCurrentView}
              actionsRef={actionsRef}
              onPositionChange={(pos) => setWalkthroughPos(pos)}
            />
          )}
          {editMode && !walkthroughMode && (
            <FurniturePalette
              scene={scene}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
              onAnchorChange={setAnchor}
            />
          )}
        </Viewer>
      </div>
      {!walkthroughMode && (
        <>
          <div className="overview-presentation-controls" role="group" aria-label="三维概览呈现">
            <button type="button" className={overviewWalls === "translucent" ? "active" : "ghost"} aria-pressed={overviewWalls === "translucent"} onClick={() => setOverviewWalls("translucent")}>概览剖视</button>
            <button type="button" className={overviewWalls === "up" ? "active" : "ghost"} aria-pressed={overviewWalls === "up"} onClick={() => setOverviewWalls("up")}>完整墙体</button>
            <button type="button" className="ghost" onClick={() => setOverviewReset((value) => value + 1)}>居中</button>
            <button type="button" className="ghost" aria-pressed={overviewExpanded} onClick={() => setOverviewExpanded((value) => !value)}>{overviewExpanded ? "退出放大" : "放大查看"}</button>
          </div>
          <div className="overview-presentation-note" role="status">{overviewWalls === "translucent" ? "概览剖视：墙体透明，仅影响显示" : "完整墙体：显示真实墙高"}</div>
        </>
      )}
      {captureFlash && <div className="walkthrough-capture-flash" aria-hidden="true" />}
      {walkthroughMode && (
        <WalkthroughOverlay
          scene={scene}
          pointerLocked={pointerLocked}
          ready={walkthroughReady}
          onExit={onExitWalkthrough}
          onCapture={() => {
            if (actionsRef.current) actionsRef.current.capture();
            else captureCurrentView();
          }}
          onInteract={() => actionsRef.current?.interact()}
          captureDisabled={captureDisabled}
        />
      )}{" "}
      {editMode && !walkthroughMode && (
        <div className="furniture-edit-hint">
          <b>家具调整中</b>
          <span>点击家具显示控制键；按住家具可直接拖动。</span>
        </div>
      )}{" "}
      {doorEditMode && !walkthroughMode && (
        <div className="door-edit-hint">
          <b>门编辑中</b>
          <span>选择室内门后沿墙拖动；绿色预览可放置，红色预览会恢复原位。</span>
        </div>
      )}{" "}
      {doorEditMode && !walkthroughMode && (
        <div className="door-edit-list">
          {Object.values(scene.nodes).filter((node) => node.type === "door").map((door) => {
            const locked = Boolean(door.id === "door_entry" || door.locked || door.metadata?.locked);
            return (
              <span key={`${door.id}-controls`} className="door-edit-row">
              <button
                className={selectedDoorId === door.id ? "active" : ""}
                disabled={locked}
                onClick={() => !locked && onSelectDoor?.(door.id)}
                title={locked ? "锁定门不可移动" : `选择 ${door.name || door.id}`}
              >
                {door.name || door.id}{locked ? " · 锁定" : ""}
              </button>
              {selectedDoorId === door.id && !locked && onDeleteDoor && (
                <button type="button" className="door-delete-inline" onClick={() => onDeleteDoor(door.id)}>删除门</button>
              )}
              {selectedDoorId === door.id && !locked && onToggleDoorHinge && (
                <button type="button" onClick={() => onToggleDoorHinge(door.id)}>翻转铰链</button>
              )}
              {selectedDoorId === door.id && !locked && onToggleDoorSwing && (
                <button type="button" onClick={() => onToggleDoorSwing(door.id)}>切换开启方向</button>
              )}
              </span>
            );
          })}
        </div>
      )}{" "}
      {editMode && !walkthroughMode && selectedItemId && (
        <div
          className="inworld-furniture-control"
          style={{ left: 14, top: 118 }}
        >
          <div className="inworld-control-head">
            <b>{selectedItemLabel || "已选择家具"}</b>
            <button
              onClick={() => {
                setAnchor(null);
                onClearSelection?.();
              }}
            >
              ×
            </button>
          </div>
          <div className="inworld-dpad">
            <span />
            <button
              onClick={() =>
                onNudgeItem?.(selectedItemId, 0, -FURNITURE_MOVE_STEP)
              }
            >
              ↑
            </button>
            <span />
            <button
              onClick={() =>
                onNudgeItem?.(selectedItemId, -FURNITURE_MOVE_STEP, 0)
              }
            >
              ←
            </button>
            <span className="inworld-center">移动</span>
            <button
              onClick={() =>
                onNudgeItem?.(selectedItemId, FURNITURE_MOVE_STEP, 0)
              }
            >
              →
            </button>
            <span />
            <button
              onClick={() =>
                onNudgeItem?.(selectedItemId, 0, FURNITURE_MOVE_STEP)
              }
            >
              ↓
            </button>
            <span />
          </div>
          <div className="inworld-rotate-row">
            <button
              onClick={() =>
                onRotateItem?.(selectedItemId, -FURNITURE_ROTATE_STEP_DEG)
              }
            >
              ↺ 左转
            </button>
            <button
              onClick={() =>
                onRotateItem?.(selectedItemId, FURNITURE_ROTATE_STEP_DEG)
              }
            >
              右转 ↻
            </button>
          </div>
          <div className="inworld-drag-tip">也可以直接按住该家具拖动</div>
        </div>
      )}
    </div>
  );
}
