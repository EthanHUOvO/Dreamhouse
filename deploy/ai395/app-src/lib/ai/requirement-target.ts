import type { SceneGraph, RoomSemantic } from "../types";

export type RequirementTarget = {
  bedrooms: number;
  livingRooms: number;
  bathrooms: number;
  kitchens: number;
};

const numberOf = (text: string, fallback = 1) => {
  if (/[一1]/.test(text)) return 1;
  if (/[二2]/.test(text)) return 2;
  if (/[三3]/.test(text)) return 3;
  if (/[四4]/.test(text)) return 4;
  if (/[五5]/.test(text)) return 5;
  return fallback;
};

function currentCounts(scene: SceneGraph): RequirementTarget {
  const counts: RequirementTarget = {
    bedrooms: 0,
    livingRooms: 0,
    bathrooms: 0,
    kitchens: 0,
  };
  for (const node of Object.values(scene.nodes) as any[]) {
    if (node.type !== "zone") continue;
    const semantic = String(node.metadata?.semantic_type || "") as RoomSemantic;
    if (["bedroom", "master_bedroom", "child_room", "nanny_room"].includes(semantic)) counts.bedrooms += 1;
    if (semantic === "living_room") counts.livingRooms += 1;
    if (semantic === "bathroom") counts.bathrooms += 1;
    if (semantic === "kitchen") counts.kitchens += 1;
  }
  return counts;
}

export function parseRequirementTarget(prompt: string, scene: SceneGraph): RequirementTarget {
  const target = currentCounts(scene);
  const text = String(prompt || "").replace(/\s+/g, "");
  const bedroomMatch = text.match(/(?:目标|需要|增加|保留)?([一二三四五12345])(?:个)?(?:卧室|卧室数|房间)/);
  const bathroomMatch = text.match(/([一二三四五12345])(?:个)?(?:卫生间|卫浴)/);
  const kitchenMatch = text.match(/([一二三四五12345])(?:个)?(?:厨房)/);
  const livingMatch = text.match(/([一二三四五12345])(?:个)?(?:客厅|客餐厅)/);
  const increasingBedrooms = /增加(?:一个|一间|1个|1间)?卧室/.test(text);
  const increasingBathrooms = /增加(?:一个|一间|1个|1间)?卫生间|增加卫浴/.test(text);
  if (bedroomMatch && !increasingBedrooms) target.bedrooms = numberOf(bedroomMatch[1]);
  if (bathroomMatch) target.bathrooms = numberOf(bathroomMatch[1]);
  if (kitchenMatch) target.kitchens = numberOf(kitchenMatch[1]);
  if (livingMatch) target.livingRooms = numberOf(livingMatch[1]);
  if (increasingBedrooms) target.bedrooms += 1;
  if (increasingBathrooms) target.bathrooms += 1;
  return target;
}

export function verifyRequirementTarget(scene: SceneGraph, target: RequirementTarget) {
  const actual = currentCounts(scene);
  const checks = {
    bedrooms: actual.bedrooms >= target.bedrooms,
    livingRooms: actual.livingRooms >= target.livingRooms,
    bathrooms: actual.bathrooms >= target.bathrooms,
    kitchens: actual.kitchens >= target.kitchens,
  };
  return {
    target,
    actual,
    satisfied: Object.values(checks).every(Boolean),
    checks,
  };
}
