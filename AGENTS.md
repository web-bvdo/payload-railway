# AGENTS.md

This project's agent/developer guide lives in **[CLAUDE.md](CLAUDE.md)** — read it before
making changes. It covers the architecture, how to add pages, conventions, and the
core/site-specific split.

Quick reminders:

- Add a page: `npm run new:page` (then it's done). After any content-field change:
  `npm run generate:types`.
- Content is field-level (Payload Globals as ACF groups), read via `getContent`, `<Img>`,
  `<Rich>` from `@/content` (server-only). No block/page-builder.
- Never commit `.env`, `payload.db*`, or `/media`.
