"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { nodeRegistry, sceneRegistry, useRegistry } from "@pascal-app/core";
import { createDefaultMaterial, createMaterial, resolveMaterialRef, SCENE_LAYER, useNodeEvents, useViewer } from "@pascal-app/viewer";
import { createPortal, useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, type Group, type Object3D } from "three";
import type { SceneGraph } from "@/lib/types";
import { blockLocalTransform, buildBlockMeshData, needsBlockCompatibility, type NativeBlock } from "@/lib/pascal/block-mesh";

function NativeBlockMesh({ node, sceneMaterials }: { node: NativeBlock; sceneMaterials: Record<string, any> }) {
  const group = useRef<Group>(null!);
  useRegistry(node.id, "block", group);
  const events = useNodeEvents(node as any, "block" as any);
  const shading = useViewer((state) => state.shading);
  const built = useMemo(() => {
    try {
      const data = buildBlockMeshData(node, (points) => ShapeUtils.triangulateShape(points.map(([x, y]) => new Vector2(x, y)), []));
      if (!data.positions.length) return null;
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
      for (const part of data.groups) geometry.addGroup(part.start, part.count, part.materialIndex);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return { geometry, slots: data.slots };
    } catch (error) {
      console.error("[Pascal block] native topology could not be rendered", { nodeId: node.id, error });
      return null;
    }
  }, [node]);
  useEffect(() => () => built?.geometry.dispose(), [built]);
  const materials = useMemo(() => built?.slots.map((slot) =>
    resolveMaterialRef(node.slots?.[slot], sceneMaterials, shading) || (node.material ? createMaterial(node.material, shading) : createDefaultMaterial("#e9e7e3", 0.85, shading))),
  [built, node, sceneMaterials, shading]);
  if (!built || !materials) return null;
  return <group ref={group} {...blockLocalTransform(node)} visible={node.visible !== false} userData={{ nodeId: node.id, nodeType: "block" }} {...events}>
    <mesh geometry={built.geometry} material={materials} dispose={null} castShadow receiveShadow userData={{ nodeId: node.id, nodeType: "block", surfaceRole: "item" }} onUpdate={(mesh) => mesh.layers.set(SCENE_LAYER)} />
  </group>;
}

/** Only fill a missing SDK kind; preserve topology, slots, hierarchy and ids. */
export default function PascalBlockMeshes({ scene }: { scene: SceneGraph }) {
  const blocks = useMemo(() => Object.values(scene.nodes).filter((node) => needsBlockCompatibility(nodeRegistry.has("block"), node as NativeBlock)) as NativeBlock[], [scene]);
  const [targets, setTargets] = useState(new Map<string, Object3D>());
  const targetsRef = useRef(targets);
  useFrame(() => {
    const next = new Map<string, Object3D>();
    if (!nodeRegistry.has("block")) for (const block of blocks) {
      const parent = block.parentId ? sceneRegistry.nodes.get(block.parentId) : undefined;
      if (parent) next.set(block.id, parent);
    }
    const current = targetsRef.current;
    if (current.size !== next.size || Array.from(next).some(([id, parent]) => current.get(id) !== parent)) {
      targetsRef.current = next;
      setTargets(next);
    }
  });
  if (nodeRegistry.has("block")) return null;
  const materials = (scene as any).materials || {};
  return <>{blocks.map((block) => {
    const parent = targets.get(block.id);
    return parent ? <Fragment key={block.id}>{createPortal(<NativeBlockMesh node={block} sceneMaterials={materials} />, parent)}</Fragment> : null;
  })}</>;
}
