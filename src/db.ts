import 'dotenv/config'
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'


export const db = new Kysely<any>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})