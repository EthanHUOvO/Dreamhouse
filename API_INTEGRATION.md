# API Integration

## Qwen3.8-Flash

OpenAI 兼容：

```text
POST {QWEN_COMPAT_BASE_URL}/chat/completions
```

用于：

- Pascal Layout Agent / Function Calling
- BOM 材料与工艺补充

## Qwen-Image-3.0-Pro

百炼原生同步接口：

```text
POST {QWEN_NATIVE_BASE_URL}/services/aigc/multimodal-generation/generation
```

用于：

- 2D 户型图编辑
- 整体空间渲染
- 分房间渲染

输入图片可为公网 URL 或 Base64 data URL。`lib/ai/server-image.ts` 会将 `/public/...` 路径转换为 data URL。

## 调试

先设置：

```env
AI_MODE=qwen
```

然后访问：

```text
GET /api/ai/status
```

确认：

```json
{
  "mode": "qwen",
  "qwenConfigured": true,
  "models": {
    "layout": "qwen3.8-flash",
    "image": "qwen-image-3.0-pro",
    "bom": "qwen3.8-flash"
  }
}
```

如果 strict Qwen 模式失败，接口会返回具体 stage/model/status，不会静默切到 mock。
