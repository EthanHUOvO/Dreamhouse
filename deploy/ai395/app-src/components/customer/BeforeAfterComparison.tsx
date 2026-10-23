"use client";

import { useEffect, useRef, useState } from "react";

type BeforeAfterComparisonProps = {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
};

export function BeforeAfterComparison({
  beforeImage,
  afterImage,
  beforeLabel = "装修前",
  afterLabel = "装修后",
}: BeforeAfterComparisonProps) {
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [sourceSize, setSourceSize] = useState({ source: "", width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setViewport({ width: container.clientWidth, height: container.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // One fitted camera frame for both images, including old results whose
  // aspect ratio was changed by the model's 32-pixel input-size rounding.
  const ratio = sourceSize.source === beforeImage && sourceSize.height > 0
    ? sourceSize.width / sourceSize.height : 1;
  const width = Math.min(viewport.width, viewport.height * ratio);
  const height = width / ratio;

  function updatePosition(clientX: number) {
    const element = frameRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      className="before-after-comparison"
      ref={containerRef}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePosition(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) updatePosition(event.clientX);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      role="group"
      aria-label="装修前后滑动对比"
    >
      <div
        ref={frameRef}
        className="before-after-image-frame"
        style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width, height, overflow: "hidden" }}
      >
      <img className="before-after-image before-after-image-after" src={afterImage} alt={afterLabel}
        style={{ objectFit: "fill", border: 0, borderRadius: 0, boxShadow: "none" }} />
      <img
        className="before-after-image before-after-image-before"
        src={beforeImage}
        alt={beforeLabel}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.getAttribute("src") === beforeImage)
            setSourceSize({ source: beforeImage, width: image.naturalWidth, height: image.naturalHeight });
        }}
        style={{ objectFit: "fill", border: 0, borderRadius: 0, boxShadow: "none", clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <div className="before-after-divider" style={{ left: `${position}%` }} aria-hidden="true">
        <span>↔</span>
      </div>
      <span className="before-after-label before-after-label-before">{beforeLabel}</span>
      <span className="before-after-label before-after-label-after">{afterLabel}</span>
      </div>
    </div>
  );
}
