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
  // In production, uploads go to the S3-compatible bucket (see the s3Storage
  // plugin in payload.config.ts) — shared across dev/prod, persistent.
  // Locally, when S3_BUCKET is unset, files fall back to ./media on disk.
  upload: { staticDir: process.env.MEDIA_DIR || 'media' },
}
