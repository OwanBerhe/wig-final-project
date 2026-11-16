import { sql } from 'kysely'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
import { db } from '../db'

export const MAX_MESSAGE_LENGTH = 2000

export type ChatMessage = {
  message_id: number
  conversation_id: number
  sender_id: number
  sender_username: string
  body: string
  sent_at: Date
}

export type ConversationSummary = {
  conversation_id: number
  is_group: boolean
  name: string | null
  members: { user_id: number; username: string }[]
  last_message: ChatMessage | null
}

export async function isMember(conversationId: number, userId: number) {
  const row = await db
    .selectFrom('conversation_member')
    .select('user_id')
    .where('conversation_id', '=', conversationId)
    .where('user_id', '=', userId)
    .executeTakeFirst()
  return !!row
}

export async function getMemberIds(conversationId: number) {
  const rows = await db
    .selectFrom('conversation_member')
    .select('user_id')
    .where('conversation_id', '=', conversationId)
    .execute()
  return rows.map((r) => r.user_id)
}

// Conversations with their members and latest message, most recent first.
// Pass conversationId to fetch just one.
async function summaries(
  userId: number,
  conversationId?: number
): Promise<ConversationSummary[]> {
  let query = db
    .selectFrom('conversation as c')
    .innerJoin('conversation_member as me', 'me.conversation_id', 'c.conversation_id')
    .where('me.user_id', '=', userId)
    .select((eb) => [
      'c.conversation_id',
      'c.is_group',
      'c.name',
      jsonArrayFrom(
        eb
          .selectFrom('conversation_member as cm')
          .innerJoin('users as u', 'u.user_id', 'cm.user_id')
          .select(['u.user_id', 'u.username'])
          .whereRef('cm.conversation_id', '=', 'c.conversation_id')
          .orderBy('u.username')
      ).as('members'),
      jsonObjectFrom(
        eb
          .selectFrom('private_message as pm')
          .innerJoin('users as u', 'u.user_id', 'pm.sender_id')
          .select([
            'pm.message_id',
            'pm.conversation_id',
            'pm.sender_id',
            'u.username as sender_username',
            'pm.body',
            'pm.sent_at',
          ])
          .whereRef('pm.conversation_id', '=', 'c.conversation_id')
          .orderBy('pm.message_id', 'desc')
          .limit(1)
      ).as('last_message'),
    ])
    .orderBy(
      sql`(select max(sent_at) from private_message where conversation_id = c.conversation_id)`,
      sql`desc nulls last`
    )
    .orderBy('c.conversation_id', 'desc')

  if (conversationId !== undefined) {
    query = query.where('c.conversation_id', '=', conversationId)
  }

  return (await query.execute()) as ConversationSummary[]
}

export function listConversations(userId: number) {
  return summaries(userId)
}

export async function getConversation(conversationId: number, userId: number) {
  const [row] = await summaries(userId, conversationId)
  return row ?? null
}

// Creates a conversation between creatorId and otherIds. A one-on-one chat
// that already exists is returned instead of creating a duplicate.
export async function createConversation(
  creatorId: number,
  otherIds: number[],
  name: string | null
): Promise<{ conversationId: number; created: boolean }> {
  const others = [...new Set(otherIds)].filter((id) => id !== creatorId)
  const isGroup = others.length > 1

  if (!isGroup) {
    const existing = await db
      .selectFrom('conversation as c')
      .innerJoin('conversation_member as cm', 'cm.conversation_id', 'c.conversation_id')
      .select('c.conversation_id')
      .where('c.is_group', '=', false)
      .groupBy('c.conversation_id')
      .having(sql<boolean>`bool_and(cm.user_id in (${creatorId}, ${others[0]}))`)
      .having(sql<boolean>`count(*) = 2`)
      .executeTakeFirst()
    if (existing) return { conversationId: existing.conversation_id, created: false }
  }

  const conversationId = await db.transaction().execute(async (trx) => {
    const { conversation_id } = await trx
      .insertInto('conversation')
      .values({ is_group: isGroup, name: isGroup ? name : null })
      .returning('conversation_id')
      .executeTakeFirstOrThrow()

    await trx
      .insertInto('conversation_member')
      .values([creatorId, ...others].map((user_id) => ({ conversation_id, user_id })))
      .execute()

    return conversation_id
  })

  return { conversationId, created: true }
}

// Newest `limit` messages older than `beforeId`, returned oldest first.
export async function listMessages(
  conversationId: number,
  beforeId: number | undefined,
  limit: number
): Promise<ChatMessage[]> {
  let query = db
    .selectFrom('private_message as pm')
    .innerJoin('users as u', 'u.user_id', 'pm.sender_id')
    .select([
      'pm.message_id',
      'pm.conversation_id',
      'pm.sender_id',
      'u.username as sender_username',
      'pm.body',
      'pm.sent_at',
    ])
    .where('pm.conversation_id', '=', conversationId)
    .orderBy('pm.message_id', 'desc')
    .limit(limit)

  if (beforeId !== undefined) query = query.where('pm.message_id', '<', beforeId)

  return (await query.execute()).reverse()
}

export async function createMessage(
  conversationId: number,
  senderId: number,
  body: string
): Promise<ChatMessage> {
  const inserted = await db
    .insertInto('private_message')
    .values({ conversation_id: conversationId, sender_id: senderId, body })
    .returningAll()
    .executeTakeFirstOrThrow()

  const sender = await db
    .selectFrom('users')
    .select('username')
    .where('user_id', '=', senderId)
    .executeTakeFirstOrThrow()

  return { ...inserted, sender_username: sender.username }
}

// Trims and validates a message body. Returns an error string if invalid.
export function cleanBody(raw: unknown): { body: string } | { error: string } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'Message body is required' }
  const body = raw.trim()
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }
  }
  return { body }
}
