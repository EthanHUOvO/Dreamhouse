import type {
  FurnitureOverrides,
  SceneGraph,
  SelectedVariant,
} from "../types";
import {
  applyFurnitureOverrides,
  captureFurnitureOverrides,
} from "../furniture-overrides";

const STORAGE_KEY = "dreamhouse-furniture-presets-v1";

export type FurniturePreset = {
  variantId: string;
  imageHash: string;
  updatedAt: string;
  items: FurnitureOverrides;
};

type FurniturePresetLibrary = Record<string, FurniturePreset>;

export function furniturePresetKey(variant: SelectedVariant) {
  if (!variant.imageHash) return null;
  return `${variant.variantId}:${variant.imageHash}`;
}

function readLibrary(): FurniturePresetLibrary {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FurniturePresetLibrary) : {};
  } catch (error) {
    console.error("[Furniture presets] failed to read preset library", error);
    return {};
  }
}

export function loadFurniturePreset(variant: SelectedVariant) {
  const key = furniturePresetKey(variant);
  return key ? readLibrary()[key] ?? null : null;
}

export function applyFurniturePreset(
  scene: SceneGraph,
  variant: SelectedVariant,
) {
  const preset = loadFurniturePreset(variant);
  return preset ? applyFurnitureOverrides(scene, preset.items) : scene;
}

export function saveFurniturePreset(
  scene: SceneGraph,
  variant: SelectedVariant,
) {
  const key = furniturePresetKey(variant);
  if (!key) throw new Error("户型图片仍在载入，暂时无法保存默认家具布局");
  const library = readLibrary();
  const preset: FurniturePreset = {
    variantId: variant.variantId,
    imageHash: variant.imageHash!,
    updatedAt: new Date().toISOString(),
    items: captureFurnitureOverrides(scene),
  };
  library[key] = preset;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  return preset;
}
