import { useEffect, useRef, useState } from 'react'
import { wsEvents } from '@/lib/wsEvents'

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const ws = useRef<WebSocket | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${proto}//${location.host}/ws`)
    ws.current = socket

    socket.onopen = () => {
      setStatus('connected')
      // Signal all useRealtimeQuery hooks to re-validate their data.
      // Covers the reconnect case: data may have changed while WS was down.
      wsEvents.emit('ws:connected', null)
    }
    socket.onclose = () => {
      setStatus('disconnected')
      retryTimer.current = setTimeout(connect, 5_000)
    }
    socket.onerror = () => setStatus('disconnected')
    socket.onmessage = (evt) => {
      if (evt.data === 'pong') return
      try {
        const msg = JSON.parse(String(evt.data))
        if (msg?.type) wsEvents.emit(msg.type, msg.data)
      } catch {}
    }
  }

  useEffect(() => {
    connect()

    pingTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send('ping')
    }, 25_000)

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
      if (pingTimer.current) clearInterval(pingTimer.current)
      ws.current?.close()
    }
  }, [])

  return { status }
}
