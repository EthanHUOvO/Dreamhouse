"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  type AnyNodeId,
  isOperationDoorType,
  useInteractive,
  useScene,
} from "@pascal-app/core";
import { useViewer } from "@pascal-app/viewer";
import type { SceneGraph } from "@/lib/types";
import type { ViewerActions } from "@/lib/viewer-actions";
import {
  findWalkthroughDoorTarget,
  resolveWalkthroughMove,
  resolveWalkthroughSpawn,
  isWalkthroughPositionBlocked,
  WALKTHROUGH_PLAYER_RADIUS,
  WALKTHROUGH_RUN_SPEED,
  WALKTHROUGH_WALK_SPEED,
} from "@/lib/walkthrough-runtime";

type Props = {
  scene: SceneGraph;
  active: boolean;
  onExit?: () => void;
  onPointerLockChange?: (locked: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
  onCapture?: () => void;
  onPositionChange?: (pos: { x: number; z: number; yaw: number }) => void;
  actionsRef?: MutableRefObject<ViewerActions | null>;
};
export default function PascalWalkthroughController({
  scene,
  active,
  onExit,
  onPointerLockChange,
  onReadyChange,
  onCapture,
  onPositionChange,
  actionsRef,
}: Props) {
  const { camera, gl, invalidate } = useThree();
  const keys = useRef(new Set<string>()),
    yaw = useRef(0),
    pitch = useRef(0),
    player = useRef({ x: 0, z: 0 }),
    openDoors = useRef(new Set<string>()),
    touchedDoors = useRef(new Set<string>()),
    targetDoor = useRef<string | null>(null),
    hadPointerLock = useRef(false),
    dragLook = useRef({ active: false, moved: false, x: 0, y: 0 }),
    exitRef = useRef(onExit),
    positionRef = useRef(onPositionChange),
    lockRef = useRef(onPointerLockChange),
    readyRef = useRef(onReadyChange),
    captureRef = useRef(onCapture),
    moveVector = useRef({ x: 0, y: 0 }),
    lastCaptureAt = useRef(0),
    sceneRef = useRef(scene);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);
  useEffect(() => {
    positionRef.current = onPositionChange;
  }, [onPositionChange]);
  useEffect(() => {
    lockRef.current = onPointerLockChange;
  }, [onPointerLockChange]);
  useEffect(() => {
    readyRef.current = onReadyChange;
  }, [onReadyChange]);
  useEffect(() => {
    captureRef.current = onCapture;
  }, [onCapture]);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);
  function markDoorDirty(id: string) {
    const s: any = useScene.getState(),
      n: any = s.nodes?.[id];
    s.dirtyNodes?.add?.(id);
    if (n?.parentId) s.dirtyNodes?.add?.(n.parentId);
  }
  function setDoorOpen(id: string, open: boolean) {
    const original: any = sceneRef.current.nodes[id];
    if (!original || original.type !== "door") return;
    const current: any = useScene.getState().nodes?.[id] ?? original;
    if (!current || typeof current.type !== "string") {
      console.error("[Pascal] invalid door node", original);
      return;
    }
    try {
      const interactive = useInteractive.getState();
      const doorId = id as AnyNodeId;
      const operationDoor = isOperationDoorType(current.doorType);
      const field = operationDoor ? "operationState" : "swingAngle";
      const runtimeValue = interactive.doors[doorId]?.[field];
      const queuedValue = interactive.doorAnimations[doorId]?.to;
      const nodeValue = Number(current[field] ?? 0);
      const from = Number(runtimeValue ?? queuedValue ?? nodeValue);
      interactive.startDoorAnimation(doorId, {
        field,
        from,
        to: open ? (operationDoor ? 1 : Math.PI / 2) : 0,
        startedAt: null,
        durationMs: 420,
        // Scene writes in Pascal beta currently pass through a broken schema
        // discriminator path. Door motion is runtime interaction state only.
        persist: false,
      });
      touchedDoors.current.add(id);
    } catch (error) {
      console.error("[Pascal] door interaction failed", {
        id,
        node: original,
        error,
      });
      return;
    }
    markDoorDirty(id);
    if (open) openDoors.current.add(id);
    else openDoors.current.delete(id);
  }
  function toggleTargetDoor() {
    const id = targetDoor.current;
    if (id) setDoorOpen(id, !openDoors.current.has(id));
  }
  function captureWithCooldown() {
    const now = Date.now();
    if (now - lastCaptureAt.current < 700) return;
    lastCaptureAt.current = now;
    captureRef.current?.();
  }
  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement,
      spawn = resolveWalkthroughSpawn(sceneRef.current);
    // 从上次漫游位置（小人标志的位置）恢复，否则用默认出生点
    let saved: any = null;
    try { saved = JSON.parse(localStorage.getItem("dreamhouse.walkthrough.position") || "null"); } catch {}
    const savedValid = Boolean(saved) && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.z)) &&
      !isWalkthroughPositionBlocked(sceneRef.current, Number(saved.x), Number(saved.z), new Set(), WALKTHROUGH_PLAYER_RADIUS);
    const startX = savedValid ? Number(saved.x) : spawn.x;
    const startZ = savedValid ? Number(saved.z) : spawn.z;
    const startYaw = savedValid ? Number(saved.yaw) : spawn.yaw;
    yaw.current = startYaw;
    pitch.current = 0;
    player.current = { x: startX, z: startZ };
    hadPointerLock.current = false;
    keys.current.clear();
    moveVector.current = { x: 0, y: 0 };
    lastCaptureAt.current = 0;
    openDoors.current.clear();
    touchedDoors.current.clear();
    targetDoor.current = null;
    const perspective: any = camera,
      oldFov = perspective.isPerspectiveCamera ? perspective.fov : null,
      oldNear = perspective.isPerspectiveCamera ? perspective.near : null;
    if (perspective.isPerspectiveCamera) {
      perspective.fov = 72;
      perspective.near = 0.05;
      perspective.updateProjectionMatrix();
    }
    camera.position.set(startX, spawn.eyeY, startZ);
    camera.rotation.order = "YXZ";
    camera.rotation.set(0, startYaw, 0, "YXZ");
    camera.updateMatrixWorld(true);
    invalidate();
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });
    canvas.dataset.walkthrough = "true";
    canvas.style.cursor = "crosshair";
    canvas.style.touchAction = "none";
    // Mark the controller ready before optional Pascal store calls. A store
    // adapter error must not leave the whole walkthrough overlay in loading.
    readyRef.current?.(true);
    try {
      useViewer.getState().setHoveredId(null);
    } catch (error) {
      console.error("[Pascal] walkthrough store initialization failed", error);
    }
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement ||
      (t instanceof HTMLElement && t.isContentEditable);
    const focusCanvas = () => {
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    };
    const movementCodes = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
    ]);
    const kd = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const code = movementCodes.has(e.code)
        ? e.code
        : movementCodes.has(`Key${String(e.key || "").toUpperCase()}`)
          ? `Key${String(e.key || "").toUpperCase()}`
          : e.code;
      if (movementCodes.has(code)) {
        e.preventDefault();
        keys.current.add(code);
        invalidate();
        return;
      }
      if (e.code === "KeyE" || e.code === "KeyR") {
        e.preventDefault();
        toggleTargetDoor();
        return;
      }
      if ((e.code === "KeyC" || String(e.key || "").toLowerCase() === "c") && !e.repeat) {
        e.preventDefault();
        captureWithCooldown();
        return;
      }
      if ((e.key === "Enter" || e.code === "Enter") && !e.repeat) {
        e.preventDefault();
        captureWithCooldown();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        else exitRef.current?.();
      }
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.code);
    const mm = (e: MouseEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !dragLook.current.active) return;
      const dx = locked ? e.movementX : e.clientX - dragLook.current.x;
      const dy = locked ? e.movementY : e.clientY - dragLook.current.y;
      if (!locked) {
        dragLook.current.x = e.clientX;
        dragLook.current.y = e.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 1) dragLook.current.moved = true;
      }
      yaw.current -= dx * 0.0028;
      pitch.current = Math.max(
        -1.48,
        Math.min(1.48, pitch.current - dy * 0.0028),
      );
      invalidate();
    };
    const pointerDownLook = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.button !== 0) return;
      focusCanvas();
      canvas.setPointerCapture?.(e.pointerId);
      dragLook.current = { active: true, moved: false, x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const pointerMoveLook = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !dragLook.current.active) return;
      const dx = e.clientX - dragLook.current.x;
      const dy = e.clientY - dragLook.current.y;
      dragLook.current.x = e.clientX;
      dragLook.current.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 1) dragLook.current.moved = true;
      yaw.current -= dx * 0.0028;
      pitch.current = Math.max(-1.48, Math.min(1.48, pitch.current - dy * 0.0028));
      invalidate();
      e.preventDefault();
    };
    const pointerUpLook = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !dragLook.current.active) return;
      const shouldToggle = !dragLook.current.moved;
      dragLook.current.active = false;
      canvas.releasePointerCapture?.(e.pointerId);
      if (shouldToggle) toggleTargetDoor();
    };
    const md = (e: MouseEvent) => {
      if (e.target !== canvas || e.button !== 0) return;
      focusCanvas();
      dragLook.current = {
        active: true,
        moved: false,
        x: e.clientX,
        y: e.clientY,
      };
      if (document.pointerLockElement !== canvas) {
        const r: any = canvas.requestPointerLock?.();
        r?.catch?.(() => {});
        return;
      }
      e.preventDefault();
    };
    const mu = (e: MouseEvent) => {
      if (e.button !== 0 || !dragLook.current.active) return;
      const shouldToggle = !dragLook.current.moved;
      dragLook.current.active = false;
      if (shouldToggle && document.pointerLockElement === canvas)
        toggleTargetDoor();
    };
    const lc = () => {
      const locked = document.pointerLockElement === canvas;
      lockRef.current?.(locked);
      if (locked) {
        hadPointerLock.current = true;
        dragLook.current.active = false;
        focusCanvas();
        return;
      }
      if (hadPointerLock.current) exitRef.current?.();
    };
    const blur = () => keys.current.clear();
    const pointerDown = () => focusCanvas();
    const click = () => focusCanvas();
    window.addEventListener("keydown", kd, true);
    window.addEventListener("keyup", ku, true);
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
    canvas.addEventListener("mousedown", md, true);
    canvas.addEventListener("pointerdown", pointerDownLook, true);
    canvas.addEventListener("pointermove", pointerMoveLook, true);
    canvas.addEventListener("pointerup", pointerUpLook, true);
    canvas.addEventListener("pointercancel", pointerUpLook, true);
    canvas.addEventListener("pointerdown", pointerDown, true);
    canvas.addEventListener("click", click, true);
    document.addEventListener("pointerlockchange", lc);
    window.addEventListener("blur", blur);
    const actions: ViewerActions = {
      moveForward: () => { moveVector.current = { x: 0, y: 1 }; },
      moveBackward: () => { moveVector.current = { x: 0, y: -1 }; },
      moveLeft: () => { moveVector.current = { x: -1, y: 0 }; },
      moveRight: () => { moveVector.current = { x: 1, y: 0 }; },
      setMoveVector: (x, y) => {
        const length = Math.hypot(x, y) || 1;
        moveVector.current = length > 1 ? { x: x / length, y: y / length } : { x, y };
      },
      look: (deltaX, deltaY) => {
        yaw.current -= deltaX * 0.0028;
        pitch.current = Math.max(-1.48, Math.min(1.48, pitch.current - deltaY * 0.0028));
        invalidate();
      },
      interact: toggleTargetDoor,
      capture: captureWithCooldown,
    };
    if (actionsRef) actionsRef.current = actions;
    return () => {
      window.removeEventListener("keydown", kd, true);
      window.removeEventListener("keyup", ku, true);
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("mouseup", mu);
      canvas.removeEventListener("mousedown", md, true);
      canvas.removeEventListener("pointerdown", pointerDownLook, true);
      canvas.removeEventListener("pointermove", pointerMoveLook, true);
      canvas.removeEventListener("pointerup", pointerUpLook, true);
      canvas.removeEventListener("pointercancel", pointerUpLook, true);
      canvas.removeEventListener("pointerdown", pointerDown, true);
      canvas.removeEventListener("click", click, true);
      document.removeEventListener("pointerlockchange", lc);
      window.removeEventListener("blur", blur);
      if (actionsRef && actionsRef.current === actions) actionsRef.current = null;
      keys.current.clear();
      moveVector.current = { x: 0, y: 0 };
      dragLook.current.active = false;
      targetDoor.current = null;
      useViewer.getState().setHoveredId(null);
      for (const id of touchedDoors.current) {
        const interactive = useInteractive.getState();
        const doorId = id as AnyNodeId;
        interactive.cancelDoorAnimation(doorId);
        interactive.removeDoorOpenState(doorId);
        markDoorDirty(id);
      }
      openDoors.current.clear();
      touchedDoors.current.clear();
      try { localStorage.setItem("dreamhouse.walkthrough.position", JSON.stringify({ x: player.current.x, z: player.current.z, yaw: yaw.current })); } catch {}
      positionRef.current?.({ x: player.current.x, z: player.current.z, yaw: yaw.current });
      delete canvas.dataset.walkthrough;
      canvas.style.cursor = "";
      canvas.style.touchAction = "";
      lockRef.current?.(false);
      readyRef.current?.(false);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      if (perspective.isPerspectiveCamera) {
        if (oldFov !== null) perspective.fov = oldFov;
        if (oldNear !== null) perspective.near = oldNear;
        perspective.updateProjectionMatrix();
      }
    };
  }, [active, camera, gl, invalidate]);
  useFrame((_, rawDelta) => {
    if (!active) return;
    const delta = Math.min(rawDelta, 0.05),
      p = keys.current,
      forward =
        (p.has("KeyW") || p.has("ArrowUp") ? 1 : 0) -
        (p.has("KeyS") || p.has("ArrowDown") ? 1 : 0) +
        moveVector.current.y,
      strafe =
        (p.has("KeyD") || p.has("ArrowRight") ? 1 : 0) -
        (p.has("KeyA") || p.has("ArrowLeft") ? 1 : 0) +
        moveVector.current.x;
    if (forward || strafe) {
      const l = Math.hypot(forward, strafe) || 1,
        f = forward / l,
        s = strafe / l,
        fx = -Math.sin(yaw.current),
        fz = -Math.cos(yaw.current),
        rx = Math.cos(yaw.current),
        rz = -Math.sin(yaw.current),
        speed =
          p.has("ShiftLeft") || p.has("ShiftRight")
            ? WALKTHROUGH_RUN_SPEED
            : WALKTHROUGH_WALK_SPEED,
        desired = {
          x: player.current.x + (fx * f + rx * s) * speed * delta,
          z: player.current.z + (fz * f + rz * s) * speed * delta,
        };
      player.current = resolveWalkthroughMove(
        sceneRef.current,
        player.current,
        desired,
        openDoors.current,
      );
    }
    const spawn = resolveWalkthroughSpawn(sceneRef.current);
    camera.position.set(player.current.x, spawn.eyeY, player.current.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    camera.updateMatrixWorld(true);
    (gl.domElement as HTMLCanvasElement).dataset.cameraPose = JSON.stringify({
      position: [camera.position.x, camera.position.y, camera.position.z],
      rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      target: [
        camera.position.x - Math.sin(yaw.current) * Math.cos(pitch.current),
        camera.position.y - Math.sin(pitch.current),
        camera.position.z - Math.cos(yaw.current) * Math.cos(pitch.current),
      ],
      fov: (camera as any).fov,
    });
    (gl.domElement as HTMLCanvasElement).dataset.walkthroughFrames = String(
      Number((gl.domElement as HTMLCanvasElement).dataset.walkthroughFrames || 0) + 1,
    );
    const next = findWalkthroughDoorTarget(
      sceneRef.current,
      player.current,
      yaw.current,
    );
    if (next !== targetDoor.current) {
      targetDoor.current = next;
      useViewer.getState().setHoveredId(next as any);
    }
    if (keys.current.size > 0) invalidate();
  });
  return null;
}
