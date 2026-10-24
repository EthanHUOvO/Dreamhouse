import type { FloorplanOpening, FloorplanSpec, FloorplanWall, Point } from "../types";

export type PascalV2Scale = {
  pixelToMeterX: number;
  pixelToMeterZ: number;
  confidence: "high" | "medium" | "low";
  references: string[];
};

export type PascalV2Spec = FloorplanSpec & {
  schema: "dreamhouse-pascal-floorplan/v2";
  sourceImageDimensions?: { widthPx: number; heightPx: number };
  sourceCropPx?: { x: number; y: number; width: number; height: number };
  sourceDimensions: { widthM: number | null; depthM: number | null };
  scale: PascalV2Scale;
  sourceOuterPolygonPx: Point[];
  sourceConfidence: "high" | "medium" | "low";
  needsManualReview: boolean;
  reconstructionNotes: string[];
  recognitionRulesVersion: string;
  virtualBoundaries: Array<{ id: string; start: Point; end: Point; sourceEvidence: string; roomIds?: string[] }>;
  walls: Array<FloorplanWall & { sourceEvidence?: { className: string; pixels?: Point[]; confidence: "high" | "medium" | "low" } }>;
  doors: Array<FloorplanOpening & { sourceEvidence?: { className: string; points?: Point[]; confidence: "high" | "medium" | "low" }; hinge?: Point; openingEndsPx?: Point[] }>;
  windows: Array<FloorplanOpening & { sourceEvidence?: { className: string; points?: Point[]; confidence: "high" | "medium" | "low" }; openingEndsPx?: Point[]; type?: "window" | "sliding-door" | "opening-unknown" }>;
};
