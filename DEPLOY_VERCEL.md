# Deploy v12 on Vercel

GitHub Pages is static hosting and cannot execute `app/api/**/route.ts`. v12 must run on Vercel, a Node server, or Docker for real Qwen calls.

## Recommended path

1. Keep GitHub as the source repository.
2. Import the repository into Vercel.
3. Do not set `output: 'export'` in `next.config.mjs`.
4. Add server-side environment variables in Vercel Project → Settings → Environment Variables.
5. Deploy.

Required for real Qwen layout design:

```env
AI_PROVIDER=qwen
QWEN_API_KEY=your-secret-key
QWEN_BASE_URL=https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen3.7-plus
BOM_AI_ENABLED=true
```

Do not prefix the key with `NEXT_PUBLIC_`.

## Verify after deploy

Open `/api/ai/status` on the Vercel deployment. Expected output contains:

```json
{
  "provider": "qwen",
  "configured": true,
  "model": "qwen3.7-plus"
}
```

This endpoint only reports server configuration; the first successful Layout Agent run proves the remote model call itself works.
