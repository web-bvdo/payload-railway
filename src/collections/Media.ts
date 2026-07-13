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
  // Uploads live in ./media locally. On a host with a persistent volume
  // (Railway/Render/VPS) set MEDIA_DIR to the mounted path (e.g. /data/media)
  // so they survive redeploys. Serverless has no writable disk — use a storage
  // plugin there instead (see docs).
  upload: { staticDir: process.env.MEDIA_DIR || 'media' },
}
