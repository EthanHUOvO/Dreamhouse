# DreamHouse v11.1 Detailed BOM

## Runtime chain

Design Vn Approved -> Pascal SceneGraph -> deterministic BOM tools -> Qwen enrichment -> validation -> contractor MES.

### Deterministic tools
- `getSceneGeometry()`
- `calculateWallQuantity()`
- `calculateFloorArea()`
- `getMaterialCatalog()`
- `getManufacturingRules()`
- `createBomDraft()`
- `validateBom()`

AI is never allowed to change quantity, dimensions, area, `sourceNodeId`, or Design Version. It only enriches material / finish / process / installation / performance / notes.

## Qwen input
The provider receives user profile, source drawing metadata/preview (when available), approved Design Version, exact Pascal geometry summary, current material catalog, manufacturing rules and deterministic draft BOM.

For uploaded image drawings, `previewDataUrl` is included as a multimodal `image_url` input. For production PDFs or large files, upload/convert to an object-storage image URL first and pass that URL instead.

## Required environment
```env
AI_PROVIDER=qwen
QWEN_API_KEY=***
QWEN_BASE_URL=https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen3.7-plus
BOM_AI_ENABLED=true
```

Never commit the API key.
