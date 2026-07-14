import type { GlobalConfig } from 'payload'

import { rich } from './rich'

// The editable content for the home page — like an ACF field group.
// Non-devs fill these in at /admin → Content → Home page.
// You read them in your own page with getContent('home') and place them
// wherever you like — the order here only affects the admin form, not the site.
//
// `defaultValue` = the copy from the design. It ships with the code (git push)
// and renders immediately after deploy; editors can override it in the admin
// later. See docs/CONTENT.md.
export const home: GlobalConfig = {
  slug: 'home',
  label: 'Home page',
  access: { read: () => true },
  admin: { group: 'Content' },
  fields: [
    { name: 'heroTitle', type: 'text', required: true, defaultValue: 'Welkom' },
    {
      name: 'heroSubtitle',
      type: 'textarea',
      defaultValue: 'Bewerk deze tekst in /admin — geen developer nodig.',
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'intro', type: 'richText', defaultValue: rich('Dit is de intro-tekst uit het ontwerp.') },
    { name: 'text2', type: 'richText' },
  ],
}
