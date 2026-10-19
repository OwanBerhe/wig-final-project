import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('post')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .alterTable('comment')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .alterTable('ticket')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .alterTable('booking')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .alterTable('venue')
    .addColumn('latitude', 'numeric(9, 6)')
    .execute()

  await db.schema
    .alterTable('venue')
    .addColumn('longitude', 'numeric(9, 6)')
    .execute()

  await sql`
    alter table venue
      add constraint venue_latitude_check
        check (latitude is null or latitude between -90 and 90),
      add constraint venue_longitude_check
        check (longitude is null or longitude between -180 and 180)
  `.execute(db)

  await db.schema.createIndex('venue_owner_id_idx').on('venue').column('owner_id').execute()
  await db.schema.createIndex('concert_venue_id_idx').on('concert').column('venue_id').execute()
  await db.schema.createIndex('concert_artist_artist_id_idx').on('concert_artist').column('artist_id').execute()
  await db.schema.createIndex('booking_venue_id_idx').on('booking').column('venue_id').execute()
  await db.schema.createIndex('booking_artist_id_idx').on('booking').column('artist_id').execute()
  await db.schema.createIndex('booking_concert_id_idx').on('booking').column('concert_id').execute()
  await db.schema.createIndex('ticket_user_id_idx').on('ticket').column('user_id').execute()
  await db.schema.createIndex('wig_status_concert_id_idx').on('wig_status').column('concert_id').execute()
  await db.schema.createIndex('rating_concert_id_idx').on('rating').column('concert_id').execute()
  await db.schema.createIndex('post_author_id_idx').on('post').column('author_id').execute()
  await db.schema.createIndex('post_concert_id_idx').on('post').column('concert_id').execute()
  await db.schema.createIndex('comment_post_id_idx').on('comment').column('post_id').execute()
  await db.schema.createIndex('comment_user_id_idx').on('comment').column('user_id').execute()
  await db.schema.createIndex('comment_parent_comment_id_idx').on('comment').column('parent_comment_id').execute()
  await db.schema.createIndex('post_reaction_post_id_idx').on('post_reaction').column('post_id').execute()
  await db.schema.createIndex('media_uploader_id_idx').on('media').column('uploader_id').execute()
  await db.schema.createIndex('media_concert_id_idx').on('media').column('concert_id').execute()
  await db.schema.createIndex('media_venue_id_idx').on('media').column('venue_id').execute()
  await db.schema.createIndex('conversation_member_user_id_idx').on('conversation_member').column('user_id').execute()
  await db.schema.createIndex('private_message_sender_id_idx').on('private_message').column('sender_id').execute()
  await db.schema.createIndex('private_message_conversation_sent_idx').on('private_message').columns(['conversation_id', 'sent_at']).execute()
  await db.schema.createIndex('live_chat_message_user_id_idx').on('live_chat_message').column('user_id').execute()
  await db.schema.createIndex('live_chat_message_concert_sent_idx').on('live_chat_message').columns(['concert_id', 'sent_at']).execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('live_chat_message_concert_sent_idx').execute()
  await db.schema.dropIndex('live_chat_message_user_id_idx').execute()
  await db.schema.dropIndex('private_message_conversation_sent_idx').execute()
  await db.schema.dropIndex('private_message_sender_id_idx').execute()
  await db.schema.dropIndex('conversation_member_user_id_idx').execute()
  await db.schema.dropIndex('media_venue_id_idx').execute()
  await db.schema.dropIndex('media_concert_id_idx').execute()
  await db.schema.dropIndex('media_uploader_id_idx').execute()
  await db.schema.dropIndex('post_reaction_post_id_idx').execute()
  await db.schema.dropIndex('comment_parent_comment_id_idx').execute()
  await db.schema.dropIndex('comment_user_id_idx').execute()
  await db.schema.dropIndex('comment_post_id_idx').execute()
  await db.schema.dropIndex('post_concert_id_idx').execute()
  await db.schema.dropIndex('post_author_id_idx').execute()
  await db.schema.dropIndex('rating_concert_id_idx').execute()
  await db.schema.dropIndex('wig_status_concert_id_idx').execute()
  await db.schema.dropIndex('ticket_user_id_idx').execute()
  await db.schema.dropIndex('booking_concert_id_idx').execute()
  await db.schema.dropIndex('booking_artist_id_idx').execute()
  await db.schema.dropIndex('booking_venue_id_idx').execute()
  await db.schema.dropIndex('concert_artist_artist_id_idx').execute()
  await db.schema.dropIndex('concert_venue_id_idx').execute()
  await db.schema.dropIndex('venue_owner_id_idx').execute()

  await db.schema.alterTable('venue').dropColumn('longitude').execute()
  await db.schema.alterTable('venue').dropColumn('latitude').execute()

  await db.schema.alterTable('booking').dropColumn('created_at').execute()
  await db.schema.alterTable('ticket').dropColumn('created_at').execute()
  await db.schema.alterTable('comment').dropColumn('created_at').execute()
  await db.schema.alterTable('post').dropColumn('created_at').execute()
}