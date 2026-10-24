export type AiMode='mock'|'local'|'qwen'|'hybrid'

function num(name:string,fallback:number){const v=Number(process.env[name]);return Number.isFinite(v)&&v>0?v:fallback}

export function getAiMode():AiMode{
  if(process.env.NODE_ENV==='production')return'local'
  const raw=String(process.env.AI_MODE||process.env.AI_PROVIDER||'mock').toLowerCase()
  return raw==='mock'||raw==='local'||raw==='qwen'||raw==='hybrid'?raw:'local'
}

export function getAiConfig(){
  return{
    mode:getAiMode(),
    apiKey:process.env.QWEN_API_KEY||process.env.DASHSCOPE_API_KEY||'',
    compatBaseUrl:(process.env.LOCAL_TEXT_BASE_URL||process.env.QWEN_COMPAT_BASE_URL||process.env.QWEN_BASE_URL||'http://qwen-text:8080/v1').replace(/\/$/,''),
    nativeBaseUrl:(process.env.LOCAL_IMAGE_BASE_URL||process.env.QWEN_NATIVE_BASE_URL||'http://qwen-image:8200').replace(/\/$/,''),
    mcpUrl:(process.env.PASCAL_MCP_URL||'http://pascal-mcp:3100/mcp').replace(/\/$/,''),
    layoutModel:process.env.LOCAL_TEXT_MODEL||process.env.QWEN_LAYOUT_MODEL||process.env.QWEN_TEXT_MODEL||'Qwen3.8-27B-UD-Q4_K_XL',
    bomModel:process.env.LOCAL_TEXT_MODEL||process.env.QWEN_BOM_MODEL||process.env.QWEN_TEXT_MODEL||'Qwen3.8-27B-UD-Q4_K_XL',
    imageModel:process.env.LOCAL_IMAGE_MODEL||process.env.QWEN_IMAGE_MODEL||'Z-Image-Turbo',
    // Instruction edits need an actual editing backend, not a model label
    // sent to the default Turbo worker (which ignores that label).
    editImageBaseUrl:(process.env.LOCAL_EDIT_IMAGE_BASE_URL||process.env.LOCAL_IMAGE_BASE_URL||process.env.QWEN_NATIVE_BASE_URL||'http://qwen-image:8200').replace(/\/$/,''),
    editImageModel:process.env.LOCAL_EDIT_IMAGE_MODEL||process.env.LOCAL_IMAGE_MODEL||process.env.QWEN_IMAGE_MODEL||'Z-Image-Turbo',
    textTimeoutMs:num('QWEN_TEXT_TIMEOUT_MS',60000),
    imageTimeoutMs:num('QWEN_IMAGE_TIMEOUT_MS',1800000),
  }
}

export function qwenConfigured(){const c=getAiConfig();return c.mode==='local'?Boolean(c.compatBaseUrl):Boolean(c.apiKey)}
export function shouldTryQwen(){const c=getAiConfig();return c.mode!=='mock'&&(c.mode==='local'||Boolean(c.apiKey))}
export function fallbackAllowed(){return getAiMode()==='hybrid'}
