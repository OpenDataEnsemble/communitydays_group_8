# Music — Group 8: agent and developer guide

This is a deliberately small teaching app for **ODE Community Days 2026, Kampala**. This guide adapts the relevant ODE and GBMIS conventions without importing their larger architectures. Keep changes understandable to junior developers.

## This app

- **Theme:** Music.
- **Register:** music act (`group_8_registration`).
- **Follow-up action:** Record a rehearsal (`group_8_followup`).
- **Flow:** home registration button and table → observation details → linked follow-up and history.
- **Stack:** React + Vite, JavaScript/JSX, JSON Forms. This is a web custom app hosted by Formulus (the React Native mobile runtime) or ODE Desktop, not a standalone React Native app.
- **Scope:** two forms, currently three questions each; keep each to at most six questions.

Read [README.md](README.md) for setup and host smoke tests. Public ODE documentation is at <https://opendataensemble.org/docs/>. Do not assume students have ODE, GBMIS or other group repositories checked out.

## Where to work

| Task | Source of truth |
|------|-----------------|
| Title, colours, labels, form IDs and displayed fields | `app/src/theme.json` |
| Home table, details and follow-up history | `app/src/App.jsx` |
| Bridge access, queries and automatic refresh | `app/src/useObservations.js` |
| Refresh regression tests | `app/src/useObservations.test.js` |
| Layout and appearance | `app/src/styles.css` |
| Registration questions | `forms/group_8_registration/schema.json` and `ui.json` |
| Follow-up questions | `forms/group_8_followup/schema.json` and `ui.json` |
| Host index configuration | `app/public/app.config.json` |
| Offline illustration and ODE logo | `app/public/assets/` |
| Form validation and bundle scripts | `app/scripts/` |
| Build, CI and manual deployment | `.github/workflows/` |
| Student exercises, easy to hard | `Issue_1.md` through `Issue_4.md` |

## Keep it small and safe

- Work only in this repository unless explicitly asked to change another. The eight apps share a structure but are independent student projects; do not propagate student changes to other groups automatically.
- Prefer existing React state, plain CSS and the current hook. Do not introduce a global state manager, query/cache library, backend, native project or shared monorepo package for a small exercise.
- Preserve the ODE logo and **ODE Community Days 2026, Kampala** branding. Keep artwork bundled locally so it works offline; attribution is in `app/public/assets/README.md`.
- Use fictional workshop data only. Do not collect personal, medical or sensitive information; health and psychology examples are not clinical tools.
- Preserve student work. Do not complete unrelated exercises, rename form IDs, commit changes or deploy without being asked. Explain changed files and how to test them.
- Follow the existing formatting and use LF line endings. Add comments for non-obvious constraints, not to restate code.

## Runtime invariants

1. Keep **HashRouter** and Vite **`base: './'`**: the host loads local files, not a conventional website.
2. Load `app/public/formulus-load.js` before application JavaScript in `app/index.html`. Use the supported `window.getFormulus()` bridge rather than inventing native calls.
3. Browser previews show layout only. Real forms, observations and sync require Formulus or ODE Desktop. Do not silently substitute mock data or browser storage when the bridge is missing.
4. Formulus owns observation persistence and synchronization. Use `openFormplayer` for data entry and `getObservationsByQuery` for reads.
5. Keep source forms in root `forms/`. Never hand-edit generated `app/public/forms/`, `app/dist/` or `app-bundles/`, or commit generated output and `node_modules/`.

## Forms and parent links

- Each form folder name is its form type ID. Keep it aligned with `registrationForm` / `followUpForm` in `theme.json`.
- Declare answers in draft-07 `schema.json`; add corresponding Controls in `ui.json`. When a displayed field changes, update `columns`, `registrationFields` or `followUpFields` in `theme.json` as appropriate.
- Registrations use `name` as their display name. The parent identity is the host's `observationId`, not a name or row number.
- Follow-ups receive `defaultData.entity_id` equal to the parent's `observationId`. Keep `entity_id` required in the follow-up schema but without an editable Control. It is a stamp, not a question.
- **Never give an injected stamp a visibility-controlled Control.** Formplayer clears hidden fields. Two Controls on the same scope with opposite visibility rules can also wipe each other's values.
- Prefer optional new fields for exercises so old observations remain usable. Do not add more than six questions per form.

## Queries, indexes and refresh

`useObservations.js` is the single data-access location; keep predicates in its `observationQuery` helper instead of scattering inline query ASTs through screens.

- Queries exclude drafts and deleted observations. Filter follow-ups by `data.entity_id` so each details page shows only its own history.
- Do not replace host queries with full observation scans and JavaScript filtering. Filtering already-loaded rows for the search exercise is presentation logic and is appropriate.
- There is **no extra observation cache**. Refresh re-queries host storage. Derive filtered UI lists from current observations rather than storing a second, stale copy.
- Preserve refresh after `openFormplayer` settles, including cancellation and errors: local saves need not change the server revision.
- Preserve window/native focus and visibility-return refresh, plus visible-only sync revision checks every five seconds. Revision changes trigger fresh queries; unchanged revisions should not repeatedly reload the lists.
- Preserve request/session guards so late responses and unmounted work cannot overwrite current data. Clean up timers, listeners and native callback wrappers, restoring previous callbacks.
- Keep errors visible with Retry; retained data after a failed refresh must be identified as potentially stale. Do not display a failed query as a genuinely empty list.
- `app/public/app.config.json` declares the `entity_id` index for this app's follow-up form. Keep `enableExpressionIndex: false` to avoid requiring SQLite JSON1. If adding hot query fields, align the index definitions with the predicates and form types.
- After changing indexes, re-sync the **app bundle**, not just observations. A declared index with missing/stale rows can silently return no matches; do not assume a full-scan fallback protects it.

When changing this behavior, extend `useObservations.test.js` and run the host smoke tests in the README. Automated tests do not replace a real two-device sync check.

## Commands and validation

Use Node.js **22.12 or newer** and npm. Run from `app/`:

```sh
npm ci
npm run dev             # development preview; runs until stopped
npm run test:hooks      # focused refresh tests
npm test                # form-validator tests plus refresh tests
npm run validate:forms  # schemas, Controls, required fields, six-question limit
npm run build           # validate/copy forms, Vite build, stage bundle
npm run zip             # package staged output; build first
```

For code/form changes, run `npm test`, `npm run validate:forms` and `npm run build`; run `npm run zip` when checking packaging. There are currently no lint or format npm scripts: do not claim to have run them. Documentation-only changes do not require rebuilding the app; verify referenced paths and commands instead.

The bundle is `app-bundles/bundle-v1.0.0.zip` at the current version, with an `app/` prefix. The ZIP filename follows `app/package.json`'s version. Report the checks actually run and any remaining host validation.

## CI and deployment

The workflows are adapted from GBMIS: reusable bundle build, CI on `main`/`dev`, and **manual-only** deployment. Preserve the manual deployment trigger unless explicitly asked otherwise.

Deployment needs repository secrets `DEV_SYNK_URI`, `DEV_SYNK_ADMIN` and `DEV_SYNK_PASSWORD`. Never hardcode credentials. Uploading and activating a bundle replaces the active app on that Synkronus server: use a separate server/environment for each group. Do not deploy as part of routine validation.

## Workshop exercises

1. Rename the deliberately plain home title.
2. Personalise colours, description and local SVG artwork.
3. Add an optional question and display its answer.
4. Add case-insensitive search without breaking automatic refresh.

Keep tasks beginner-friendly. If a requested change moves their target files or changes their assumptions, update the affected `Issue_*.md` and README. Otherwise leave the exercises for students to solve.
