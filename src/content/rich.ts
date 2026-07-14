// Build a Lexical richText value from plain paragraphs — for use as a field
// `defaultValue`, so design copy ships with the code (git push) instead of only
// living in the admin database. Each argument is one paragraph.
//
//   import { rich } from './rich'
//   { name: 'intro', type: 'richText', defaultValue: rich('First line.', 'Second line.') }
//
// ponytail: plain paragraphs only. Need bold/links/headings in a default? Author
// that layout directly in the route (JSX) instead — see docs/CONTENT.md.

type TextNode = {
  type: 'text'
  text: string
  format: number
  style: string
  mode: 'normal'
  detail: number
  version: number
}

type ParagraphNode = {
  type: 'paragraph'
  format: string
  indent: number
  version: number
  direction: 'ltr'
  textFormat: number
  children: TextNode[]
}

export type RichValue = {
  root: {
    type: 'root'
    format: string
    indent: number
    version: number
    direction: 'ltr'
    children: ParagraphNode[]
  }
}

export function rich(...paragraphs: string[]): RichValue {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: text
          ? [
              {
                type: 'text',
                text,
                format: 0,
                style: '',
                mode: 'normal',
                detail: 0,
                version: 1,
              },
            ]
          : [],
      })),
    },
  }
}
