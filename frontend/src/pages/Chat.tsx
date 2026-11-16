import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useChatSocket } from '../useChatSocket'
import type { ChatMessage, ServerEvent } from '../useChatSocket'

type Member = { user_id: number; username: string }

type Conversation = {
  conversation_id: number
  is_group: boolean
  name: string | null
  members: Member[]
  last_message: ChatMessage | null
}

type UserOption = { user_id: number; username: string; role: string }

const PAGE_SIZE = 50
const NO_MESSAGES: ChatMessage[] = []

function conversationTitle(c: Conversation, myId: number | undefined) {
  if (c.name) return c.name
  const others = c.members.filter((m) => m.user_id !== myId).map((m) => m.username)
  return others.join(', ') || 'Just you'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { token, user } = useAuth()
  const myId = user?.id
  const navigate = useNavigate()
  const params = useParams()
  const activeId = params.id ? Number(params.id) : null

  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  // Messages are stored with the conversation they belong to, so switching
  // conversations shows an empty (loading) view until the new ones arrive
  const [thread, setThread] = useState<{
    id: number | null
    rows: ChatMessage[]
    hasOlder: boolean
  }>({ id: null, rows: [], hasOlder: false })
  const loadingMessages = activeId !== null && thread.id !== activeId
  const messages = thread.id === activeId ? thread.rows : NO_MESSAGES
  const hasOlder = thread.id === activeId && thread.hasOlder
  const [unread, setUnread] = useState<Set<number>>(new Set())
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  // Latest values for use inside socket callbacks
  const activeIdRef = useRef(activeId)
  const conversationsRef = useRef(conversations)
  useLayoutEffect(() => {
    activeIdRef.current = activeId
    conversationsRef.current = conversations
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const loadConversations = useCallback(() => {
    api<Conversation[]>('/conversations')
      .then(setConversations)
      .catch((e: Error) => setError(e.message))
  }, [])

  const loadMessages = useCallback((id: number) => {
    api<ChatMessage[]>(`/conversations/${id}/messages?limit=${PAGE_SIZE}`)
      .then((rows) => {
        if (activeIdRef.current !== id) return
        stickToBottom.current = true
        setThread({ id, rows, hasOlder: rows.length === PAGE_SIZE })
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  // Live updates
  const onEvent = useCallback(
    (event: ServerEvent) => {
      if (event.type === 'error') {
        setError(event.error)
        return
      }
      if (event.type === 'conversation') {
        loadConversations()
        return
      }

      const msg = event.message
      if (msg.conversation_id === activeIdRef.current) {
        setThread((t) =>
          t.id !== msg.conversation_id || t.rows.some((m) => m.message_id === msg.message_id)
            ? t
            : { ...t, rows: [...t.rows, msg] }
        )
      } else if (msg.sender_id !== myId) {
        setUnread((prev) => new Set(prev).add(msg.conversation_id))
      }

      // A message for a conversation we haven't loaded yet: refetch the list
      if (!conversationsRef.current?.some((c) => c.conversation_id === msg.conversation_id)) {
        loadConversations()
        return
      }
      // Otherwise update its preview and move it to the top
      setConversations((prev) => {
        const existing = prev?.find((c) => c.conversation_id === msg.conversation_id)
        if (!prev || !existing) return prev
        return [{ ...existing, last_message: msg }, ...prev.filter((c) => c !== existing)]
      })
    },
    [loadConversations, myId]
  )

  // On every (re)connect, catch up on anything sent while we were offline
  const onOpen = useCallback(() => {
    loadConversations()
    if (activeIdRef.current) loadMessages(activeIdRef.current)
  }, [loadConversations, loadMessages])

  const { status, send } = useChatSocket(token, onEvent, onOpen)

  useEffect(() => {
    if (token) loadConversations()
  }, [token, loadConversations])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
  }, [activeId, loadMessages])

  function openConversation(id: number) {
    setError(null)
    setUnread((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Keep the view pinned to the newest message unless the user scrolled up
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  function onScroll() {
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  async function loadOlder() {
    if (!activeId || messages.length === 0) return
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const older = await api<ChatMessage[]>(
        `/conversations/${activeId}/messages?limit=${PAGE_SIZE}&before=${messages[0].message_id}`
      )
      stickToBottom.current = false
      setThread((t) =>
        t.id === activeId
          ? { id: t.id, rows: [...older, ...t.rows], hasOlder: older.length === PAGE_SIZE }
          : t
      )
      // Keep the message the user was looking at in place
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function onSend(e?: FormEvent) {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || !activeId) return
    setDraft('')
    setError(null)
    stickToBottom.current = true
    // The server echoes the saved message back over the socket, which is
    // what adds it to the list. If the socket is down, fall back to REST.
    if (send(activeId, body)) return
    try {
      const msg = await api<ChatMessage>(`/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      onEvent({ type: 'message', message: msg })
    } catch (err) {
      setDraft(body)
      setError((err as Error).message)
    }
  }

  function onDraftKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  if (!token) {
    return (
      <div>
        <h1>Messages</h1>
        <p>
          <Link to="/login">Log in</Link> to chat.
        </p>
      </div>
    )
  }

  const active = conversations?.find((c) => c.conversation_id === activeId) ?? null

  return (
    <div className="chat">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <h2>Messages</h2>
          <button onClick={() => setShowNew((v) => !v)}>{showNew ? 'Cancel' : 'New'}</button>
        </div>

        {showNew && (
          <NewConversation
            myId={myId}
            onCreated={(c) => {
              setShowNew(false)
              setConversations((prev) => [
                c,
                ...(prev ?? []).filter((x) => x.conversation_id !== c.conversation_id),
              ])
              navigate(`/chat/${c.conversation_id}`)
            }}
          />
        )}

        {conversations === null && <p className="chat-muted">Loading...</p>}
        {conversations?.length === 0 && !showNew && (
          <p className="chat-muted">No conversations yet. Start one with New.</p>
        )}

        <ul className="chat-list">
          {conversations?.map((c) => (
            <li key={c.conversation_id}>
              <Link
                to={`/chat/${c.conversation_id}`}
                onClick={() => openConversation(c.conversation_id)}
                className={
                  'chat-list-item' +
                  (c.conversation_id === activeId ? ' active' : '') +
                  (unread.has(c.conversation_id) ? ' unread' : '')
                }
              >
                <span className="chat-list-title">
                  {conversationTitle(c, myId)}
                  {c.last_message && (
                    <time>{formatTime(c.last_message.sent_at)}</time>
                  )}
                </span>
                <span className="chat-list-preview">
                  {c.last_message
                    ? `${c.last_message.sender_id === myId ? 'You' : c.last_message.sender_username}: ${c.last_message.body}`
                    : 'No messages yet'}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className={`chat-status ${status}`}>
          {status === 'open' ? 'Live' : status === 'connecting' ? 'Connecting...' : 'Offline'}
        </p>
      </aside>

      <section className="chat-main">
        {!activeId ? (
          <p className="chat-empty">Select a conversation or start a new one.</p>
        ) : (
          <>
            <header className="chat-main-head">
              <h2>{active ? conversationTitle(active, myId) : '...'}</h2>
              {active?.is_group && (
                <span className="chat-muted">
                  {active.members.map((m) => m.username).join(', ')}
                </span>
              )}
            </header>

            <div className="chat-messages" ref={scrollRef} onScroll={onScroll}>
              {hasOlder && (
                <button className="chat-older" onClick={loadOlder}>
                  Load older messages
                </button>
              )}
              {loadingMessages && messages.length === 0 && (
                <p className="chat-muted">Loading...</p>
              )}
              {!loadingMessages && messages.length === 0 && (
                <p className="chat-muted">No messages yet. Say hi!</p>
              )}
              {messages.map((m, i) => {
                const mine = m.sender_id === myId
                const showName =
                  !mine && active?.is_group && messages[i - 1]?.sender_id !== m.sender_id
                return (
                  <div key={m.message_id} className={'chat-bubble' + (mine ? ' mine' : '')}>
                    {showName && <span className="chat-sender">{m.sender_username}</span>}
                    <p>{m.body}</p>
                    <time>{formatTime(m.sent_at)}</time>
                  </div>
                )
              })}
            </div>

            {error && <p className="error chat-error">{error}</p>}

            <form className="chat-compose" onSubmit={onSend}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onDraftKey}
                placeholder="Write a message"
                rows={1}
                maxLength={2000}
              />
              <button type="submit" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function NewConversation({
  myId,
  onCreated,
}: {
  myId: number | undefined
  onCreated: (c: Conversation) => void
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<UserOption[]>('/users')
      .then((rows) => setUsers(rows.filter((u) => u.user_id !== myId)))
      .catch((e: Error) => setError(e.message))
  }, [myId])

  const shown = users.filter((u) =>
    u.username.toLowerCase().includes(filter.trim().toLowerCase())
  )

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const c = await api<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ user_ids: selected, name: name || undefined }),
      })
      onCreated(c)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="chat-new" onSubmit={create}>
      <input
        placeholder="Search people"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <ul className="chat-new-users">
        {shown.map((u) => (
          <li key={u.user_id}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(u.user_id)}
                onChange={() => toggle(u.user_id)}
              />
              {u.username}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="chat-muted">No matching users</li>}
      </ul>
      {selected.length > 1 && (
        <input
          placeholder="Group name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
      )}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || selected.length === 0}>
        {selected.length > 1 ? 'Start group chat' : 'Start chat'}
      </button>
    </form>
  )
}
