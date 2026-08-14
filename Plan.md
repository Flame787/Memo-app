# Memo — plan and requirements

> Working name of the app: **Memo**. This is intentionally temporary, a generic name until a better one
> is found — the app name lives in two places (`package.json` → `name`, `app.json` → `expo.name`/`expo.slug`/`expo.scheme`)
> and is easy to change later. Rejected names: "Notea" (an AI note-taker app already exists on Apple),
> "Notendo" (collision with an existing small app + phonetic similarity to "Nintendo" — trademark risk).

## Idea

A replacement for the Redmi/Android "Notes" app — a notebook with **categories as folders**, in which
the user creates, edits, and moves notes. Goal: useful to a broad range of everyday users,
not just the author.

## Status (2026-08-13)

- Created an Expo (React Native + TypeScript) project, file-based routing via `expo-router`.
- First navigable skeleton: **Folders → Notes in a folder → Note editor**, with local
  data storage (no backend for now).
- Being tested on Android (author's phone) via Expo Go.

## User requirements (as stated, refined)

### 1. Categorization (must-have, in the skeleton)
- The user creates the categories ("folders") themselves.
- Within a category: creating, editing, and **moving** notes between categories.
- Implemented in the skeleton: creating a folder with a color, a notes list per folder, moving
  a note via long-press (or the chip in the editor) → a dialog listing the other folders.

### 2. Calendar (deferred)
- An integrated calendar — explicitly **deferred for later**, not to be done now.

### 3. Visual appearance (partly in the skeleton, to be developed later)
- Must look modern.
- Every folder and every note within it should be **customizable**: colors and background
  "templates".
  - In the skeleton: a folder has a color choice from 8 preset tones (cards in a grid, color = card background).
  - Still missing: color/background customization at the level of an individual note, and a real "template"
    background system (not just color) — for the next iteration.
- Simple to use, a **low learning curve** for new users — a priority over "power user"
  features. Every new feature should be checked through that filter before being added.

### 4. Non-functional requirements
- Goal: useful to a large number of everyday users, not just the author — design with that audience in mind
  (simplicity > complexity), don't make niche/power-user decisions too early.

### 5. Photos from the gallery (new, not yet in the skeleton)
- The user can add photos to a note **from the phone's photo gallery**.
- This means the app must be able to **request permission** to access the device's photo library, and
  handle the case where the user denies it (fall back gracefully, don't crash or block the note).
- Candidate module: `expo-image-picker` (pick one/more images) — request permission at the point of use,
  not on app launch. If we later need to read the whole library or save back to it, `expo-media-library`.
- Data-model impact: a picked image is a file URI. We should **copy the file into app storage**
  (`expo-file-system`) and store only the reference/path on the note, not the image bytes in AsyncStorage.
  This reinforces the storage rethink noted under the AsyncStorage limitation below.

### 6. Contacts import (new, maybe — to confirm)
- Possibly allow importing a **contact** from the phone into a note (e.g. attach a person's name/phone
  to a note). Still tentative — validate it against the low-learning-curve filter (#3) before building.
- This means the app must be able to **request permission** to access Contacts, and handle denial.
- Candidate module: `expo-contacts`. Open question: what exactly gets stored — plain text of the
  selected fields (name/phone/email) inserted into the note, or a structured contact reference? Decide
  when the feature is actually scheduled.

### 7. Background template gallery (free + paid)
- An **in-app gallery of background templates** the user can apply as the background of an individual note
  (extends the per-note customization already flagged as missing under #3).
- Monetization: **some templates free, some paid**. This introduces in-app purchases as a new concern —
  candidate: RevenueCat (or `expo-in-app-purchases`); needs App Store / Play Store billing setup and a way
  to track which templates a user has unlocked.
- Template source: free templates from the internet (specific sites TBD).
  - **Licensing risk — flag before shipping:** "free to download" does **not** mean "free to resell or put
    behind a paywall". Many free-template licenses forbid redistribution or commercial resale. Before
    charging for any template, confirm each source's license permits redistribution and paid use, and keep
    a record of the source + license per template. This is a blocker for the paid tier, not a detail.
  - **Free tier only** (do **not** put behind the paywall): Unsplash, Pexels, Pixabay — all three forbid
    selling unmodified copies, so they're fine for free templates but not the paid tier.
  - **Usable even in the paid version (fully free / CC0 sources):**
    - Museum open-access collections — **Met Museum**, **Smithsonian Open Access**, **Art Institute of
      Chicago**, **Rijksmuseum**, **NYPL**: lots of artworks, patterns, and textures that turn into nice
      backgrounds.
    - Genuine **CC0** pattern/texture collections (verify each item is actually marked CC0).
    - CC0 waives all rights, so these can be modified, redistributed, and sold — the two safest sources
      for the paid tier alongside original/commissioned designs.

## Tech stack (decisions and why)

- **Expo (managed workflow)** — the fastest path from zero to an installed app on a physical Android (Expo Go,
  QR code, no Android Studio/Xcode setup). EAS Build later for a real APK/AAB when needed.
- **TypeScript** — the default in the new Expo template, useful for a typed model of folders/notes.
- **expo-router** (file-based routing) — the standard in the current Expo starter template; it also brings in
  React Navigation under the hood. Route structure: `src/app/index.tsx` (folders),
  `src/app/folder/[id].tsx`, `src/app/note/[id].tsx`.
- **Expo SDK 54** (deliberately, not the newest) — `create-expo-app` initially scaffolded SDK 57, but
  the author's installed Expo Go on the phone (v54.0.8) only supports SDK 54 — at that moment the Play Store
  did not yet have the latest Expo Go version aligned with SDK 57 ("Project is incompatible with this
  version of Expo Go"). The project was downgraded to `expo@~54.0.0` and all dependencies aligned via
  `npx expo install --fix`. If Expo Go is later updated to a newer version, the SDK can be raised again
  via the same `expo install` procedure.
- **Local storage: AsyncStorage** (temporary, for skeleton speed) — folders and notes are stored
  as JSON arrays under two keys (`memo.folders`, `memo.notes`). No backend, no synchronization
  between devices for now — everything lives only on that one phone.
  - **Known limitation / next step:** this model does not scale well once the number of notes grows
    significantly (each save overwrites the entire array) and does not support relational queries. Replacement
    candidate: **SQLite** (`expo-sqlite`) with real `folders`/`notes` tables and an FK relation — to consider before
    adding the calendar or any more complex feature that needs queries (e.g. search, filtering).
- **Autosave in the note editor** — 500ms debounce over `title`+`content` together (not per field), plus
  a **flush on leaving the screen** (unmount) that immediately saves the latest state instead of dropping it if the
  timer hasn't fired yet. If the editor screen is later extended with more async logic, make sure the
  debounce stays "the whole object of the latest state", not per-field pending calls — a shared timer
  that drops the older of two rapid successive calls is a known bug pattern to avoid.
- **Backend/database for sync** — not decided yet, not needed for the skeleton. When/if the app gains
  synchronization between devices or multiple users, consider Node/Express + PostgreSQL or
  Firebase/Supabase (discussed in conversation, not committed).
- **Device permissions (gallery, contacts)** — needed for requirements #5 and #6. Expo modules
  (`expo-image-picker`, `expo-contacts`) handle the runtime permission prompt, but both platforms also
  require **usage-description strings** declared in app config (`app.json` plugin config → iOS
  `NSPhotoLibraryUsageDescription` / `NSContactsUsageDescription`, Android permissions). Request each
  permission **at the point of use** (when the user taps "add photo"/"import contact"), never on launch,
  and always handle denial. Confirm exact module APIs against the SDK 54 docs before implementing.
- **Attachments storage** — images (and any future attachments) should be copied into app storage via
  `expo-file-system` with only the file path stored on the note; the JSON in AsyncStorage stays small.
  Bundled background templates ship as app assets; downloaded/paid ones would be cached to the filesystem.
- **Monetization (paid templates)** — in-app purchases via RevenueCat or `expo-in-app-purchases`. Requires
  store billing setup (App Store / Play Store) and persisting which templates the user has unlocked. Note:
  IAP generally can't be fully tested in Expo Go — likely needs a development build (EAS Build). Deferred
  until the template gallery is actually scheduled; see the licensing risk under requirement #7.

## Image asset optimization (compression)

Raw phone/stock photos are huge (1–15 MB each) and must **not** be bundled as-is —
they bloat the app and slow it down. Every new background template (or any bundled
image) goes through compression first.

**Tool used:** Python + [Pillow](https://python-pillow.org/). Install once with
`python -m pip install --user Pillow`. Reusable script committed at
[`scripts/compress-images.py`](scripts/compress-images.py) — works on any folder, so
it's handy for other projects too.

**Recipe (defaults chosen for phone backgrounds):**

```
python scripts/compress-images.py <folder> --max 1600 --quality 80          # -> <folder>/compressed
python scripts/compress-images.py <folder> --max 1600 --quality 80 --inplace # overwrite in place
```

What the script does per image, and why each step matters:
- **Respect EXIF orientation** — so rotated phone photos don't come out sideways.
- **Downscale longest side to `--max` (1600px), never upscale** — 1600px is plenty
  for a full-screen phone background; anything larger just wastes bytes. Cap at 1920
  if you want extra headroom for high-DPI; above that is waste.
- **Re-encode JPEG at `--quality` 80, `optimize` + `progressive`** — q80 is the
  standard "visually lossless enough" sweet spot for photos.
- **Strip EXIF/GPS metadata** — smaller files and better privacy.

**Real result on the 4 test templates:** 31 MB → ~0.68 MB total (−98%).

**Workflow rule:** keep the original full-res file *outside* the repo (e.g. in
Downloads or a separate source folder); only the compressed version goes into
`assets/`. Run the script, eyeball the output, then commit the small files.

### Format: JPEG now, WebP/AVIF later
- **For these bundled test assets: keep JPEG.** They're already tiny (60–230 KB) and
  JPEG is universally supported everywhere with zero friction.
- **Switch to WebP (or AVIF) when it actually pays off:** once the template library
  grows large, or templates are **delivered over the network** (e.g. the paid tier
  downloading them). WebP is ~25–35% smaller than JPEG at the same quality; over the
  wire that saving is real bandwidth/egress. React Native/Expo supports WebP on
  Android and iOS 14+. Revisit as part of the network-delivery decision (see #7), and
  quantify the egress saving before committing to a pipeline.

### Git handling of image assets
- **Commit the compressed `assets/templates/` images.** They're part of the app —
  the build needs them — and at ~200 KB they don't bloat the repo. There is nothing
  to `.gitignore` here.
- **Never commit the multi-MB originals.** They stay outside the repo; if we ever
  keep a master source set, store it elsewhere (cloud/design folder), not in git.
- **If the library ever gets large or templates move to network delivery**, stop
  bundling them entirely: host on cloud storage/CDN and download at runtime — at
  which point the repo holds none of them. (Ties into the storage-cost check before
  any recurring-download feature.)

## Project structure (current)

```
Memo/
  src/
    app/
      _layout.tsx        # root Stack + NotesStoreProvider
      index.tsx           # folder list (grid, colors, + new category)
      folder/[id].tsx      # note list in a folder, + new note, move/delete
      note/[id].tsx        # editor (title + content), autosave, move, delete
    hooks/
      use-notes-store.tsx  # React Context: CRUD for folders/notes + persistence
    lib/
      types.ts             # Folder, Note types
      storage.ts            # AsyncStorage read/write helpers
    components/
      themed-text.tsx, themed-view.tsx   # from the starter template, kept for light/dark theming
    constants/theme.ts       # colors, spacing, from the starter template
  Plan.md                    # this file
```

## Next steps (for the next session)

1. Test the skeleton on the author's Android phone (Expo Go).
2. Decide on the real app name (currently "Memo" is a placeholder).
3. Develop note customization (color/background per note, not just per folder).
4. Add photos from the gallery (#5): `expo-image-picker` + permission flow + copy files into app storage.
5. Build the background template gallery (#7), starting with free bundled templates; wire up the
   free/paid split and IAP later (see monetization + licensing notes).
6. Confirm/scope contacts import (#6) against the low-learning-curve filter before building it.
7. Before charging for any template, verify the source license permits redistribution + paid use, and
   record source + license per template.
8. Consider migrating from AsyncStorage to SQLite before the number of notes/folders grows significantly
   (also more relevant now that notes carry image/attachment references).
9. Calendar integration (deliberately deferred, not to be done before the points above).
