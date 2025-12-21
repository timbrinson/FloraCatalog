# FloraCatalog - Maintenance & Roadmap

## Active Fixes
- [x] Double-row bug in Tree mode (case-insensitive findHeaderTaxon).
- [x] Grid unmounting on empty filter results (isFiltering check added).
- [x] Tree level expansion buttons failing on collapsed parents (Holistic walk implemented).
- [x] Filter inputs clearing on grid refresh (Local state sync added).

## To Do (Short Term)
- **Lazy Loading of Hierarchy:** Improve initial load speed by only calculating the ltree paths for the first 100 items.
- **Admin Corrections:** Build a dedicated mode to re-parent records (e.g., moving a Species to a different Genus) and regenerate the ltree path automatically.
- **Synonym Redirect:** When a user filters by a name that is a synonym, visually highlight the "Accepted" name it points to.

## Long Term Features
- **Authentication:** Integrate Supabase Auth for multi-user catalogs.
- **Offline Storage:** Use PouchDB/IndexedDB to allow full cataloging without an internet connection, syncing when online.
- **Image Integration:** Automated image harvesting via Gemini 2.5 Image models (Banana series).

## General Tips
- **AI Context:** Periodically reset the conversation in the AI Studio to prevent context bloat.
- **Large Files:** Avoid keeping raw data files (CSV) in the project source to keep token costs down. Use `data/temp` for local processing only.
