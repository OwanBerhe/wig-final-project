import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    alter table concert
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A')
      ) stored
  `.execute(db)

  await sql`
    alter table venue
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(address, '')), 'C')
      ) stored
  `.execute(db)

  await sql`
    alter table artist
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(bio, '')), 'C')
      ) stored
  `.execute(db)

  await sql`create index concert_search_vector_idx on concert using gin (search_vector)`.execute(db)
  await sql`create index venue_search_vector_idx on venue using gin (search_vector)`.execute(db)
  await sql`create index artist_search_vector_idx on artist using gin (search_vector)`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`drop index artist_search_vector_idx`.execute(db)
  await sql`drop index venue_search_vector_idx`.execute(db)
  await sql`drop index concert_search_vector_idx`.execute(db)

  await db.schema.alterTable('artist').dropColumn('search_vector').execute()
  await db.schema.alterTable('venue').dropColumn('search_vector').execute()
  await db.schema.alterTable('concert').dropColumn('search_vector').execute()
}