import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
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
  db: postgresAdapter({
    // One Postgres for everyone. Locally, DATABASE_URI points at the Railway
    // dev database (its public connection string) so the whole team shares the
    // same dev data — no seeding, no import/export. On Railway, the Postgres
    // service injects DATABASE_URL; we read that too. See docs/DEPLOY-RAILWAY.md.
    pool: {
      connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL,
    },
  }),
  sharp,
  plugins: [
    // Media on an S3-compatible bucket (Railway Bucket / Cloudflare R2), so
    // uploads made in the admin persist and are shared across dev/prod — no
    // volume, no repo/volume conflict. Auto-disabled locally when S3_BUCKET is
    // unset → falls back to ./media on disk. forcePathStyle is required for
    // R2/MinIO-style endpoints. See docs/DEPLOY-RAILWAY.md.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: { media: true },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
