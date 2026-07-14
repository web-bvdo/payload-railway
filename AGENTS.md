# AGENTS.md

This project's agent/developer guide lives in **[CLAUDE.md](CLAUDE.md)** — read it before
making changes. It covers the architecture, how to add pages, conventions, and the
core/site-specific split.

Quick reminders:

- **This repo is the template.** Don't develop in it per client — copy it (`Use this
  template` → new repo) and point Railway at the copy. See [docs/NEW-SITE.md](docs/NEW-SITE.md).
- Add a page: `npm run new:page` (then it's done). After any content-field change:
  `npm run generate:types`, and for production `npm run migrate:create` + commit.
- Content is field-level (Payload Globals as ACF groups), read via `getContent`, `<Img>`,
  `<Rich>` from `@/content` (server-only). No block/page-builder.
- Runs on **Railway**: Postgres (database) + Bucket (media). Never commit `.env` or `/media`.
