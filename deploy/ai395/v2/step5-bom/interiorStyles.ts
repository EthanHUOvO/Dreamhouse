export const BASE_EDIT_PROMPT = `Edit the provided interior image directly. This is an image-to-image interior renovation task, not a text-to-image generation task.

Use the provided image as the exact base scene and renovate THIS EXACT VIEW. Preserve the original camera position, camera angle, field of view, perspective, visible area, room geometry, wall positions, door positions, window positions, ceiling height, room boundaries and spatial proportions.

Do not generate a different room. Do not change the viewpoint, move or rotate the camera, change walls, relocate doors or windows, add or remove rooms, or alter the architectural structure. The before and after images must clearly correspond to the same room from the same camera view. These are the only elements that must remain fixed.

Keep physically plausible scale and preserve all architectural lines and openings. Produce a professionally renovated version of the exact source image.`;

export const LAYOUT_OPTIMIZATION_PROMPT = `Improve the visible furniture, surface materials, colors, lighting and movable decoration within the existing room. Furniture may be rearranged only inside the same room while keeping doorways and circulation clear. Preserve all walls, partitions, doors, windows, openings, floor and ceiling geometry, and fixed plumbing fixtures in their original positions. Do not create, remove, resize or relocate any partition or architectural element. Keep the room function and camera view unchanged.`;

export const FINAL_RESULT_CONSTRAINT = `Final result: the same space, same camera view, same perspective and exactly the same architectural structure. Apply the selected style to materials, furniture, lighting and decoration only. Preserve every wall, partition, door, window and opening, and never change the room function.`;

export const BASE_INTERIOR_EDIT_PROMPT = BASE_EDIT_PROMPT;

/** @deprecated Use BASE_INTERIOR_EDIT_PROMPT for STEP 4 image editing. */
export const BASE_INTERIOR_PROMPT = BASE_INTERIOR_EDIT_PROMPT;

export const INTERIOR_STYLE_PRESETS = {
  modern: { id: "modern", name: "现代简约", prompt: "Modern minimalist interior design. Use neutral white, warm gray and beige colors. Clean architectural lines, simple contemporary furniture, integrated storage, soft indirect lighting, balanced wood, stone and matte finishes. Elegant, clean and practical." },
  nordic: { id: "nordic", name: "北欧风", prompt: "Nordic Scandinavian interior design. Use light oak wood, warm white walls, soft beige and light gray tones. Simple functional furniture, natural materials, soft fabric sofas, subtle greenery, bright natural daylight and a calm comfortable atmosphere." },
  minimalist: { id: "minimalist", name: "极简风", prompt: "Ultra minimalist interior design. Use restrained neutral tones and very limited decoration. Large clean surfaces, hidden storage, minimal furniture, flush cabinetry, shadow-gap details and integrated linear lighting. High-end architectural minimalism." },
  cream: { id: "cream", name: "奶油风", prompt: "Soft cream style interior. Use cream white, warm beige and light caramel tones. Soft curved furniture, rounded corners, warm wood textures, soft fabrics and diffuse warm lighting. Comfortable, gentle, bright and cozy." },
  natural_wood: { id: "natural_wood", name: "原木风", prompt: "Natural wood interior design. Use generous light natural wood textures, warm white walls, natural stone and linen materials, simple handcrafted furniture and soft warm lighting. Quiet, comfortable and organic." },
  modern_luxury: { id: "modern_luxury", name: "现代轻奢", prompt: "Modern luxury residential interior. Use premium stone, wood veneer, brushed metal and refined fabrics. Warm neutral palette, elegant contemporary furniture, layered ambient lighting and subtle sophisticated luxury." },
  wabi_sabi: { id: "wabi_sabi", name: "侘寂风", prompt: "Wabi-sabi inspired interior. Use warm earthy neutral colors, textured plaster walls, natural wood, stone, linen and handcrafted furniture. Organic irregular textures, soft low-contrast lighting, quiet imperfect natural aesthetic." },
  new_chinese: { id: "new_chinese", name: "新中式", prompt: "Contemporary Chinese interior design. Combine modern minimal architecture with subtle traditional Chinese elements. Use warm dark wood, natural stone, linen and restrained decorative details. Elegant proportions, modern furniture influenced by Chinese forms and soft warm lighting." },
} as const;

export type InteriorStyleId = keyof typeof INTERIOR_STYLE_PRESETS;

export function buildInteriorPrompt(styleId: string) {
  const style = INTERIOR_STYLE_PRESETS[styleId as InteriorStyleId] || INTERIOR_STYLE_PRESETS.modern;
  return `${BASE_EDIT_PROMPT}\n\n${LAYOUT_OPTIMIZATION_PROMPT}\n\nDESIGN STYLE (style language only):\n${style.prompt}\n\n${FINAL_RESULT_CONSTRAINT}`;
}
