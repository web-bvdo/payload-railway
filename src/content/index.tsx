// ponytail: server-only module (uses getPayload). Only import from server
// components. Add the `server-only` package if you want a hard compile guard.
import { RichText } from '@payloadcms/richtext-lexical/react'
import NextImage from 'next/image'
import { getPayload, type GlobalSlug } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media } from '@/payload-types'

export { contentGlobals } from './globals'

// Fetch a content group's filled-in values, fully typed (c.heroTitle, c.heroImage …).
// depth: 2 resolves upload fields into full Media objects.
export async function getContent<T extends GlobalSlug>(slug: T) {
  const payload = await getPayload({ config: await config })
  return payload.findGlobal({ slug, depth: 2 })
}

// Render an upload field. Pass through width/height/className/priority etc.
// `fallback` = a static image shipped in the repo (design default). It shows when
// no image has been uploaded yet, so design imagery ships with `git push` and is
// live immediately — the client can still upload/override it in the admin later.
// Use a static import (auto-sized) or a path under public/images/ (pass w/h). See
// docs/CONTENT.md.
type ImgProps = {
  field?: number | Media | null
  fallback?: React.ComponentProps<typeof NextImage>['src']
} & Omit<React.ComponentProps<typeof NextImage>, 'src' | 'alt' | 'width' | 'height'> & {
    alt?: string
    width?: number
    height?: number
  }

export function Img({ field, fallback, alt, width, height, ...rest }: ImgProps) {
  const m = field && typeof field === 'object' ? field : null
  if (m?.url) {
    return (
      <NextImage
        src={m.url}
        alt={alt ?? m.alt ?? ''}
        width={width ?? m.width ?? 1200}
        height={height ?? m.height ?? 800}
        {...rest}
      />
    )
  }
  if (fallback) {
    return <NextImage src={fallback} alt={alt ?? ''} width={width} height={height} {...rest} />
  }
  return null
}

// Render a richText field.
export function Rich({ field }: { field?: React.ComponentProps<typeof RichText>['data'] | null }) {
  if (!field) return null
  return <RichText data={field} />
}
