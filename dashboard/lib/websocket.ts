const RECONNECT_DELAY_MS = 3000

export function connectWS(
  token: string,
  onEvent: (event: string, data: unknown) => void
): () => void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  const wsUrl = apiUrl.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  function connect() {
    if (destroyed) return
    ws = new WebSocket(`${wsUrl}/ws?token=${token}`)

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data as string) as { event: string; data: unknown }
        onEvent(parsed.event, parsed.data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      ws?.close()
    }

    ws.onclose = () => {
      if (!destroyed) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }
  }

  connect()

  return () => {
    destroyed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
