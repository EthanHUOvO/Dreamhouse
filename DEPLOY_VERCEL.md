# Deploy to Vercel

本版本包含 Next.js API Routes，不能使用 GitHub Pages 作为正式 API 运行环境。

1. 把项目推到 GitHub。
2. Vercel → Add New Project → Import Git Repository。
3. Framework 选择 Next.js。
4. Settings → Environment Variables 添加：

```text
AI_MODE=hybrid
QWEN_API_KEY=...
QWEN_COMPAT_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
QWEN_NATIVE_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1
QWEN_LAYOUT_MODEL=qwen3.8-flash
QWEN_IMAGE_MODEL=qwen-image-3.0-pro
QWEN_BOM_MODEL=qwen3.8-flash
BOM_AI_ENABLED=true
```

5. Redeploy。
6. 打开 `/api/ai/status`，确认 `qwenConfigured=true`。
7. 先把 `AI_MODE` 改为 `qwen` 做接口联调，确认布局、图片、BOM 均能真实调用。
8. 展厅演示前改回 `hybrid`，让 API 失败时自动回退。

## 图片持久化

Qwen Image 返回 URL 为临时资源，正式订单系统应在后端拿到 URL 后立即下载并上传 OSS。项目在 `lib/ai/image-service.ts` 预留 `persistGeneratedImage()` hook。
