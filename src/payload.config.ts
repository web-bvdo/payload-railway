import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { contentGlobals } from './content/globals'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Media, Users],
  globals: contentGlobals,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      // Local dev: file:./payload.db (no token). Production: a hosted libSQL/Turso.
      // Accepts either our own DATABASE_URI/DATABASE_AUTH_TOKEN or the TURSO_*
      // vars the Vercel Turso integration injects (auto-managed). One adapter.
      url: process.env.DATABASE_URI || process.env.TURSO_DATABASE_URL || 'file:./payload.db',
      authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
    },
  }),
  sharp,
  plugins: [
    // Stores uploaded media on Vercel Blob in production. Auto-disabled locally
    // (no token) → falls back to the /media folder on disk. Serverless can't use
    // local disk, so this is required for uploads on Vercel.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
})
