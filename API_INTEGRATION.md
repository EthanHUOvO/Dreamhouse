# API integration

## Qwen text / multimodal / Function Calling

Files:

```text
lib/ai/qwen-client.ts
lib/ai/qwen-layout-agent.ts
lib/ai/qwen-provider.ts
app/api/ai/layout/route.ts
app/api/ai/status/route.ts
```

`qwen-client.ts` calls the OpenAI-compatible `chat/completions` endpoint and sets `enable_thinking:false` for predictable Function Calling / structured JSON behavior.

The layout agent sends the model the user profile, current Design Version, optional uploaded floorplan image, and the DreamHouse Function Calling tool schemas. Tool calls execute only on a temporary SceneGraph copy. The result must pass `validate_layout` before the UI enables “Apply to Design”.

## Required values from your Alibaba Cloud account

You only need to identify these values; keep the API key private:

```text
Region: Beijing / Singapore / other
Workspace mode: dedicated workspace endpoint or public DashScope endpoint
Workspace ID: if using a dedicated endpoint
Model ID: e.g. qwen3.7-plus
```

Place the actual key only in `.env.local` locally or Vercel Environment Variables.

## Qwen-Image / Wan

The layout-agent path is fully separated from image/video generation. `generateVisual()` and `generateVideo()` remain adapters so those services can be wired later without changing Pascal or the Geometry Engine.
