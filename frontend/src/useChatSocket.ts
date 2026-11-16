import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type ChatMessage = {
  message_id: number
  conversation_id: number
  sender_id: number
  sender_username: string
  body: string
  sent_at: string
}

export type ServerEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'conversation'; conversation_id: number }
  | { type: 'error'; error: string; client_id?: string }

export type SocketStatus = 'connecting' | 'open' | 'closed'

// Keeps one WebSocket open to /ws for the signed-in user and reconnects with
// backoff if it drops. onOpen fires on every (re)connect so the caller can
// refetch anything it missed while offline.
export function useChatSocket(
  token: string | null,
  onEvent: (event: ServerEvent) => void,
  onOpen?: () => void
) {
  const [status, setStatus] = useState<SocketStatus>('closed')
  const socketRef = useRef<WebSocket | null>(null)
  const handlers = useRef({ onEvent, onOpen })
  useLayoutEffect(() => {
    handlers.current = { onEvent, onOpen }
  })

  useEffect(() => {
    if (!token) return

    let stopped = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    function connect() {
      setStatus('connecting')
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(
        `${protocol}://${location.host}/ws?token=${encodeURIComponent(token!)}`
      )
      socketRef.current = socket

      socket.onopen = () => {
        attempt = 0
        setStatus('open')
        handlers.current.onOpen?.()
      }
      socket.onmessage = (e) => {
        try {
          handlers.current.onEvent(JSON.parse(e.data))
        } catch {
          // ignore malformed frames
        }
      }
      socket.onclose = (e) => {
        if (socketRef.current === socket) socketRef.current = null
        setStatus('closed')
        // 4401 = bad token; retrying won't help
        if (stopped || e.code === 4401) return
        const delay = Math.min(1000 * 2 ** attempt++, 15000)
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(retryTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [token])

  // Returns false if the socket isn't open, so the caller can fall back to REST
  const send = useCallback((conversationId: number, body: string) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'send', conversation_id: conversationId, body }))
    return true
  }, [])

  return { status, send }
}
