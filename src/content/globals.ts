import { home } from './home'

// Register every content group (= editable page) here.
// payload.config.ts reads this array automatically.
//
// Add a page the easy way:   npm run new:page
// Or by hand: create src/content/<slug>.ts, import it above, add it below,
// then run `npm run generate:types`. See docs/content-fields.md.
export const contentGlobals = [home]
