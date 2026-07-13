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
  // Uploads live in ./media and are committed to the repo — they ship with
  // every deploy, no volume needed.
  // ponytail: photos uploaded through the *production* admin land on Railway's
  // ephemeral disk and are lost on the next deploy. The workflow is: upload
  // locally (against the shared dev DB), commit ./media, push. If editors must
  // upload in prod, add a volume (set MEDIA_DIR) or an S3 store instead.
  upload: { staticDir: process.env.MEDIA_DIR || 'media' },
}
