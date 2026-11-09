# React migration status

The application now builds with Vite and React, with an Astryx Matcha Theme provider and separate view/navigation components. Cloudflare Functions remain unchanged. Build output includes the Pages routing/headers files and a service worker whose precache list is generated from the actual build artifacts.

Development: `npm ci --cache /tmp/pace-npm`, `npm run dev`; use `?demo=1` for local demo data. `npm run check`, `npm test`, and `npm run build` validate the current implementation. Production output is `dist/`. Vite does not implement the Cloudflare API; account integration requires Pages and the existing D1 binding.

## Remaining migration

This is an incremental migration, not a completed hook-based architecture. `src/lib/controller.js` still owns imperative DOM updates and event handlers. React currently owns the initial screen structure. Do not re-render those screen subtrees while the controller owns their descendants. Next steps are to replace each controller renderer and its event bindings together with React state/hooks, then remove the legacy controller. Account, group, and recovery interactions need browser integration coverage against a disposable Cloudflare database before declaring end-to-end migration complete.

The compatibility exports under `assets/js/` keep existing test imports directed at the production business-rule modules in `src/lib/`. The old `assets/js/app.js` is no longer the production entry.
