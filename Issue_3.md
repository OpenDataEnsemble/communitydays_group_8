# Issue 3 — Ask one more useful question (medium)

What else would you like to know about a music act? Add an optional **Short description** question.

## Your task

1. In `forms/group_8_registration/schema.json`, add a string property called `description` with a title and a maximum length of 120. Do not add it to `required`.
2. In the neighbouring `ui.json`, add a Control with scope `#/properties/description`.
3. In `app/src/theme.json`, add `{ "key": "description", "label": "Short description" }` to `registrationFields`.

Edit source forms, never generated `app/public/forms/`. Keep the form to at most six questions.

## Done when

- `npm run validate:forms` and `npm run build` pass from `app/`.
- Reinstall/re-sync the bundle: a new registration offers the question and shows the answer on its details page.
- Old registrations without this answer still display safely.
