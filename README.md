# Music App — Group 8

**ODE Community Days 2026, Kampala**

Register music acts, open their details, and select **Record a rehearsal** to save a linked follow-up. Both forms ask only three questions.

## Start here

This is a **React web custom app**, hosted inside Formulus (the React Native mobile app) or ODE Desktop. Custom apps are not standalone React Native applications. Node.js 22 and npm are required.

From this folder:

```sh
cd app
npm ci
npm run dev
```

The browser preview shows the design; real forms, saved observations and sync require Formulus or ODE Desktop. There is deliberately no mock storage or simulated form bridge. For ODE Desktop developer mode, mirror the built bundle using the [developer-mode guide](https://opendataensemble.org/docs/guides/ode-desktop-developer-mode).

## Small project map

- `app/src/theme.json`: title, colours, labels, displayed fields and form IDs. Start here!
- `app/src/App.jsx`: home table and details page, including follow-up history.
- `app/src/useObservations.js`: the only data/bridge hook.
- `app/src/styles.css`: layout and styling.
- `forms/group_8_registration/`: registration schema and layout.
- `forms/group_8_followup/`: follow-up schema and layout.
- `app/public/assets/`: bundled original illustration and supplied ODE logo.
- `Issue_1.md` through `Issue_4.md`: workshop exercises, easiest first.

Each app has the same structure and independent dependencies. No parent project is needed. Forms are authored in root `forms/`; `app/public/forms/` is generated. Hash routing and relative Vite paths support offline WebViews.

## How refresh works

There is no additional observation cache to invalidate: every refresh queries host storage with `getObservationsByQuery`, excluding drafts and deleted observations. The hook refreshes after `openFormplayer` settles (including cancellation), on focus/visibility return, and when the sync revision changes (checked every five seconds while visible). Request IDs prevent older requests from replacing newer data. Failed queries show a retry button and mark retained data as potentially stale. A manual Refresh button is also available.

Follow-ups store the parent's observation ID in `entity_id`, prefilled by the app. It is required but has no Control, so users cannot change it and visibility rules cannot clear it. The configured EAV index speeds up this filter; `enableExpressionIndex: false` avoids requiring SQLite JSON1. Re-sync the **app bundle** after changing indexes.

## Validate and package

From `app/`:

```sh
npm test
npm run validate:forms
npm run build
npm run zip
```

The bundle is `app-bundles/bundle-v1.0.0.zip`, containing `app/` with the web app and two forms. Build before ZIP. Never commit generated output or node_modules.

## GitHub Actions and deployment

The three workflows are copied/adapted from GBMIS: reusable bundle build, CI on main/dev, and deployment. **Deployment runs automatically on every push to main**. Manual deployment is also available via Actions → Deploy Community App → Run workflow. Configure repository secrets `DEV_SYNK_URI`, `DEV_SYNK_ADMIN`, `DEV_SYNK_PASSWORD`. This uploads and activates the bundle, replacing the active custom app on that server. **Give each group its own Synkronus server/environment**; eight bundles on one server would overwrite one another. Keep secrets out of source. A push to main builds, uploads and activates the bundle when the required secrets are configured.

## Host smoke test

1. Install the bundle in Formulus/Desktop and register two fictional music acts.
2. Close each saved form: the table should update without pressing Refresh. Cancel a third form: no draft should appear.
3. Open the first row, select **Record a rehearsal**, and save. Its history should update; the second row must not show that follow-up.
4. Register another entity on a second device, sync both devices using the host's sync controls, then return to this app. Confirm the table updates (also test leaving it visible during sync).
5. Test offline creation, reconnect/sync, and restart. Verify saved data persists.
6. Try a narrow screen, keyboard navigation and the error/retry state.

Use fictional data only, especially for health and psychology. Do not collect personal, medical or sensitive information during the workshop. This is a teaching example, not a clinical system.
