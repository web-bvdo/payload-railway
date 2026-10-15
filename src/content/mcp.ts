import type { CollectionSlug } from 'payload'

// Which collections colleagues may edit through Claude Code (/api/mcp), on top of
// every content page (global). Per site. Delete is deliberately not an option.
// Never list personal data (form submissions, users). See docs/MCP.md.
//
// Example:
//   projects: { find: true, create: true, update: true },
export const mcpCollections: Partial<
  Record<CollectionSlug, { find?: boolean; create?: boolean; update?: boolean }>
> = {}
