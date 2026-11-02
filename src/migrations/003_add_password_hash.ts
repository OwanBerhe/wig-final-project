import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('password_hash', 'varchar(255)', (col) =>
      col.notNull().defaultTo('')
    )
    .execute()

  await db.schema
    .alterTable('users')
    .alterColumn('password_hash', (col) => col.dropDefault())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('users').dropColumn('password_hash').execute()
}