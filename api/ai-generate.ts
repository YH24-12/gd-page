export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  try {
    const { prompt, apiKey, model } = await req.json()
    if (!apiKey) return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'doubao-3.5-pro',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    })
    return new Response(await response.text())
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
