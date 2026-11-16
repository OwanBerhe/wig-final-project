import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db'
import { requireAuth } from '../middleware/auth'
import {
  cleanBody,
  createConversation,
  getConversation,
  isMember,
  listConversations,
  listMessages,
} from '../services/chat'
import { announceConversation, postMessage } from '../realtime'

const router = Router()
router.use(requireAuth)

// GET /api/conversations: the signed-in user's conversations, newest activity first
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listConversations(req.userId!))
  } catch (err) {
    next(err)
  }
})

// POST /api/conversations { user_ids: number[], name?: string }
// One other user = direct message (reuses an existing one); more = group chat.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_ids, name } = req.body ?? {}
    const me = req.userId!
    const others = Array.isArray(user_ids)
      ? [...new Set(user_ids.map(Number))].filter((id) => Number.isInteger(id) && id !== me)
      : []
    if (others.length === 0) {
      return res.status(400).json({ error: 'user_ids must include at least one other user' })
    }

    const found = await db
      .selectFrom('users')
      .select('user_id')
      .where('user_id', 'in', others)
      .execute()
    if (found.length !== others.length) {
      return res.status(400).json({ error: 'One or more users do not exist' })
    }

    const groupName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : null
    const { conversationId, created } = await createConversation(me, others, groupName)
    const conversation = await getConversation(conversationId, me)
    if (created && conversation) announceConversation(conversation)

    res.status(created ? 201 : 200).json(conversation)
  } catch (err) {
    next(err)
  }
})

// GET /api/conversations/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await getConversation(Number(req.params.id), req.userId!)
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conversation)
  } catch (err) {
    next(err)
  }
})

// GET /api/conversations/:id/messages?before=<message_id>&limit=50
router.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || !(await isMember(id, req.userId!))) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const before = req.query.before ? Number(req.query.before) : undefined
    if (before !== undefined && !Number.isInteger(before)) {
      return res.status(400).json({ error: 'before must be a message id' })
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)

    res.json(await listMessages(id, before, limit))
  } catch (err) {
    next(err)
  }
})

// POST /api/conversations/:id/messages { body }
// Same effect as sending over the WebSocket: saved, then broadcast to members.
router.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || !(await isMember(id, req.userId!))) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const cleaned = cleanBody(req.body?.body)
    if ('error' in cleaned) return res.status(400).json({ error: cleaned.error })

    res.status(201).json(await postMessage(id, req.userId!, cleaned.body))
  } catch (err) {
    next(err)
  }
})

export default router
