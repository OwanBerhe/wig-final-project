import type { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyToken } from './middleware/auth'
import { cleanBody, createMessage, getMemberIds, isMember } from './services/chat'
import type { ChatMessage, ConversationSummary } from './services/chat'

// Server -> client events
export type ServerEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'conversation'; conversation_id: number }
  | { type: 'error'; error: string; client_id?: string }

// Client -> server events
type ClientEvent = {
  type: 'send'
  conversation_id: number
  body: string
  client_id?: string
}

// Every open socket, grouped by user (one user can have several tabs open)
const socketsByUser = new Map<number, Set<WebSocket>>()

export function sendToUsers(userIds: number[], event: ServerEvent) {
  const data = JSON.stringify(event)
  for (const id of userIds) {
    for (const socket of socketsByUser.get(id) ?? []) {
      if (socket.readyState === WebSocket.OPEN) socket.send(data)
    }
  }
}

// Saves a message to Postgres, then pushes it to every member of the
// conversation. Used by both the REST endpoint and the WebSocket handler.
export async function postMessage(
  conversationId: number,
  senderId: number,
  body: string
): Promise<ChatMessage> {
  const message = await createMessage(conversationId, senderId, body)
  sendToUsers(await getMemberIds(conversationId), { type: 'message', message })
  return message
}

export function announceConversation(conversation: ConversationSummary) {
  sendToUsers(
    conversation.members.map((m) => m.user_id),
    { type: 'conversation', conversation_id: conversation.conversation_id }
  )
}

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (socket, req) => {
    // Browsers can't set headers on a WebSocket, so the token comes in the URL
    const token = new URL(req.url ?? '', 'http://localhost').searchParams.get('token')
    const userId = token ? verifyToken(token) : null
    if (!userId) {
      socket.close(4401, 'Unauthorized')
      return
    }

    let sockets = socketsByUser.get(userId)
    if (!sockets) socketsByUser.set(userId, (sockets = new Set()))
    sockets.add(socket)
    alive.set(socket, true)

    socket.on('pong', () => alive.set(socket, true))

    socket.on('message', async (raw) => {
      let event: ClientEvent
      try {
        event = JSON.parse(raw.toString())
      } catch {
        return reply(socket, { type: 'error', error: 'Invalid JSON' })
      }
      if (event?.type !== 'send') return

      const clientId = typeof event.client_id === 'string' ? event.client_id : undefined
      const conversationId = Number(event.conversation_id)
      const cleaned = cleanBody(event.body)
      if ('error' in cleaned) {
        return reply(socket, { type: 'error', error: cleaned.error, client_id: clientId })
      }

      try {
        if (!Number.isInteger(conversationId) || !(await isMember(conversationId, userId))) {
          return reply(socket, {
            type: 'error',
            error: 'Conversation not found',
            client_id: clientId,
          })
        }
        await postMessage(conversationId, userId, cleaned.body)
      } catch (err) {
        console.error(err)
        reply(socket, { type: 'error', error: 'Failed to send message', client_id: clientId })
      }
    })

    socket.on('close', () => {
      sockets.delete(socket)
      if (sockets.size === 0) socketsByUser.delete(userId)
    })
  })

  // Drop connections that stopped answering pings (closed laptop, lost wifi)
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate()
        continue
      }
      alive.set(socket, false)
      socket.ping()
    }
  }, 30_000)
  wss.on('close', () => clearInterval(heartbeat))

  return wss
}

function reply(socket: WebSocket, event: ServerEvent) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event))
}
