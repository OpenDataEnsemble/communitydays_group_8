# Issue 4 — Find a music act quickly (hard)

Your table is growing! Add a search box to the home page.

## Your task

In `app/src/App.jsx`, use React `useState` to store a search term. Add a labelled input above the home table, then derive a filtered list from `registrations` using each record's `data.name`.

Hints: trim the search term, compare lowercase strings, and use `filter`. Do not mutate `registrations` or copy the filtered list into a second state variable. That would make it stale when data refreshes! Do not change the shared query hook or add a storage cache.

## Done when

- Search is case-insensitive; an empty search shows all rows.
- A helpful message appears if no rows match.
- The search box has a visible label and works by keyboard.
- Saving a matching registration automatically adds it to the filtered table.
- A record arriving through sync also appears without clearing your search.
- Details and linked follow-ups still work.

Bonus: show “X matching out of Y registered”. Test with fictional records and a second synced device.
