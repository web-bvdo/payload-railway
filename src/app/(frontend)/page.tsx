import React from 'react'

import { getContent, Img, Rich } from '@/content'

// Default page. You build the layout; Payload supplies the text/images.
// Fields live in src/content/home.ts and are edited at /admin.
export default async function HomePage() {
  const c = await getContent('home')

  return (
    <>
      <section className="hero">
        <h1>{c.heroTitle}</h1>
        {c.heroSubtitle && <p>{c.heroSubtitle}</p>}
        <Img field={c.heroImage} className="hero-img" />
      </section>

      <section className="prose">
        <Rich field={c.intro} />
      </section>
    </>
  )
}
