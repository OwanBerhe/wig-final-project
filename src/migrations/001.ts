import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable('users')
    .addColumn('user_id', 'serial', (col) => col.primaryKey())
    .addColumn('role', 'varchar(20)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('username', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('location', 'varchar(100)')
    .addCheckConstraint(
      'users_role_check',
      sql`role in ('concert_goer', 'artist', 'venue_owner')`
    )
    .execute()

  await db.schema
    .createTable('conversation')
    .addColumn('conversation_id', 'serial', (col) => col.primaryKey())
    .addColumn('is_group', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('name', 'varchar(100)')
    .execute()

  await db.schema
    .createTable('artist')
    .addColumn('artist_id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().unique().references('users.user_id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('bio', 'text')
    .execute()

  await db.schema
    .createTable('venue')
    .addColumn('venue_id', 'serial', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('city', 'varchar(100)', (col) => col.notNull())
    .addColumn('open_to_talent', 'boolean', (col) =>
      col.notNull().defaultTo(false)
    )
    .execute()

  await db.schema
    .createTable('concert')
    .addColumn('concert_id', 'serial', (col) => col.primaryKey())
    .addColumn('venue_id', 'integer', (col) =>
      col.notNull().references('venue.venue_id').onDelete('cascade')
    )
    .addColumn('title', 'varchar(150)', (col) => col.notNull())
    .addColumn('date', 'timestamp', (col) => col.notNull())
    .addColumn('ticket_price', 'numeric(10, 2)', (col) =>
      col.notNull().defaultTo(0)
    )
    .execute()

  await db.schema
    .createTable('concert_artist')
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('artist_id', 'integer', (col) =>
      col.notNull().references('artist.artist_id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('concert_artist_pk', ['concert_id', 'artist_id'])
    .execute()

  await db.schema
    .createTable('booking')
    .addColumn('booking_id', 'serial', (col) => col.primaryKey())
    .addColumn('venue_id', 'integer', (col) =>
      col.notNull().references('venue.venue_id').onDelete('cascade')
    )
    .addColumn('artist_id', 'integer', (col) =>
      col.notNull().references('artist.artist_id').onDelete('cascade')
    )
    .addColumn('concert_id', 'integer', (col) =>
      col.references('concert.concert_id').onDelete('set null')
    )
    .addColumn('status', 'varchar(20)', (col) =>
      col.notNull().defaultTo('pending')
    )
    .addColumn('pay_terms', 'varchar(100)')
    .execute()

  await db.schema
    .createTable('ticket')
    .addColumn('ticket_id', 'serial', (col) => col.primaryKey())
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addUniqueConstraint('ticket_concert_user_unique', [
      'concert_id',
      'user_id',
    ])
    .execute()

  await db.schema
    .createTable('wig_status')
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('status', 'varchar(20)', (col) => col.notNull())
    .addPrimaryKeyConstraint('wig_status_pk', ['user_id', 'concert_id'])
    .addCheckConstraint(
      'wig_status_status_check',
      sql`status in ('going', 'not_going', 'maybe')`
    )
    .execute()

  await db.schema
    .createTable('rating')
    .addColumn('rating_id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('stars', 'integer', (col) => col.notNull())
    .addUniqueConstraint('rating_user_concert_unique', [
      'user_id',
      'concert_id',
    ])
    .addCheckConstraint('rating_stars_check', sql`stars >= 0 and stars <= 5`)
    .execute()

  await db.schema
    .createTable('post')
    .addColumn('post_id', 'serial', (col) => col.primaryKey())
    .addColumn('author_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('body', 'text', (col) => col.notNull())
    .execute()


  await db.schema
    .createTable('comment')
    .addColumn('comment_id', 'serial', (col) => col.primaryKey())
    .addColumn('post_id', 'integer', (col) =>
      col.notNull().references('post.post_id').onDelete('cascade')
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('parent_comment_id', 'integer', (col) =>
      col.references('comment.comment_id').onDelete('cascade')
    )
    .addColumn('body', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('post_reaction')
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('post_id', 'integer', (col) =>
      col.notNull().references('post.post_id').onDelete('cascade')
    )
    .addColumn('type', 'varchar(10)', (col) => col.notNull())
    .addPrimaryKeyConstraint('post_reaction_pk', ['user_id', 'post_id'])
    .addCheckConstraint(
      'post_reaction_type_check',
      sql`type in ('like', 'dislike')`
    )
    .execute()


  await db.schema
    .createTable('media')
    .addColumn('media_id', 'serial', (col) => col.primaryKey())
    .addColumn('uploader_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('concert_id', 'integer', (col) =>
      col.references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('venue_id', 'integer', (col) =>
      col.references('venue.venue_id').onDelete('cascade')
    )
    .addColumn('type', 'varchar(10)', (col) => col.notNull())
    .addColumn('url', 'text', (col) => col.notNull())
    .addCheckConstraint('media_type_check', sql`type in ('photo', 'video')`)
    .addCheckConstraint(
      'media_target_check',
      sql`concert_id is not null or venue_id is not null`
    )
    .execute()

  await db.schema
    .createTable('live_chat_message')
    .addColumn('message_id', 'serial', (col) => col.primaryKey())
    .addColumn('concert_id', 'integer', (col) =>
      col.notNull().references('concert.concert_id').onDelete('cascade')
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('sent_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()


  await db.schema
    .createTable('conversation_member')
    .addColumn('conversation_id', 'integer', (col) =>
      col.notNull().references('conversation.conversation_id').onDelete('cascade')
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('conversation_member_pk', [
      'conversation_id',
      'user_id',
    ])
    .execute()

  await db.schema
    .createTable('private_message')
    .addColumn('message_id', 'serial', (col) => col.primaryKey())
    .addColumn('conversation_id', 'integer', (col) =>
      col.notNull().references('conversation.conversation_id').onDelete('cascade')
    )
    .addColumn('sender_id', 'integer', (col) =>
      col.notNull().references('users.user_id').onDelete('cascade')
    )
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('sent_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('private_message').execute()
  await db.schema.dropTable('conversation_member').execute()
  await db.schema.dropTable('live_chat_message').execute()
  await db.schema.dropTable('media').execute()
  await db.schema.dropTable('post_reaction').execute()
  await db.schema.dropTable('comment').execute()
  await db.schema.dropTable('post').execute()
  await db.schema.dropTable('rating').execute()
  await db.schema.dropTable('wig_status').execute()
  await db.schema.dropTable('ticket').execute()
  await db.schema.dropTable('booking').execute()
  await db.schema.dropTable('concert_artist').execute()
  await db.schema.dropTable('concert').execute()
  await db.schema.dropTable('venue').execute()
  await db.schema.dropTable('artist').execute()
  await db.schema.dropTable('conversation').execute()
  await db.schema.dropTable('users').execute()
}