const baseUrl = process.env.QWEN_COMPAT_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export function hasQwenConfig() {
  return Boolean(process.env.QWEN_API_KEY)
}

export async function callQwenText<T = unknown>(prompt: string, systemPrompt: string, model = process.env.QWEN_TEXT_MODEL || 'qwen-plus') {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) throw new Error('QWEN_API_KEY is not configured')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Qwen text request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty Qwen text response')
  return JSON.parse(content) as T
}

export async function callQwenImage(prompt: string, model = process.env.QWEN_IMAGE_MODEL || 'qwen-image') {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) throw new Error('QWEN_API_KEY is not configured')

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      watermark: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Qwen image request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const url = data?.data?.[0]?.url
  if (!url) throw new Error('Empty Qwen image response')
  return { url }
}
