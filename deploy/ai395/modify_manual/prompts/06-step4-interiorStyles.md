# config/interiorStyles.ts:1

- 步骤：step4
- 文件：`config/interiorStyles.ts`
- 行号：1
- 变量/位置：`BASE_EDIT_PROMPT`
- 类型：template 字符串
- 字数：919

> 室内效果图编辑基础指令 + 布局优化指令

## 实际提示词（逐字）

```text
Edit the provided interior image directly. This is an image-to-image interior renovation task, not a text-to-image generation task.

Use the provided image as the exact base scene and renovate THIS EXACT VIEW. Preserve the original camera position, camera angle, field of view, perspective, visible area, room geometry, wall positions, door positions, window positions, ceiling height, room boundaries and spatial proportions.

Do not generate a different room. Do not change the viewpoint, move or rotate the camera, change walls, relocate doors or windows, add or remove rooms, or alter the architectural structure. The before and after images must clearly correspond to the same room from the same camera view. These are the only elements that must remain fixed.

Keep physically plausible scale and preserve all architectural lines and openings. Produce a professionally renovated version of the exact source image.
```
