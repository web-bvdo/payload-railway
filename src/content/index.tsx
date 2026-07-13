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
type ImgProps = { field?: number | Media | null } & Omit<
  React.ComponentProps<typeof NextImage>,
  'src' | 'alt' | 'width' | 'height'
> & { alt?: string; width?: number; height?: number }

export function Img({ field, alt, width, height, ...rest }: ImgProps) {
  const m = field && typeof field === 'object' ? field : null
  if (!m?.url) return null
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

// Render a richText field.
export function Rich({ field }: { field?: React.ComponentProps<typeof RichText>['data'] | null }) {
  if (!field) return null
  return <RichText data={field} />
}
