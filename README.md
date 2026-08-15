# Memo

A notebook app for Android (React Native + Expo) that replaces the stock
"Notes" app — categories as folders, notes you can customize with colors and
background templates, and a low learning curve as the guiding design rule.

"Memo" is a working name, not final — see [Plan.md](Plan.md) §1.5.

## Status

Local-first: everything lives on the device, no account or backend yet
(that's planned as its own later phase). Data is stored in **SQLite**
(`expo-sqlite`), not a flat AsyncStorage blob — see
[`src/lib/db.ts`](src/lib/db.ts) and [`src/lib/storage.ts`](src/lib/storage.ts).
The app follows the phone's dark/light setting by default, with a manual
override (☀️/🌙 in the home screen header) that persists once you pick one —
see [`src/hooks/use-theme-preference.tsx`](src/hooks/use-theme-preference.tsx).

Tested on Android via Expo Go. For the full requirements, decision history,
and roadmap, see **[Plan.md](Plan.md)** — it's kept up to date as the source
of truth for what's built vs. planned. For a guided walkthrough of how the
code fits together (data flow, SQLite, dark/light mode, file-by-file
reference), see the published
[architecture artifact](https://claude.ai/code/artifact/dddaec87-8d2e-48fa-ad94-50f635309dc8).

## Getting started

```bash
npm install
npm start
```

This prints a QR code. Scan it with the [Expo Go](https://expo.dev/go) app on
your phone (same Wi-Fi network as your computer). If something looks stale
after a change, restart with a cleared cache:

```bash
npx expo start -c
```

## Tech stack

- **Expo (managed workflow)**, SDK 54, **TypeScript**
- **expo-router** — file-based routing (`src/app/`)
- **SQLite** (`expo-sqlite`) for storage — real tables, not a JSON blob
- No backend yet — see Plan.md for the planned authentication + sync phase

## Project structure

See [Plan.md §10](Plan.md#10-project-structure-current) for the full annotated
tree. Briefly:

```
src/
  app/         # screens (file-based routes: folders, folder detail, note editor)
  components/  # shared presentational components
  hooks/       # useNotesStore (data), useThemePreference (dark/light), useTheme
  lib/         # db.ts (SQLite schema/migration), storage.ts (CRUD), types.ts,
               # appearance.ts (contrast math), templates.ts (background images)
  constants/   # colors, spacing, palettes
assets/templates/   # bundled background images
scripts/            # dev-only tooling (e.g. image compression)
```

## Image assets

Any new bundled image (background template, icon, etc.) must be compressed
first — see [Plan.md §7](Plan.md#7-technical-design--architecture-notes) for
the recipe (`scripts/compress-images.py`). Never commit multi-MB originals.
