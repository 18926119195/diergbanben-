/**
 * Vercel Edge：`/api/zhipu/*` → 智谱 `/api/paas/v4/*`
 * 与本地 Vite proxy 同语义；服务端注入 ZHIPU_API_KEY。
 */
export const config = { runtime: 'edge' }

const ZHIPU_ROOT = 'https://open.bigmodel.cn/api/paas/v4'

export default async function handler(req: Request): Promise<Response> {
  const apiKey = process.env.ZHIPU_API_KEY?.trim() ?? ''
  if (!apiKey) {
    return Response.json(
      {
        error:
          'ZHIPU_API_KEY missing on server (set in Vercel Environment Variables)',
      },
      { status: 500 },
    )
  }

  const inbound = new URL(req.url)
  const sub = inbound.pathname.replace(/^\/api\/zhipu\/?/, '')
  const target = new URL(`${ZHIPU_ROOT}/${sub}`)
  target.search = inbound.search

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${apiKey}`)
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const init: RequestInit = {
    method: req.method,
    headers,
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  try {
    const upstream = await fetch(target, init)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `zhipu proxy failed: ${msg}` }, { status: 502 })
  }
}
