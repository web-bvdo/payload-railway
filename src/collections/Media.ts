import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true, // images are public
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Describe the image for screen readers and SEO.' },
    },
  ],
  // Uploads live in ./media locally; on Railway set MEDIA_DIR to the mounted
  // volume path (e.g. /data/media) so they survive redeploys.
  // ponytail: files sit on a per-environment volume, so uploads made against the
  // shared dev DB only resolve on the machine that made them. Fine for a single
  // prod instance; for team-synced media add an S3-compatible store
  // (@payloadcms/storage-s3 → R2/bucket). See docs/DEPLOY-RAILWAY.md.
  upload: { staticDir: process.env.MEDIA_DIR || 'media' },
}
