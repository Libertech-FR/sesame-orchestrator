import {
  H3Event,
  defineEventHandler,
  getQuery,
  getHeaders,
  setResponseStatus,
  setHeaders,
  sendStream,
  createError,
} from 'h3'
import { Agent, request } from 'undici'

const SESAME_APP_API_URL = process.env.SESAME_APP_API_URL || 'http://localhost:4002'

// Create an agent with disabled timeouts for SSE connections
const sseAgent = new Agent({
  bodyTimeout: 0, // Disable body timeout
  headersTimeout: 0, // Disable headers timeout
  keepAliveTimeout: 0, // Keep connection alive indefinitely
  keepAliveMaxTimeout: 0,
})

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const url = new URL(`${SESAME_APP_API_URL}/core/backends/sse`)

  // Forward query parameters
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, String(value))
    }
  })

  try {
    // Make request to backend with custom agent
    const { statusCode, headers, body } = await request(url.toString(), {
      method: 'GET',
      headers: {
        ...getHeaders(event),
        host: new URL(SESAME_APP_API_URL).host,
      },
      dispatcher: sseAgent,
    })

    // Set SSE headers
    setResponseStatus(event, statusCode)
    setHeaders(event, {
      'Content-Type': headers['content-type'] || 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Stream the response body
    return sendStream(event, body)
  } catch (error) {
    console.error('[SSE Proxy] Error:', error)
    throw createError({
      statusCode: 502,
      message: 'Failed to connect to SSE endpoint',
    })
  }
})
