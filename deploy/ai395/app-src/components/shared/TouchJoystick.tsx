"use client";

import { useRef, type PointerEvent } from "react";

type Props = {
  onMove: (x: number, y: number) => void;
  onEnd?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Pointer-event joystick. It emits a normalized vector for any touch/pen UI. */
export default function TouchJoystick({ onMove, onEnd }: Props) {
  const activePointer = useRef<number | null>(null);
  const update = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / distance);
    onMove(clamp((dx * scale) / radius, -1, 1), clamp((-dy * scale) / radius, -1, 1));
  };
  return (
    <div
      className="touch-joystick"
      role="slider"
      aria-label="移动摇杆"
      aria-valuemin={-1}
      aria-valuemax={1}
      onPointerDown={(event) => {
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        onMove(0, 0);
        onEnd?.();
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }}
      onPointerCancel={() => {
        activePointer.current = null;
        onMove(0, 0);
        onEnd?.();
      }}
    >
      <span />
    </div>
  );
}
