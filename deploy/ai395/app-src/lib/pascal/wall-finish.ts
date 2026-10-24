import type { SceneGraph } from "../types";

const FINISH_ID = "mat_residential_warm_white";
const FACE_SLOTS = [
  "interior", "exterior",
  "lowerInterior", "middleInterior", "upperInterior", "topInterior",
  "lowerExterior", "middleExterior", "upperExterior", "topExterior",
] as const;

/** Residential matte paint, without the SDK's unfinished drywall screw texture.
 * Also applied at viewer load so saved scenes keep their geometry and furniture.
 */
export function withResidentialWallFinish<T extends SceneGraph>(scene: T): T {
  const nodes = Object.fromEntries(Object.entries(scene.nodes).map(([id, node]) => [
    id,
    node.type === "wall" ? {
      ...node,
      slots: {
        ...node.slots,
        ...Object.fromEntries(FACE_SLOTS.map(slot => [slot, `scene:${FINISH_ID}`])),
      },
    } : node,
  ]));
  return {
    ...scene,
    nodes,
    materials: {
      ...(scene as SceneGraph & { materials?: Record<string, unknown> }).materials,
      [FINISH_ID]: {
        id: FINISH_ID,
        name: "暖白哑光漆面",
        material: {
          preset: "custom",
          properties: {
            color: "#e9e5dd", roughness: 0.92, metalness: 0,
            opacity: 1, transparent: false, side: "front",
          },
        },
      },
    },
  };
}
