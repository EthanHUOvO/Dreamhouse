# lib/ai/image-service.ts:85

- 步骤：step2
- 文件：`lib/ai/image-service.ts`
- 行号：85
- 变量/位置：`roomType`
- 类型：template 字符串
- 字数：686

> 户型图编辑总提示词（含 {modificationRequest} 注入点）

## 实际提示词（逐字）

```text
Edit reference image <image1> into a photorealistic material renovation of this existing ${roomType.replace(/_/g,' ')}.
Style: ${input.stylePrompt||'Light natural wood, warm white surfaces and soft lighting.'}
Keep exactly the same camera, perspective, room boundaries, ceiling height and visible scene. Preserve every visible object, its position, size and type. Keep all original architectural edges and openings in place: doors remain doors and windows remain windows. Keep the existing furniture in its original positions. Apply the style only to surface finishes, colors, fabrics and lighting. Add no new objects or openings. Output exactly this same view with realistic materials.
```
