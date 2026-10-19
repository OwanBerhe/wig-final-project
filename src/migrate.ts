import * as path from 'path'
import { promises as fs } from 'fs'
import { Migrator } from 'kysely'
import type { Migration, MigrationProvider } from 'kysely'
import { db } from './db'

const migrationFolder = path.join(__dirname, 'migrations')

// Loads every .ts/.js file in src/migrations, in filename order
const provider: MigrationProvider = {
  async getMigrations() {
    const migrations: Record<string, Migration> = {}
    const files = await fs.readdir(migrationFolder)

    for (const file of files) {
      const isMigration =
        (file.endsWith('.ts') && !file.endsWith('.d.ts')) || file.endsWith('.js')
      if (!isMigration) continue

      const mod = await import(path.join(migrationFolder, file))
      const name = file.replace(/\.(ts|js)$/, '')
      migrations[name] = mod.up ? mod : mod.default
    }

    return migrations
  },
}

async function migrate(direction: 'latest' | 'down') {
  const migrator = new Migrator({ db, provider })

  const { error, results } =
    direction === 'latest'
      ? await migrator.migrateToLatest()
      : await migrator.migrateDown()

  results?.forEach((r) => console.log(`${r.status}: ${r.migrationName}`))

  if (error) {
    console.error('Migration failed:', error)
    await db.destroy()
    process.exit(1)
  }

  if (!results?.length) console.log('Nothing to migrate.')
  await db.destroy()
}

migrate(process.argv[2] === 'down' ? 'down' : 'latest')