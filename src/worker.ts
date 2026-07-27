export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/roulette' || url.pathname === '/ladder') {
      url.pathname += '/'
      return env.ASSETS.fetch(new Request(url, request))
    }

    return new Response(null, { status: 404 })
  },
}
