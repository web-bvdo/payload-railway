import type { GlobalConfig } from 'payload'

// The editable content for the home page — like an ACF field group.
// Non-devs fill these in at /admin → Content → Home page.
// You read them in your own page with getContent('home') and place them
// wherever you like — the order here only affects the admin form, not the site.
export const home: GlobalConfig = {
  slug: 'home',
  label: 'Home page',
  access: { read: () => true },
  admin: { group: 'Content' },
  fields: [
    { name: 'heroTitle', type: 'text', required: true },
    { name: 'heroSubtitle', type: 'textarea' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'intro', type: 'richText' },
    { name: 'text2', type: 'richText' },
  ],
}
