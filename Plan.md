# Memo — User Requirements Specification (URS)

**Document type:** User Requirements Specification, doubling as the project's living
design journal (solo-developer project — one document instead of a spec + a wiki + a
changelog kept separately).
**Working product name:** Memo (temporary — see §1.5)
**Last updated:** 2026-08-15

---

## 1. Introduction

### 1.1 Purpose
Specifies what Memo must do (§3 functional requirements, §4 non-functional
requirements), the reasoning behind how it's built (§7), a running log of decisions
made along the way (§6), known issues (§8), how local data storage/distribution/
updates actually work (§12), and where the project currently stands
(§11 revision history) and is headed (§9 roadmap).

### 1.2 Product overview
A replacement for the Redmi/Android "Notes" app — a notebook with **categories as
folders**, in which the user creates, edits, and moves notes. Goal: useful to a broad
range of everyday users, not just the author.

### 1.3 Readership
Written for the project's own future reference (solo developer), and for any AI
coding assistant picking up work on this repo later — hence the inline rationale next
to most decisions, not just the decision itself.

### 1.4 Definitions & abbreviations
- **Folder** — a user-created category that contains notes (labelled "category" in
  the UI).
- **Note** — a single piece of content, optionally inside a folder ("unsorted" if
  not).
- **Template type** — the structural format a note uses: Checklist, Daily schedule,
  Calculation, or Kanban board (REQ-08).
- **Skeleton** — the first navigable, minimal build (folders → notes → editor),
  created 2026-08-13.
- **REQ-xx** — a functional requirement, §3.
- **NFR-xx** — a non-functional requirement, §4.
- **D-xx** — a decision log entry, §6.
- **Phase A/B/C** — the three-stage implementation roadmap, §9.

### 1.5 Naming
> Working name of the app: **Memo**. This is intentionally temporary, a generic name
> until a better one is found — the app name lives in two places (`package.json` →
> `name`, `app.json` → `expo.name`/`expo.slug`/`expo.scheme`) and is easy to change
> later. Rejected names: "Notea" (an AI note-taker app already exists on Apple),
> "Notendo" (collision with an existing small app + phonetic similarity to
> "Nintendo" — trademark risk).

## 2. Overall Description

### 2.1 Product perspective
Today Memo is a **fully local, single-device app** — no backend, no account, no
synchronization; everything lives on the one phone it's installed on. That changes
with REQ-15/Phase C, which turns it into a client-server app with a real account and
cloud data sync. Until then, every other requirement below is designed to work
entirely offline.

### 2.2 User characteristics / target audience
Useful to a large number of everyday users, not just the author. Design decisions
favor that audience — simplicity over complexity — rather than early niche or
power-user choices. (Formalized as NFR-02.)

### 2.3 Guiding design principle
**Low learning curve is a priority over power-user features.** Every new feature is
checked against this filter before being added. (Formalized as NFR-01.) This has
already driven concrete calls elsewhere in this document — e.g. picking swipe-to-move
over full drag-and-drop for the Kanban template (D-05), and locale-based country
detection over a location-permission prompt for public holidays (REQ-16).

### 2.4 Constraints
- **Platform:** Android, tested via Expo Go on the author's phone; Expo SDK 54
  deliberately pinned (§7).
- **Expo Go boundary:** several native-module features (on-device speech
  recognition, in-app purchases) cannot run in Expo Go and need a switch to an EAS
  development build — a real workflow change, not yet made (NFR-07, D-03).
- **No backend today.** The app is 100% local until Phase C (REQ-15).

### 2.5 Assumptions & dependencies
- `expo-router` for navigation (brings in React Navigation underneath).
- Reliance on various Expo SDK modules as features are built (`expo-image-picker`,
  `expo-contacts`, `expo-sqlite`, `expo-notifications`, `expo-localization`,
  `expo-secure-store`, `expo-location`) — exact APIs to be confirmed against the SDK
  54 docs immediately before each is implemented, not assumed in advance.

## 3. Functional Requirements

Priority uses **MoSCoW** (Must / Should / Could / Won't-yet). Status reflects the
state as of 2026-08-15: **Done**, **Partially Done**, **Planned**, **Tentative**,
**Deferred**, or **Superseded**. IDs REQ-01–REQ-17 are preserved from earlier
discussion for continuity; **REQ-02** and **REQ-04** are intentionally not full
entries here — REQ-02 (originally "Calendar, deferred") is superseded by the fuller
REQ-16, and REQ-04 (originally "non-functional requirements") moved to NFR-02 where
it belongs. The numbering gaps are deliberate, not omissions.

**Status at a glance** (✅ implemented · 🔴 not implemented yet — updated 2026-08-15):

| ID | Requirement | Priority | Status |
|---|---|---|---|
| REQ-01 | Categorization (folders) | Must | ✅ Done |
| REQ-03 | Visual appearance & customization | Must | 🔴 Partially done (see bullets) |
| REQ-05 | Photos from the gallery | Should | 🔴 Planned |
| REQ-06 | Contacts import | Could | 🔴 Tentative |
| REQ-07 | Background template gallery | Should | 🔴 Partially done (see bullets) |
| REQ-08 | Note template types | Must | 🔴 Partially done (plain, checklist, daily schedule, calculation) |
| REQ-09 | Search | Must/Could | 🔴 Planned (text) / Deferred (voice) |
| REQ-10 | Dark/light mode toggle | Should | ✅ Done |
| REQ-11 | Custom photo backgrounds | Should | 🔴 Planned |
| REQ-12 | AI assistant | Could | 🔴 Deferred |
| REQ-13 | Voice-to-text dictation | Could | 🔴 Deferred |
| REQ-14 | External API integrations | Should | 🔴 Planned |
| REQ-15 | Authentication + cloud sync | Must | 🔴 Planned |
| REQ-16 | Calendar | Must | 🔴 Planned |
| REQ-17 | Alarms/notifications | Should | 🔴 Planned |

**Next up:** Phase A is done; Phase B is underway (REQ-10 shipped, REQ-08
partially shipped — plain, checklist, daily schedule, calculation). Remaining:
REQ-08's Kanban sub-type, then REQ-09/REQ-11/REQ-14/REQ-16/REQ-17.

### ✅ REQ-01 — Categorization (folders)
**Priority:** Must · **Status:** Done
- The user creates the categories ("folders") themselves.
- Within a category: creating, editing, and **moving** notes between categories.
- Implemented: creating a folder with a color, a notes list per folder, moving a
  note via long-press (or the chip in the editor) → a dialog listing the other
  folders.

### 🔴 REQ-02 — Calendar (original entry)
**Status:** Superseded by REQ-16 — see there for the full specification (color-coded
dates, per-date notes, note-to-calendar linking, public holidays). Originally listed
here as explicitly deferred ("not to be done now"); un-deferred 2026-08-15.

### 🔴 REQ-03 — Visual appearance & customization
**Priority:** Must · **Status:** Partially Done
- Must look modern.
- Every folder and every note within it should be **customizable**: colors and
  background "templates".
  - ✅ Folder: color choice from a preset palette (16 tones, cards in a grid, color
    = card background).
  - ✅ **Done (2026-08-14):** per-note background — pastel solid color **or** a
    template image — plus auto-contrasting text color. The chosen background is
    also mirrored on the note's preview card in the folder list.
  - 🔴 Still missing: a richer "template" system beyond a flat image — see REQ-08
    (structural note templates) and REQ-11 (user's own gallery photo as a
    background), which extend this further.
- Simple to use, a **low learning curve** for new users — see §2.3/NFR-01.

### 🔴 REQ-05 — Photos from the gallery
**Priority:** Should · **Status:** Planned (Phase B)
- The user can add photos to a note **from the phone's photo gallery**.
- Requires **runtime permission** to access the device's photo library, with
  graceful denial handling (don't crash or block the note).
- Candidate module: `expo-image-picker` (pick one/more images) — request permission
  at the point of use, not on app launch. If the whole library needs reading, or
  saving back to it, `expo-media-library`.
- Data-model impact: a picked image is a file URI. **Copy the file into app storage**
  (`expo-file-system`) and store only the reference/path on the note, not the image
  bytes in local storage.

### 🔴 REQ-06 — Contacts import
**Priority:** Could · **Status:** Tentative
- Possibly allow importing a **contact** from the phone into a note (e.g. attach a
  person's name/phone to a note). Still tentative — validate against the
  low-learning-curve filter (§2.3) before building.
- Requires **runtime permission** to access Contacts, with denial handling.
- Candidate module: `expo-contacts`. Open question: store plain text of the selected
  fields (name/phone/email) inserted into the note, or a structured contact
  reference? Decide when actually scheduled.

### 🔴 REQ-07 — Background template gallery (free + paid)
**Priority:** Should · **Status:** Partially Done
- An **in-app gallery of background templates** the user can apply as a note
  background (extends REQ-03).
  - ✅ **Done (2026-08-14):** applying a bundled template image (or a pastel color)
    as a note background. 🔴 Still to do: the free/paid split and purchase flow
    below.
- **Monetization:** some templates free, some paid — introduces in-app purchases.
  Candidate: RevenueCat (or `expo-in-app-purchases`); needs store billing setup
  (App Store / Play Store) and tracking which templates a user has unlocked.
- **Template sourcing (specific sites TBD):**
  - **Licensing risk — blocks the paid tier, not a detail:** "free to download"
    does **not** mean "free to resell or paywall." Confirm each source's license
    permits redistribution and paid use before charging for any template, and
    record source + license per template.
  - **Free tier only** (never behind the paywall): Unsplash, Pexels, Pixabay — all
    three forbid selling unmodified copies.
  - **Usable in the paid tier too** (fully free / CC0): museum open-access
    collections (Met Museum, Smithsonian Open Access, Art Institute of Chicago,
    Rijksmuseum, NYPL) and genuine CC0 pattern/texture collections (verify each
    item is actually marked CC0) — CC0 waives all rights, so these can be
    modified, redistributed, and sold.

### 🔴 REQ-08 — Note template types
**Priority:** Must · **Status:** Partially Done (Phase B) — plain, checklist,
daily schedule, and calculation shipped 2026-08-15; Kanban not yet built.

Each note picks a **template type** governing how its content is structured and
rendered (chosen at creation; changing it later triggers a best-effort content
conversion — D-01).

- ✅ **Plain text** — today's original single free-text field, kept as its own
  explicit type (not forced into checklists) precisely so nothing is lost for
  notes that predate template types, and so "just write something" stays an
  option going forward — see D-10.
- ✅ **Checklist (default for new notes)** — a list of items, each with its own
  checkbox; checking it strikes through that item's text. Implemented: new
  `checklist_items` SQLite table (FK to `notes`, `ON DELETE CASCADE`), a "Type"
  chip in the note editor, add/edit/toggle/remove item rows, all autosaved on
  the same 500ms debounce as title/content. New notes default to this type;
  notes that existed before this shipped keep their original `plain` type
  unless the user switches them. **Type picker is an inline panel, not
  `Alert.alert`** — Android's `Alert.alert` only reliably renders ~3 buttons,
  which silently dropped the "Calculation" option once there were 4 template
  types + Cancel (5 buttons); switched to the same in-editor panel pattern
  already used for the 🎨 background/text-color picker, with its own ✕ to
  dismiss without picking anything.
- ✅ **Daily schedule** — rows pre-seeded hourly from 05:00 to 22:00, each with a
  checkbox + an editable free-text label. The hour value is editable, rows can be
  added/deleted freely, and 05–22 is just a starting default. Implemented as the
  checklist template with an extra editable "time" field per item — same
  `checklist_items` table (now with a `time` column), same row UI plus a time
  `TextInput` per row. Reached only via the "Type" chip (new notes still
  default to checklist, not daily schedule); switching from/to plain or
  checklist runs a best-effort conversion (merge existing items into the
  hourly skeleton, or drop the time label going the other way — see D-01).
  Still to build: REQ-17 (alarms) and, via D-08, REQ-16 (calendar) linking,
  which both consume this template type once they're scheduled.
- ✅ **Calculation** (internal id `'calculation'`; UI label **"Sum / Costs"** —
  renamed 2026-08-15 since "Calculation" tested as too generic for what the
  template actually does) — free rows of (description, amount), a ruled line,
  and a total row below it auto-summing every amount above. New `calculation_rows`
  SQLite table (same shape/pattern as `checklist_items`: FK to `notes`,
  `ON DELETE CASCADE`, delete-all-then-reinsert-in-order on every save).
  Amount is stored and edited as free text, not a number — parsed leniently
  only at sum time (`src/lib/calculation.ts`, shared by the editor's live
  total and the list preview): a locale decimal comma is treated as a point,
  negative numbers work via a leading "-", and anything that still doesn't
  parse contributes 0 instead of crashing the total, so a row mid-edit never
  breaks the display. **Scope simplification (resolves the operator question
  left open since this requirement was first drafted, see D-11):** the "+"
  is a fixed label next to the total, not a switchable −/×/÷ control —
  "auto-sums every number above" is the actual described behavior, and
  multiplying/dividing a whole column of rows together isn't a coherent
  single operation the way addition is. Reached only via the "Type" chip
  (new notes still default to checklist); converting to/from calculation
  combines each row's description and amount into one line for line-based
  types, and splits lines back into description-only rows the other way
  (an amount typed as free text can't be reliably recovered from a
  formatted line — best-effort, not lossless, per D-01).
- **Kanban board** — three horizontally-scrollable columns (Backlog / In Process /
  Done); the interaction for moving a task between columns is **swipe left/right**
  on the card — see D-05 for the alternatives considered and why.
- **Data model impact:** `Note` needs a `templateType` field plus per-type
  structured content (item arrays) — the largest schema change so far, and the
  main forcing function for the SQLite migration (Phase A, §9).

### 🔴 REQ-09 — Search
**Priority:** Must (text) / Could (voice) · **Status:** Planned (Phase B, text) /
Deferred (voice — D-03)
- A persistent search input **pinned at the bottom** of: the homepage, each folder
  screen, and inside each open note.
- Homepage/folder search: results listed **in the order found**; tapping one opens
  that note directly. Results stay visible until the field is cleared (✕ button).
- In-note search: every match **highlighted**, view **auto-scrolls to the first
  match**, user scrolls manually for the rest.
- **Voice search** (deferred, D-03): a mic button next to the field — tap to
  listen, speak a term, it's transcribed into the field, search runs automatically,
  mic turns itself off. Requires microphone permission and an on-device speech
  recognition module, which generally does not run in Expo Go (NFR-07).
- Search scope depends on REQ-08: once notes have structured content instead of one
  string, search needs to look inside that structure — another reason this follows
  the template system, not precedes it.

### ✅ REQ-10 — Dark mode / light mode toggle
**Priority:** Should · **Status:** Done (2026-08-15, parts 4–5)
- A manual picker on the homepage header: **☀️ and 🌙 icons both always
  visible**, side by side. The currently-active mode's icon is full opacity,
  the other is dimmed (35% opacity) — so the current mode is visible at a
  glance, not just after tapping. Tapping either icon sets that mode directly
  (not a flip/toggle).
- **First launch:** defaults to the phone's current system theme.
- After that, the user's explicit choice **overrides and persists** (SQLite
  `meta` table) until changed again — stops following system theme changes once
  picked manually.
- **Implementation:** new `src/hooks/use-theme-preference.tsx`
  (`ThemePreferenceProvider`/`useThemePreference()`, exposing `scheme` and
  `setScheme(value)`) is the single source of truth for the resolved scheme;
  `use-theme.ts` and `_layout.tsx`'s React Navigation `ThemeProvider` both read
  from it now instead of calling `useColorScheme()` directly, so screen content
  and navigation chrome (headers/backgrounds) never disagree. Persistence via
  two new `storage.ts` functions (`getThemeOverride`/`setThemeOverride`),
  reusing the `meta` table from Phase A rather than adding a new AsyncStorage
  key.
- **Also fixed while shipping this:** the three "add" ghost tiles' hardcoded
  near-black fill (§8's workaround) was dark-mode-only — switching to light mode
  would have put black text on a permanently near-black tile. Now
  scheme-conditional: hardcoded fill only in dark mode (where it's confirmed
  necessary), the real `theme.backgroundElement` in light mode.
- **Confirmed the §8 Force Dark bug while testing this** (see §8, "CONFIRMED
  2026-08-15") — the toggle initially looked non-functional (app stayed dark
  regardless of selection) until MIUI's per-app dark-mode override for Expo Go
  was disabled, which fixed it. Not a bug in this feature; a device/OS setting.

### 🔴 REQ-11 — Custom photo backgrounds per note
**Priority:** Should · **Status:** Planned (Phase B)
- Extends REQ-03/REQ-07: besides pastel colors and bundled templates, a photo from
  the user's own gallery can be set as a note's background.
- Reuses existing planned work rather than a new pipeline: the gallery-permission
  flow from REQ-05, and the copy-into-app-storage pattern from §7's "Attachments
  storage" note.
- **Storage:** saved via the SQLite migration (Phase A) — per-note photo references
  are exactly the relational data AsyncStorage handles badly, and this is the first
  concrete forcing function for doing that migration now rather than later.

### 🔴 REQ-12 — AI assistant (ChatGPT-based)
**Priority:** Could · **Status:** Deferred (D-04)
- Requested: connect to "free ChatGPT" to assist with something — search, or
  answering typed/voice questions. Exact use case still open.
- **Flag:** there is no public "free ChatGPT" API. OpenAI's API (the one usable
  from an app) is metered/pay-per-token, not free, though light personal use is
  typically fractions of a cent to a few cents per question. The ChatGPT consumer
  app has no official API at all.
- Voice **input** to the assistant shares REQ-09/REQ-13's speech-recognition
  feasibility blocker.

### 🔴 REQ-13 — Voice-to-text dictation inside a note
**Priority:** Could · **Status:** Deferred (D-03)
- A mic button inside an open note: tap, dictate, transcribed speech is appended
  as text/bullet items.
- Same feasibility blocker as REQ-09 — needs on-device or cloud speech-to-text,
  very likely requiring a development build instead of Expo Go.
- Natural fit with the checklist template (REQ-08): dictated lines become checklist
  items directly.

### 🔴 REQ-14 — External API integrations
**Priority:** Should · **Status:** Planned (exploratory/learning goal)
- Stated goal is partly to practice wiring up external APIs from React Native, not
  only to ship a specific feature.
- Candidate categories: weather/temperature for a location, local events for a
  given day, currency exchange rates, free news headlines.
- Candidate free APIs (none committed): **Open-Meteo** (weather, no key needed),
  **Frankfurter** or exchangerate.host (currency, free), a news API (check the free
  tier's production/commercial-use restrictions first), events (genuinely free
  event APIs are rare — Ticketmaster/Eventbrite mostly gate behind a developer
  key; confirm a free option before committing). See also REQ-16's public-holidays
  API (Nager.Date), which is effectively another entry in this list.
- Weather/events need a location permission flow (`expo-location`), same
  permission-at-point-of-use pattern as REQ-05/REQ-06.

### 🔴 REQ-15 — Authentication + account recovery (cloud data sync)
**Priority:** Must (per D-06) · **Status:** Planned (Phase C — biggest architectural
change in this document)
- Username + password, set once at first launch; no repeated login prompts after —
  the session persists on the device.
- The account must be **recoverable on a new phone**: reinstall, log in with the
  same username/password, get the account back — including the actual data (D-06).
- **What this requires:** turns Memo from a fully local app into a client-server
  app with real user data on a server. Concretely:
  - A backend with auth + a database. Candidates: **Supabase** (Postgres +
    built-in auth — pairs with the Postgres option in §7) or **Firebase** (Auth +
    Firestore) — not yet chosen between the two.
  - Passwords **hashed server-side** (bcrypt/argon2) — never store a plaintext
    password on-device, only ever send it over HTTPS.
  - The persisted session is a **token** issued by the backend after login, stored
    via `expo-secure-store` (OS-level encrypted storage) — not AsyncStorage, which
    is unencrypted and unsuitable for a credential.
  - A sync strategy: what syncs, conflict resolution if the same account is open on
    two phones at once, and offline behavior — a real distributed-systems problem,
    expect its own scoping pass once the backend is picked.
  - **Privacy/legal:** once real personal data is held on a server, standard
    practice is a privacy policy, and — given this app's own goal of eventually
    serving many everyday users — GDPR considerations (author is EU-based) around
    account deletion and data export. Worth being aware of now, not just before a
    public launch.
- **Lighter alternative on record, not chosen (D-06):** a manual "export account"
  flow — a password-protected backup file the user saves themselves and imports on
  the new phone. No server to run, but the user manages the file by hand.

### 🔴 REQ-16 — Calendar
**Priority:** Must · **Status:** Planned (Phase B)
- Color-coded dates, per-date notes, note-to-calendar linking, and public holidays.
- The user assigns **one or more color tags** to a date (D-07) — e.g. morning
  shift, afternoon shift, birthday, vacation — and can attach bullet-point notes to
  that date.
- **Storage:** a `calendar_entries` SQLite table (date, color/tag, note text,
  optional `noteId` foreign key), not literal "one JSON file per month" — a flat
  monthly file would reintroduce the AsyncStorage whole-file-overwrite problem
  (changing one date's color rewrites the entire month). The month-grouped *view*
  in the UI comes from querying this table, not from how it's stored. This is the
  **third** requirement (after REQ-08, REQ-11) whose real need is "get off
  AsyncStorage" — see Phase A, §9.
- **Linking notes to the calendar:** when a note has a date field, the app asks
  "Add to calendar?" — on confirm, creates a calendar entry referencing that note
  (`noteId`), so the calendar shows a marker on that date and tapping it opens the
  note directly.
- **Color model (D-07):** a date can carry more than one tag at once. Data model
  needs a `date ↔ tag` join, not a single color field; the day cell renders small
  stacked dots (one per active tag) rather than a single fill, so the grid stays
  legible with multiple tags. Confirm the dot glyph/size against a real small phone
  screen, designing for the crowded (3+ tags) case first.
- **Public holidays (sub-requirement):** the calendar shows the user's country's
  public/state holidays automatically.
  - **Detect the country from the phone's locale/region setting, not GPS.**
    `expo-localization`'s region code (e.g. `Localization.getLocales()[0].regionCode`
    → `"HR"`) is available instantly, offline, **with no permission prompt** — this
    is the direct answer to "what if location isn't enabled": the feature doesn't
    need location at all. GPS is a heavier ask than the job needs — a
    privacy-sensitive permission the user can deny, costing time/battery for a fix,
    returning far more precision than "which country" requires.
  - **Always pair auto-detection with a manual override** in Settings ("Holiday
    country: Croatia ▾") — locale doesn't always match where someone actually
    lives. Same "detect a sensible default, let the user correct it" pattern as
    REQ-10's theme default.
  - **Data source: [Nager.Date](https://date.nager.at)** — free, no API key,
    public holidays by country + year
    (`GET /api/v3/publicholidays/{year}/{countryCode}`), good global coverage
    including Croatia. Effectively another REQ-14 entry, not a separate
    integration effort.
  - **Cache the response** in the SQLite store rather than re-fetching on every
    calendar open — a given (country, year) pair's holidays never change once
    published; refetch only on year rollover or a country change.
  - **Deliberately out of scope for v1:** "holidays of the country I'm physically
    in right now" (useful while traveling) would need real GPS + reverse
    geocoding — solves a rare case with real added complexity for something the
    common case doesn't need. Revisit only if that specific use case is actually
    requested.

### 🔴 REQ-17 — Alarms/notifications from the daily-schedule template
**Priority:** Should · **Status:** Planned (Phase B)
- Extends REQ-08's daily-schedule template: each hour row gets an optional alarm
  toggle; when it fires, a local notification shows the text written for that hour.
- **Flow (D-08):**
  - Default: fires **once**, tied to that specific note's date.
  - **At the moment the alarm is turned on**, the app asks whether to make it
    **repeat every day**. If yes, it becomes a daily recurring alarm — and that
    recurrence **also creates a calendar entry (REQ-16) for every day it fires**,
    so the routine is visible on the calendar, not just a silent background timer.
  - A **dedicated "Alarms" screen** lists every alarm the app controls (one-time
    and recurring), with time/text/source note, letting the user turn any off from
    one place — necessary once recurring alarms exist.
  - **Data model:** an alarm is its own entity — `time`, `text`, `repeat` (`once` |
    `daily`), `sourceNoteId`, and (when recurring) a link to the calendar entries
    it generates, so turning it off can also stop generating those.
- Candidate module: `expo-notifications`, **local** scheduled notifications (not
  push — no backend involvement, doesn't depend on REQ-15). Needs the standard
  runtime permission request at point of use.
- **Feasibility — better than the voice items:** local scheduled notifications are
  generally expected to keep working in Expo Go (only *remote/push* notifications
  were dropped from Expo Go in recent SDKs) — confirm against the SDK 54 docs
  before relying on it.

## 4. Non-Functional Requirements

### NFR-01 — Usability / low learning curve
Simple to use is a priority over power-user features, for every feature, always
checked before adding anything new. See §2.3.

### NFR-02 — Target audience breadth
Useful to a large number of everyday users, not just the author — design with that
audience in mind (simplicity > complexity); avoid niche/power-user decisions too
early. (Originally listed as REQ-04.)

### ✅ NFR-03 — Performance & storage scalability
**Fixed 2026-08-15 (Phase A):** AsyncStorage (whole-array JSON under two keys) did
not scale once note/folder counts grew — each save overwrote the entire array, no
relational queries. Migrated to **SQLite** (`expo-sqlite`) with real `folders`/
`notes` tables and an `ON DELETE CASCADE` foreign key; every mutation now writes
only the one row that changed. REQ-08, REQ-11, and REQ-16 depended on this and can
now proceed — see §9 and §11.

### 🔴 NFR-04 — Security & privacy
- Passwords hashed server-side (bcrypt/argon2) once REQ-15 exists; never a
  plaintext password on-device.
- Session tokens in `expo-secure-store`, never AsyncStorage.
- Once real accounts hold personal data, standard practice is a privacy policy and
  GDPR-aware account deletion/export (author is EU-based) — see REQ-15.

### 🔴 NFR-05 — Licensing (background templates)
"Free to download" does not mean "free to resell." Confirm each template source's
license permits redistribution and paid use before charging for it, and record
source + license per template — see REQ-07.

### ✅ NFR-06 — Localization
App language is English. All user-facing strings are English (hardcoded — no i18n
library yet). If multiple languages are ever needed, switch to a real i18n setup
(e.g. i18next + `expo-localization`) rather than hardcoded strings.

### NFR-07 — Platform / build constraints
Expo Go cannot run certain native-module classes (on-device speech recognition, IAP)
— these need an EAS development build instead, a deliberate one-time workflow
switch not yet made (see D-03, and REQ-07's IAP note). Local scheduled notifications
(REQ-17) are the exception — expected to keep working in Expo Go.

### ✅ NFR-08 — Asset optimization discipline
Every bundled image (background templates, any future bundled asset) must go
through the compression pipeline (§7) before being committed — raw phone/stock
photos are 1–15 MB and must never be bundled as-is.

## 5. Assumptions & General Constraints

- No backend exists until Phase C (REQ-15) — every other requirement is designed to
  work fully offline until then.
- Development and testing happen on the author's Android phone via Expo Go; iOS is
  not currently tested.
- Expo SDK version is pinned to what the installed Expo Go build supports (§7), not
  necessarily the newest SDK.

## 6. Decision Log

Each entry: what was decided, and why — the "why" is what lets future work judge
edge cases the decision didn't explicitly cover.

**D-01 — Template type switching (REQ-08): best-effort conversion.** Changing a
note's template type tries to carry existing content into the new shape (e.g. text
lines → checklist items) rather than clearing it or locking the type. Define one
conversion function per (from-type, to-type) pair, with a clear fallback (e.g. dump
unconvertible content as a single trailing item) so this never silently drops data.

**D-02 — Kanban drag-and-drop: reconsidered.** Full drag-and-drop was initially
chosen for REQ-08's Kanban board, explicitly reopening the earlier "too risky, use
long-press instead" call made for folder/note organization (see the 2026-08-15
"Unsorted notes" entry in §11). After flagging the real complexity/risk of full
cross-column drag gestures on mobile, this was superseded by D-05.

**D-03 — Voice features (REQ-09/REQ-12/REQ-13): deferred, all three together.**
Voice search, AI voice input, and in-note dictation stay in the backlog until
there's enough other native-module work to justify the one-time switch from Expo Go
to an EAS development build (NFR-07). Don't start any of the three individually
before that switch — they share the same blocker.

**D-04 — AI assistant (REQ-12): deferred entirely.** Recorded as an idea, not
scheduled. If revisited: needs a decision on which API (OpenAI's paid-per-token API
is the realistic option, not a free ChatGPT API), who pays for usage, and a
concrete first use case (in-app search vs. Q&A).

**D-05 — Kanban interaction model (REQ-08): swipe left/right on the card.**
Alternatives considered, all avoiding full cross-column drag-and-drop (which risks
drop-zone detection while a column is also scroll-panning, autoscroll near screen
edges, and touch conflicting with the board's own horizontal scroll):
  - *Inline column chips on each card* — tappable labels for the other two columns
    directly on the card. Lowest learning curve, dropped in favor of the chosen
    option to keep one interaction model rather than layering two.
  - *Swipe left/right* (**chosen**) — swipe right advances a task, swipe left sends
    it back; single-axis gesture via `Swipeable` from `react-native-gesture-handler`
    (already a dependency), a well-trodden RN pattern.
  - *Tap → "Move to" menu* — reuses the existing "Move to folder" pattern exactly;
    lowest implementation risk, but felt least "drag-y." Dropped.

**D-06 — Auth data scope (REQ-15): real backend + data sync, chosen deliberately as
the bigger option.** Reinstalling on a new phone and logging in must bring back the
actual notes/folders/calendar, not just confirm the account exists. This commits the
project to the full architecture under REQ-15: backend + database (Supabase or
Firebase, not yet picked), hashed passwords, a secure token via `expo-secure-store`,
and a real sync strategy. Treated as its own project phase (Phase C), not a quick
add-on — the largest single change in this document.

**D-07 — Calendar color model (REQ-16): multiple tags per date.** A date can carry
more than one color/tag at once (e.g. birthday *and* a work shift). Needs a
`date ↔ tag` join, not a single color field; the day cell renders stacked dots, one
per active tag. Confirm the dot glyph/size on a real small-screen phone, designing
for the crowded (3+ tags) case first.

**D-08 — Daily-schedule alarms (REQ-17): richer flow than a simple once/repeat
choice.** Default is a one-time alarm; at the moment the user turns it on, the app
asks whether to repeat it daily. If yes, it also generates a calendar entry (REQ-16)
for every day it fires, and a central "Alarms" screen lists/controls every alarm the
app manages (needed once recurring alarms exist, otherwise cancelling one means
hunting down which note set it).

**D-09 — Implementation sequencing: three phases, SQLite migration first.** The
2026-08-15 feature backlog (REQ-08–REQ-17) is sequenced as Phase A (SQLite
migration, shared infrastructure) → Phase B (local-only features) → Phase C (auth +
cloud sync, last). See §9 for the full rationale — agreed 2026-08-15.

**D-10 — Existing free-text notes (REQ-08): keep "Plain text" as its own
template type, not converted.** When checklist became the default template
type for new notes, the question was what happens to notes that already exist
with only a free-text paragraph. Chosen: plain text stays a first-class,
selectable template type alongside checklist/daily-schedule/calculation/kanban
— not everything has to become a checklist, matching the low-learning-curve
principle (§2.3). Existing notes keep their `plain` type unmigrated; only
*new* notes default to checklist. Rejected alternative: convert every existing
note into a one-item checklist at migration time, strictly matching the
original 4-type spec but losing the "just write something" option the app
already had. **Update (2026-08-17, part 20):** the default for *new* notes
was changed back to plain text (see §11) — this decision's actual point,
that plain stays a first-class, never-force-converted template, is unaffected
either way.

**D-11 — Calculation template (REQ-08): addition only, "+" shown as a fixed
label, not a switchable operator.** The original requirement text ("a total
row... and some math symbol (default +) that auto-sums every number above")
left open whether −/×/÷ should also be selectable. Resolved: no — the request
consistently describes a *sum*, and multiplying or dividing an entire column
of free-form rows together isn't a coherent single operation the way addition
naturally is for a running total/expense-list use case. The "+" is cosmetic,
confirming what the row already does, not a control. Revisit only if a
concrete use case for a different aggregate operation is actually requested.

**D-12 — Distribution & authentication timing: EAS Build (no auth) before Phase
C.** Discussed 2026-08-17. The app is currently local-only (no server exists at
all — see §12), so there is no shared resource for a login to protect; today's
actual security boundary is the OS app sandbox (§12.1), not a login screen.
Decided: move from Expo Go to a real distributable build via **EAS Build**
(§12.3) for real-device testing, while deliberately deferring authentication
until Phase C (D-06/D-09) actually introduces a backend. Adding auth earlier
would add real complexity (credential storage, token handling) with no
matching data to protect yet.

## 7. Technical Design & Architecture Notes

*(How the requirements above get built, and why — distinct from the requirements
themselves in §3/§4.)*

- **Expo (managed workflow)** — the fastest path from zero to an installed app on a
  physical Android (Expo Go, QR code, no Android Studio/Xcode setup). EAS Build
  later for a real APK/AAB when needed.
- **TypeScript** — the default in the new Expo template, useful for a typed model of
  folders/notes.
- **expo-router** (file-based routing) — the standard in the current Expo starter
  template; brings in React Navigation under the hood. Route structure:
  `src/app/index.tsx` (folders), `src/app/folder/[id].tsx`, `src/app/note/[id].tsx`.
- **Expo SDK 54** (deliberately, not the newest) — `create-expo-app` initially
  scaffolded SDK 57, but the author's installed Expo Go (v54.0.8) only supported SDK
  54 — the Play Store did not yet have an Expo Go version aligned with SDK 57
  ("Project is incompatible with this version of Expo Go"). Downgraded to
  `expo@~54.0.0`, dependencies aligned via `npx expo install --fix`. Raise again via
  the same procedure once Expo Go updates.
- **Local storage: AsyncStorage** (temporary, for skeleton speed) — folders and
  notes stored as JSON arrays under two keys (`memo.folders`, `memo.notes`). No
  backend, no cross-device sync for now.
  - **Known limitation, addressed by Phase A (§9):** doesn't scale once note counts
    grow (each save overwrites the entire array), no relational queries. Replacement:
    **SQLite** (`expo-sqlite`) with real `folders`/`notes` tables and FK relations.
- **Autosave in the note editor** — 500ms debounce over `title`+`content` together
  (not per field), plus a **flush on leaving the screen** (unmount) that immediately
  saves the latest state instead of dropping it if the timer hasn't fired. If the
  editor gains more async logic, keep the debounce as "the whole object of the
  latest state," not per-field pending calls — a shared timer that drops the older
  of two rapid successive calls is a known bug pattern to avoid.
- **Backend/database for sync (REQ-15)** — Node/Express + PostgreSQL, or
  Firebase/Supabase; not committed (D-06 fixed the *scope*, not yet the specific
  backend).
- **Device permissions (gallery, contacts, etc.)** — Expo modules
  (`expo-image-picker`, `expo-contacts`, …) handle the runtime permission prompt,
  but both platforms also need **usage-description strings** in app config
  (`app.json` → iOS `NSPhotoLibraryUsageDescription` / `NSContactsUsageDescription`,
  Android permissions). Request each permission **at the point of use**, never on
  launch, and always handle denial. Confirm exact module APIs against the SDK 54
  docs before implementing.
- **Attachments storage** — images (and future attachments) copied into app storage
  via `expo-file-system`, only the file path stored on the note. Bundled background
  templates ship as app assets; downloaded/paid ones cache to the filesystem.
- **Monetization (paid templates)** — IAP via RevenueCat or
  `expo-in-app-purchases`. Needs store billing setup and persisting unlocked
  templates. IAP generally can't be fully tested in Expo Go — likely needs a
  development build. Deferred until REQ-07's template gallery is scheduled.
- **Python for auxiliary scripts** — extends the precedent set by
  `scripts/compress-images.py`: future non-runtime tooling (AI data prep, one-off
  scripts around REQ-14's external APIs, etc.) defaults to Python rather than a
  Node script. The app itself stays TypeScript/React Native — Python is only for
  scripts that run outside the app.

### Image asset optimization (compression)
Raw phone/stock photos are huge (1–15 MB each) and must **not** be bundled as-is —
they bloat the app and slow it down. Every new background template (or any bundled
image) goes through compression first (NFR-08).

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
  for extra high-DPI headroom; above that is waste.
- **Re-encode JPEG at `--quality` 80, `optimize` + `progressive`** — q80 is the
  standard "visually lossless enough" sweet spot for photos.
- **Strip EXIF/GPS metadata** — smaller files and better privacy.

**Real result on the 4 test templates:** 31 MB → ~0.68 MB total (−98%).

**Workflow rule:** keep the original full-res file *outside* the repo (Downloads or
a separate source folder); only the compressed version goes into `assets/`. Run the
script, eyeball the output, then commit the small files.

**Format — JPEG now, WebP/AVIF later:** current bundled test assets stay JPEG
(already tiny, 60–230 KB, universally supported). Switch to WebP (~25–35% smaller)
once the template library grows large or templates are delivered over the network
(REQ-07's paid tier) — quantify the egress saving before committing to that
pipeline.

**Git handling:** commit the compressed `assets/templates/` images (part of the
build, ~200 KB, no repo bloat). Never commit multi-MB originals — keep them outside
the repo. If the library gets large or moves to network delivery, stop bundling
entirely: host on cloud storage/CDN, download at runtime.

### Icon system: Lucide (2026-08-15)

Emoji characters (🎨 🗑 ☀️ 🌙 ✕ "+") were used as UI icons up through Phase B's
early work — functional, but read as unpolished, and inconsistent across
platforms/fonts (an emoji can render differently per OS). Replaced with
**[Lucide](https://lucide.dev/icons/)** (`lucide-react-native` +
`react-native-svg`, both MIT-licensed, free, no attribution required) — chosen
over the alternatives compared (`@expo/vector-icons`'s bundled sets, Phosphor,
Tabler, Feather) specifically because it's one consistent icon family designed
as a whole, not a grab-bag of differently-styled sets; mixing families was the
thing to avoid for a coherent look.

**Usage pattern:** import the named icon component directly
(`import { Trash2 } from 'lucide-react-native'`) and render it as a component
with `size` (number, px) and `color` (hex string) props — same component API
as any other RN element, no icon-font/ligature setup needed. Icons take color
directly as a prop rather than through `ThemedText`'s color system, so pass
`theme.text` (chrome/header context) or the note's computed `textColor`
(inside a note, so the icon matches auto-contrast against the background)
explicitly at each call site.

**Current mapping** (`src/app/index.tsx`, `src/app/folder/[id].tsx`,
`src/app/note/[id].tsx`):

| Icon | Used for |
|---|---|
| `Sun` / `Moon` | REQ-10 dark/light picker |
| `LayoutGrid` | Home screen header title, before "Memo app" |
| `Folder` (aliased `FolderIcon` to avoid clashing with the `Folder` data type) | Folder screen header title, before the category name |
| `FolderPen` | "Add new category" tile |
| `NotepadText` | "Add new note" tiles (home + folder screen) |
| `Palette` | Note editor: open background/text-color panel |
| `Trash2` | Note editor: delete note |
| `ArrowDownUp` | Note editor: folder chip (replaces "· change" text) |
| `Pencil` | Note editor: note-type chip (replaces "· change" text) |
| `X` | Dismiss the move/note-type panels; remove a checklist item / calculation row |
| `TextAlignJustify` | Note-type option: Plain text |
| `ListTodo` | Note-type option: Checklist |
| `CalendarCheck2` | Note-type option: Daily schedule |
| `SquarePlus` | Note-type option: Sum / Costs |

**Also converted while touching this: "Move to" folder picker.** Was an
`Alert.alert` action sheet — the same Android ~3-button ceiling already hit
once by the note-type picker (see §11's "Calculation missing from picker" bug
entry). Replaced with the same inline-panel pattern (✕ to dismiss, tap a row
to act) used for the note-type picker, both for consistency and so it doesn't
silently break once a user has more than ~2 categories.

**Reserved for future features** (icon already chosen so later work stays
consistent — not wired to any UI yet): `Mic` (voice input, REQ-09/13, still
deferred), `CalendarDays` (REQ-16 calendar, not built), `Mail` (share a note
via email, not yet a requirement in this document), `Forward` (share via
another app, e.g. WhatsApp — not yet a requirement), `Download` (save a note
as a file/image — not yet a requirement). `Pencil` was reserved for a generic
"edit" affordance but has since been put into actual use (note-type chip,
2026-08-15 part 13) — see the mapping table above.

**Not yet replaced** (still emoji, no icon chosen): the "⊘ None" background
swatch in the note editor, and the "⋯" folder options menu in
`folder/[id].tsx` — flagged, not forgotten; revisit if/when picking those up.

## 8. Known Issues

### Android system-level dark-mode color remapping (CONFIRMED 2026-08-15 — workaround found, permanent fix still needs a dev build)

**Confirmed 2026-08-15, part 5:** turning off MIUI's per-app "Dark mode" override
for **Expo Go** (Settings → Apps → Manage apps → Expo Go → Dark mode → off) fixes
it. Before disabling it, REQ-10's new manual toggle had no visible effect at all —
the app stayed rendered as dark regardless of which mode was selected in-app. After
disabling it, both light and dark mode render correctly and distinctly. This
confirms the hypothesis below: the OS was overriding colors independently of
whatever Memo's own code (or the user's in-app choice) set — it wasn't a
light/dark-*specific* color bug, it was the OS overriding the app's rendering
outright, which is also why REQ-10's toggle looked broken until this was found.

**Practical takeaway:** this is a **per-installation phone setting, not something
the app enforces** — anyone else running Memo through their own Expo Go (or the
author on a different/factory-reset phone) will hit the same thing until they also
turn it off, and a dev build (see below) makes this permanent instead of a manual
step. Worth mentioning near first launch once REQ-10 ships more broadly, or at
minimum keeping this entry as the pointer.

Three separate symptoms on the author's phone (a Redmi/MIUI Android device, native,
via Expo Go) turned out to be **one underlying cause**, not three unrelated bugs:

Three separate symptoms on the author's phone (a Redmi/MIUI Android device, native,
via Expo Go) now look like **one underlying cause**, not three unrelated bugs:

1. **(original, unresolved)** the three "add" ghost tiles (home screen's "Add new
   category"/"Add new note", folder screen's "Add new note") were invisible when
   styled with `theme.text` / `theme.backgroundElement` as inline `backgroundColor`
   — despite those same theme values rendering correctly everywhere else, and
   despite the source values being correct (`Colors.dark.text = '#ffffff'`).
   Hardcoded neon colors (`#FF00FF`/`#00FFFF`) rendered immediately, ruling out a
   layout/zero-size issue.
2. **(new, 2026-08-15)** a note's manual **text color** override (REQ-03's picker):
   "Dark" (`#1A1A1A`) and "White" (`#FFFFFF`) render as visibly different colors
   when the system is in **light** mode, but **both render as white text when the
   system is in dark mode.** Code was checked and ruled out as the cause: the
   `TextInput`'s `color` style is set from `resolveNoteTextColor()`
   (`src/lib/appearance.ts`), which returns the manual override unconditionally
   before any auto-contrast/theme logic runs, and the inline
   `{ color: textColor }` style is last in the array (correctly wins over
   `styles.titleInput`/`styles.contentInput`, which don't set `color` at all). The
   value React Native hands to the native `TextInput` is genuinely `#1A1A1A` either
   way — something *after* that is changing what actually renders.
3. **(new, 2026-08-15)** the note **background** color picker (`PASTEL_COLORS` in
   `src/lib/appearance.ts`) is a single fixed array of 8 light pastel hex values,
   rendered identically regardless of theme (`note/[id].tsx` has no light/dark
   branch for it) — yet in practice, only light pastel tones are visibly available
   when the system is in light mode, and only dark tones when the system is in dark
   mode. Same pattern: one fixed set of colors in the code, two different visible
   results depending on system theme.

**Confirmed cause: Android's OS-level automatic dark-mode color remapping
("Force Dark"), which MIUI (the author's phone is a Redmi) applies more
aggressively than stock Android — and, per-app, to the Expo Go binary itself while
testing this way, not to "Memo" (which isn't its own installed app yet).** This
feature re-colors views at the native
rendering layer — independent of whatever color React Native/JS explicitly set —
to keep an app looking "appropriately dark" when the system is in dark mode: it can
push a near-black text color toward white, and a light background color toward
dark, exactly matching all three symptoms above (light↔dark auto-inversion, only
when system dark mode is active, on this specific OEM skin). This is consistent
with why hardcoded neon colors in symptom 1 were unaffected — Force Dark's
heuristics target colors it judges as "too light" or "too dark" relative to the
system theme, not arbitrary hues.

**Why this can't be fixed in code right now:** the standard fix is
`android:forceDarkAllowed="false"` in the app's native Android theme
(`styles.xml`), which requires the app to control its own compiled native shell.
The project currently runs inside **Expo Go**, a pre-built binary Google/Expo ships
— its native theme can't be edited per-project. This is only fixable once the
project has its own custom **EAS development build** (already anticipated for
voice recognition and in-app purchases, NFR-07) — a **third**, independent reason
that transition will eventually be needed. Once on a dev build, a small Expo config
plugin (`@expo/config-plugins`' `withAndroidStyles`, or `expo-build-properties` if
it exposes the attribute directly) can inject that theme override.

**Confirmed workaround (no code, no dev build needed):** on MIUI, **Settings →
Apps → Manage apps → Expo Go → Dark mode → off** (found under a "More dark mode
options"-style submenu on some MIUI versions rather than directly on the app's
info page). Needed once per phone/Expo Go install; every tester/dev on MIUI
hitting "dark mode doesn't seem to work at all" should check this first before
assuming a code bug.

**Known trade-off / blast radius:** symptom 1's three "add" tiles still use a
scheme-conditional hardcoded fill rather than the theme color directly in dark
mode (see REQ-10's entry) — safe to leave as-is since it's now understood *why*,
but revisit once the dev-build fix below makes it unnecessary. The permanent,
zero-manual-steps fix (`android:forceDarkAllowed="false"` baked into the app's own
native theme) still needs the eventual EAS development build — see below.

## 9. Implementation Roadmap

1. 🔴 Test the skeleton on the author's Android phone (Expo Go) — ongoing.
2. 🔴 Decide on the real app name (currently "Memo" is a placeholder).
3. ✅ ~~Develop note customization~~ — done, see REQ-03.
4. 🔴 Add photos from the gallery (REQ-05).
5. 🔴 Build the background template gallery (REQ-07), starting with free bundled
   templates; free/paid split + IAP later.
6. 🔴 Confirm/scope contacts import (REQ-06) against the low-learning-curve filter
   before building.
7. 🔴 Before charging for any template, verify the source license (NFR-05); record
   source + license per template.
8. ✅ ~~Consider migrating from AsyncStorage to SQLite~~ — formalized as Phase A
   below, no longer optional (three requirements now depend on it).

### Priority order for the 2026-08-15 feature backlog (D-09)

9. ✅ **Phase A — SQLite migration, as shared infrastructure. Done 2026-08-15.**
   Moved off AsyncStorage's whole-array model before building REQ-08, REQ-11, or
   REQ-16 — all three independently needed relational, queryable storage. See §11
   for what shipped (`src/lib/db.ts`, rewritten `src/lib/storage.ts`, rewritten
   `use-notes-store.tsx`) — a one-time migration copies any existing
   AsyncStorage data into SQLite on first run after the update, then stops using
   the old keys.
10. 🔴 **Phase B — local-only features, after Phase A and before auth. ←
    IN PROGRESS.** Note template types (REQ-08, including Kanban's swipe
    interaction), custom gallery photo backgrounds (REQ-11), the calendar
    (REQ-16, multi-tag dates + public holidays), and daily-schedule alarms
    (REQ-17, including the repeat-daily prompt and the Alarms screen). None of
    these need a backend. ✅ REQ-10 (dark/light mode toggle) is done — see §11.
    Suggest REQ-08 (note template types) next, since REQ-09's search and
    REQ-16's note-linking both build on top of it.
11. 🔴 **Phase C — authentication + cloud data sync (REQ-15), last, as its own
    project phase.** The largest architectural change in this document: backend
    choice (Supabase vs Firebase), hashed-password auth, secure token storage, and
    a real sync strategy. Sequenced last so the local data model is already stable
    in SQLite before designing what syncs to a server and how. Not started.
12. 🔴 **Still deferred, not part of any phase above:** voice search (REQ-09), the
    AI assistant (REQ-12), and in-note voice dictation (REQ-13) stay parked until
    enough other native-module work justifies the move from Expo Go to an EAS
    development build (D-03) — none of the three phases above requires that move.
13. 🔴 If the long-press "move to folder" flow for unsorted notes isn't enough,
    consider real drag-and-drop for that specific case
    (`react-native-gesture-handler` + `react-native-reanimated` are already
    dependencies). Note: full drag-and-drop was considered and dropped for the
    Kanban template in favor of swipe (D-02, D-05) — this item is about folder
    moves only, a separate, smaller-stakes decision.

## 10. Project Structure (current)

```
Memo/
  src/
    app/
      _layout.tsx           # root Stack + NotesStoreProvider
      index.tsx              # folder grid (add-category/add-note tiles) + unsorted notes
      folder/[id].tsx         # note list in a folder, rename/recolor, add-note tile, move/delete
      note/[id].tsx           # editor: title/content, autosave, background/text-color picker, timestamps
    components/
      note-row.tsx            # shared note preview row (folder list + unsorted list)
      themed-text.tsx, themed-view.tsx   # from the starter template, kept for light/dark theming
    hooks/
      use-notes-store.tsx      # React Context: CRUD for folders/notes + persistence + first-launch seed
      use-theme.ts, use-color-scheme(.web).ts
    lib/
      types.ts                 # Folder, Note types
      storage.ts                # AsyncStorage read/write + one-time seeded flag
      appearance.ts              # pastel palette, contrast/luminance helpers
      templates.ts                # background template manifest + static image requires
    constants/theme.ts           # colors, spacing, FOLDER_COLORS palette (16 colors)
  assets/templates/                # bundled background template images + templates.json manifest
  scripts/compress-images.py       # image compression helper (§7)
  Plan.md                          # this file
```

## 11. Revision History

### 2026-08-13
- Created an Expo (React Native + TypeScript) project, file-based routing via
  `expo-router`.
- First navigable skeleton: **Folders → Notes in a folder → Note editor**, with
  local data storage (no backend for now).
- Being tested on Android (author's phone) via Expo Go.

### 2026-08-14
- Added **per-note backgrounds**: pastel solid color or a template image, chosen
  via a 🎨 panel in the editor.
- Added **auto-contrast text**: note text color adapts to the background (WCAG
  luminance/contrast math); manual override still available.
- New modules: `src/lib/appearance.ts` (palette + contrast), `src/lib/templates.ts`
  (manifest + bundled images). Each template's dark/light nature precomputed at
  build time as `isDark` in `templates.json`.
- Refreshed the folder color palette; folder-card text now auto-contrasts too.
- **App language is English** (NFR-06) — hardcoded strings, no i18n library yet.

### 2026-08-15
- **Folders editable after creation:** header "⋯" menu got an **Edit** action;
  store gained `updateFolder(id, patch)`, replacing the never-wired-up
  `renameFolder`.
- **Folder palette doubled to 16 colors** (was 8), still shared from one place
  (`FOLDER_COLORS` in `constants/theme.ts`).
- **Fixed a real bug:** folder list note-preview cards ignored a manually chosen
  text color when the note had no background — override was only applied when a
  background was present. Fixed by checking for a manual `textColor` too.
- **Switched all template image rendering to `expo-image`**, replacing core
  `Image`/`ImageBackground` — template thumbnails intermittently rendered blank
  until tapped, a known reliability class for RN's core `Image` on Android under
  frequent re-renders.

### 2026-08-15, part 2
- **Folder color-picker selection ring is theme-aware** (`theme.text` instead of a
  hardcoded black border).
- **First-launch seed content:** a fresh install starts with one folder
  ("Category 1", emerald) containing one welcome note, gated by a one-time
  `memo.seeded` flag — not "folders/notes are empty," so deleting everything later
  doesn't resurrect the welcome content.
- **Home screen grid rework:** floating "+ New category" button replaced by two
  always-visible ghost tiles ("Add new category", "Add new note") sized like folder
  cards; add-category panel now opens above the grid so the keyboard doesn't cover
  it.
- **Unsorted notes:** `Note.folderId` is now optional. Listed in an "Unsorted"
  section below the folder grid; long-press offers "Move to \<folder\>" or Delete.
  Real drag-and-drop was requested as an eventual goal but not built here — see
  roadmap item 13.
- **Shared `NoteRow` component** (`components/note-row.tsx`): note-preview-row
  rendering extracted once both the folder screen and unsorted-notes list needed it
  — reuse, not premature abstraction.
- **Folder screen:** floating "+ New note" button replaced by a full-width
  outlined "Add new note" tile as the list footer.
- **Per-note timestamps:** every note shows `Created: DD:MM:YY` and
  `Edited: DD:MM:YY HH:MM` in a persistent footer.

### 2026-08-15, part 3 — Phase A: SQLite migration (NFR-03)
- Installed `expo-sqlite` (`npx expo install expo-sqlite`) — SDK-aligned, works in
  Expo Go (unlike the voice/IAP native modules discussed elsewhere in this
  document), so no development-build switch was needed for this step.
- **New `src/lib/db.ts`:** opens one shared SQLite connection (`memo.db`), creates
  `folders` and `notes` tables plus a small `meta` key/value table (first-launch
  seed flag, migration-done flag), and enables `PRAGMA foreign_keys = ON` so
  `notes.folder_id REFERENCES folders(id) ON DELETE CASCADE` actually cascades —
  deleting a folder now deletes its notes at the database level, not via manual
  application code.
- **One-time AsyncStorage → SQLite migration**, also in `db.ts`: on first run after
  this update, reads the old `memo.folders`/`memo.notes`/`memo.seeded`
  AsyncStorage keys (if present), copies every row into SQLite inside a single
  transaction (all-or-nothing, so a crash mid-migration can't leave half the data
  copied), then deletes the old AsyncStorage keys. Gated by a `meta` flag so it
  only ever runs once per install. Existing notes/folders on the author's phone are
  expected to carry over automatically the next time the app opens.
- **Rewrote `src/lib/storage.ts`:** was "load the whole array" / "save the whole
  array" over AsyncStorage; now row-level CRUD over SQLite
  (`getAllFolders`/`insertFolder`/`updateFolderRow`/`deleteFolderRow` and the note
  equivalents), with small row↔type mapping functions to bridge SQLite's
  snake_case/NULL-based columns and the app's camelCase/`undefined`-based `Folder`/
  `Note` types.
- **Rewrote `src/hooks/use-notes-store.tsx`:** removed the two "persist the whole
  array on every change" `useEffect`s; every mutator (`createFolder`, `updateNote`,
  `moveNote`, etc.) now updates React state immediately and fires the matching
  single-row SQLite write in the background (logged, not awaited) — optimistic
  local update, same UX as before, but a save now touches one row instead of
  re-serializing every folder/note. The public `useNotesStore()` API is unchanged,
  so no screen code needed to change.
- **Verification done:** `npx tsc --noEmit` passes clean. **Not yet done:**
  real on-device testing in Expo Go (needed to confirm the AsyncStorage migration
  actually carries over the author's existing notes, not just that it compiles) —
  flagged as the immediate next step before building on top of this.

### 2026-08-15, part 4 — Phase B: dark/light mode toggle (REQ-10)
- Diagnosed two more color-rendering reports (manual note text color and the
  pastel background picker both collapsing to one visual result per system
  theme) as almost certainly the same root cause already logged in §8 — Android/
  MIUI's automatic dark-mode color remapping — not a code bug; confirmed by code
  review (the manual-override and palette code paths are theme-independent) and
  by the symptom pattern (identical in light mode, collapsed only in dark mode).
  Attempted the MIUI per-app "Dark mode" override for Expo Go as a no-code test;
  inconclusive from the author's report, so REQ-10 was built regardless — see §8
  for the full diagnostic writeup and current status.
- Implemented REQ-10 (see that entry for what shipped): new
  `use-theme-preference.tsx`, `use-theme.ts` and `_layout.tsx` rewired to read
  the resolved scheme from it, a header toggle button on the home screen, and
  persistence via two new `storage.ts` functions over the existing `meta` table.
- Fixed a light-mode regression this exposed immediately: the three "add" ghost
  tiles' hardcoded near-black fill would have shown black-on-black text once
  light mode became reachable. Made the fill scheme-conditional (hardcoded only
  in dark mode, real theme color in light mode) in `index.tsx` and
  `folder/[id].tsx`.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 5 — Force Dark confirmed; dark/light picker redesigned
- **Confirmed the §8 root cause:** disabling MIUI's per-app "Dark mode" override
  for Expo Go fixed both mode rendering and REQ-10's toggle, which had looked
  non-functional up to that point (app stayed dark regardless of the in-app
  selection). Updated §8 from "hypothesis" to "confirmed," with the exact
  setting path and the practical takeaway that it's a per-installation phone
  setting, not something the app can enforce short of a dev build.
- **Redesigned REQ-10's UI** per feedback: was a single icon that flipped
  between ☀️/🌙 on tap; now both icons are always visible side by side, the
  active one full-opacity and the other dimmed, so the current mode reads at a
  glance instead of only being inferable from which icon is currently shown.
  Tapping either icon sets that mode directly. `useThemePreference()`'s API
  changed from `toggle()` to `setScheme(value)` to match.
- Verified with `npx tsc --noEmit` (clean).

### 2026-08-17, part 24 — distribution/storage/security Q&A captured as §12 + D-12
- No code changed. Added **§12 "Distribution, Local Storage & Security"**
  (below §11) covering: how app-sandboxed local storage works and that it's
  the permanent, standard model for production apps (not a temporary/dev-only
  thing); the exact risk difference between running through Expo Go today vs.
  a real installed build; step-by-step EAS Build instructions for this
  specific project; how to ship updates (native rebuild vs. OTA via
  `expo-updates`) without losing on-device data; and why authentication isn't
  needed yet. Logged as **D-12** in the Decision Log (§6).
- Corrected **D-10**: it referenced checklist as the new-note default, which
  part 20 (2026-08-17) already reverted back to plain text — added an update
  note rather than rewriting the original decision's history.

### 2026-08-17, part 23 — "Delete this category?" panel: font size + icon alignment
- **"Cancel" now uses `type="small"`** (14px, matching every other label in
  the panel) — it had no `type` prop, so it fell back to `ThemedText`'s
  16px `default` preset and visibly stood out as bigger than "Delete."
- **Warning row (`CircleAlert` + "All notes in this category…")** switched
  from `alignItems: 'flex-start'` to `'center'` — flex-start top-aligned the
  16px icon with the text block, but the text's own line-height padding sat
  it visually lower than the icon's true center; `'center'` aligns the
  icon's midpoint with the text's midpoint instead.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-17, part 22 — red ✕ swapped for a red trash-can icon on delete rows
- Every "this row deletes something" option that used a red `X` now uses a
  red `Trash2` icon instead: "Delete note" (`note/[id].tsx`), "Delete
  category" (folder options panel) and the "Delete" row in the "Delete this
  category?" confirmation panel (both `folder/[id].tsx`). The ✕ is now
  reserved purely for "dismiss this panel," never for a delete action, in
  every panel across the app.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-17, part 21 — "Delete this note?" converted to an in-app panel
- Last remaining `Alert.alert` confirmation in `note/[id].tsx` — replaced
  with a panel matching the folder screen's "Delete this category?" panel:
  ✕ top-right to dismiss, and a red ✕ ahead of a "Delete note" row (text
  changed from the old Alert's bare "Delete") as the only other action. The
  trash-can header button now toggles `showDeleteConfirm` instead of calling
  `Alert.alert` directly; `handleDelete()` performs the actual delete.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-17, part 20 — category input contrast, delete-category panel, new-note default, daily schedule add-item
- **Category name input (both "Add new category" and "Edit category")**: text
  and border color were hard-coded, so typed text stayed black and was
  invisible against a dark panel. Both now use `theme.text` for text/border
  and a dimmed `theme.text` for the placeholder, so they're legible in either
  mode.
- **Folder screen header trigger**: the "⋯" glyph replaced with a `Pencil`
  icon (same icon already used for "Edit" elsewhere), still opening the same
  Edit/Delete options panel.
- **"Delete this category?" converted from `Alert.alert` to an in-app
  panel**, matching every other panel's style: ✕ top-right to dismiss, a red
  `CircleAlert` icon ahead of the "All notes in this category will be
  permanently deleted." warning text, and a red ✕ ahead of the "Delete"
  action itself — closable via either "Cancel" or the ✕.
- **New notes now default to the Plain text template**, not Checklist —
  `createNote()` in `use-notes-store.tsx` no longer seeds a `templateType:
  'checklist'` + one empty item; the user picks a template afterward if they
  want one.
- **Daily schedule's "+ Add item"**: now flush-left (matches Sum/Costs' "+
  Add row", which has the same reasoning — no checkbox to align text under)
  instead of indented like Checklist's, and now appears both above and below
  the item list (`addChecklistItem` takes an optional `'start' | 'end'`
  position) so an appointment can be inserted anywhere in the day, not only
  appended at the end. Checklist keeps its single, indented, end-only button.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-17, part 19 — Sun/Moon header icons are now a true toggle
- Both `onPress` handlers in `index.tsx`'s header now call
  `setScheme(scheme === 'dark' ? 'light' : 'dark')` instead of the Sun icon
  always setting `'light'` and the Moon icon always setting `'dark'`. Before
  this, tapping the already-active icon was a no-op (correct, since it's
  already that mode), which read as "only the dimmed/inactive icon does
  anything" — fixed per feedback so either icon, tapped in either state,
  flips the theme.

### 2026-08-17, part 18 — ghost tiles lost their border entirely
- **"Add new category" / "Add new note" (home + folder screen) tiles no
  longer have any border at all** — the two-layer solid-fill "ring" technique
  (white outer + `ghostFill` inner) from parts 15–16 was removed per explicit
  feedback that no border was wanted, not even white. Each tile is now a
  single `Pressable`/view filled with `ghostFill` directly, no outer layer.
- `index.tsx`: `ghostOuter`/`ghostInner` styles merged into one `ghostTile`
  style; `unsortedAddOuter`/`unsortedAddInner` merged into `unsortedAddTile`;
  the now-unused `GHOST_BORDER` constant removed.
- `folder/[id].tsx`: `addNoteTileOuter`/`addNoteTileInner` merged into one
  `addNoteTile` style; `GHOST_BORDER` constant removed.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 17 — folder options panel, red-means-delete convention, more fixes
- **`DESTRUCTIVE_COLOR` extracted to `constants/theme.ts`** (`#D6453F`) — was a
  local constant in `note/[id].tsx`; now shared so `folder/[id].tsx` can use
  the identical tone.
- **Corrected the ✕ color rule after feedback**: red is reserved for "this
  removes something" (a checklist item, a calculation row, "Delete
  category") — a panel's own dismiss-without-doing-anything ✕ (Move to /
  Note type / folder options) is **not** red, it matches the panel's normal
  text color. Fixed the two panel-close ✕s in `note/[id].tsx` that had
  wrongly been made red in the previous pass.
- **Folder screen's "⋯" menu converted from `Alert.alert` to an inline
  panel** (`showFolderMenu`), matching `note/[id].tsx`'s panels exactly —
  same radius/colors, an explicit ✕ instead of a "Cancel" row, a `Pencil`
  icon next to "Edit" and a red `X` next to "Delete category" so the
  destructive option reads as different at a glance, not just by position.
  The actual delete confirmation stays a native `Alert.alert` (only 2
  buttons, a standard "are you sure" pattern, no reason to convert it).
- **`editPanel` (folder rename/recolor) radius fixed to `Spacing.two`** —
  missed in the earlier radius-unification pass since it wasn't one of the
  panels explicitly named at the time.
- **Note editor's folder chip gained a `Folder` icon before the category
  name** (already had `ArrowDownUp` after it); the "Note type" chip's final
  layout is: type icon → label → pencil (a "Note type:" text prefix was
  added then removed the same session per follow-up feedback).
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 16 — more polish: ghost-tile border, type-chip text, radius, calc total
- **Ghost-tile border switched back from grey to white** (`index.tsx`,
  `folder/[id].tsx`) — grey was a workaround for white rendering invisible
  under MIUI's Force Dark; retried now that that setting was disabled for
  Expo Go earlier today (see §8). Flagged in-code to revert if it goes
  invisible again on-device.
- **Note-type chip dropped its "Note type:" text prefix** — keeps the current
  type's icon, its label, and the trailing pencil-edit icon, per feedback
  that the literal prefix wasn't wanted after all (still shown, briefly, one
  message earlier in this session).
- **Panel radius unified**: the appearance/note-type/move-to panels all share
  one `panel` style, so changing its `borderRadius` (`Spacing.three` →
  `Spacing.two`) fixed all three at once — same radius now used everywhere
  in the app (folder cards, note rows, chips, panels).
- **Sum/Costs total row**: `+`/`=` moved closer to their number (row gap
  `Spacing.two` → `half`) and both the label and the total value got a
  bigger font (20px/700 weight, up from the 14px `smallBold` preset) so the
  total reads with more visual weight than the line items above it.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 15 — note editor color/copy/radius polish
- **"Move to" panel label** changed from "Move to" to "Move this note to
  folder:" for clarity.
- **Note-type chip now reads "Note type: [icon] Plain text [pencil icon]"**
  (was just the label + a trailing pencil) — always shows the literal prefix
  "Note type:" plus the current type's own icon before its label.
- **Colors made semantic instead of all deriving from the note's ink color:**
  every ✕ (close a panel, remove an item/row) is now a fixed red
  (`#D6453F`, reused from `FOLDER_COLORS` rather than inventing a new tone);
  "+ Add item"/"+ Add row" use the app's existing brand blue (`#5B7FE0`, same
  as the Save button) instead of a dimmed copy of the note's own text color;
  the Created/Edited footer's alpha dropped further (0.65 → 0.5) to read
  more distinctly as secondary/muted text rather than a lighter version of
  the note's primary ink.
- **Border radius unified**: folder cards (home screen) and the note editor's
  folder/type chips changed from their larger radii (`Spacing.three`/`four`)
  to `Spacing.two` — matching `NoteRow`'s (unsorted note box) radius, which
  didn't change. The "Add new category" ghost tile's inner radius followed
  suit so it still matches real folder cards next to it in the same grid.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 14 — calculation total row: "+" marker above "="
- The "+ Add row" row now also carries a **"+" marker**, right-aligned in the
  exact same column as the "=" on the result row below it (same
  `calcTotalRow` structure reused for both, with an empty width-matched box
  standing in for the row that has no number) — reads as "everything above
  this line adds up to..." directly above the actual "=" total.
- Result row's leading symbol changed from "+" to **"="**.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 13 — more icon polish, "Move to" panel, layout fixes
- **`Colors.light.background`** changed from flat white to a soft neutral
  blue (`#D9E5F0`, darkened once from an initial `#EAF1F7` per feedback) —
  `backgroundElement` (cards/panels) stays lighter so they still read as
  elevated above it. Dark mode untouched.
- **Header titles gained icons**: home screen now shows `LayoutGrid` + "Memo
  app" (was plain "Memo"); the folder screen shows `Folder` (aliased
  `FolderIcon` — the bare name collides with the `Folder` data type already
  imported in that file) before the category name. Both use expo-router's
  `headerTitle` render-prop instead of the plain `title` string, following
  the same per-screen `<Stack.Screen options={{...}}>` override pattern
  `note/[id].tsx`/`folder/[id].tsx` already used for `headerRight`.
- **Folder chip and note-type chip** (`note/[id].tsx`) dropped their "·
  change" text in favor of a trailing icon — `ArrowDownUp` and `Pencil`
  respectively — so `Pencil` moved from §7's "reserved for later" list into
  actual use.
- **"Move to" converted from `Alert.alert` to an inline panel** — see the new
  §7 note under "Icon system: Lucide" for why (same Android button-count
  issue as the note-type picker).
- **Calculation row alignment fixes**: `calcAmountInput` gained
  `paddingRight` so digits aren't flush against the input's own edge; the X
  button's `marginLeft` increased (Spacing.three → four) for more separation
  from the number; the total row's value now shares the amount column's
  exact width/padding plus an invisible spacer mirroring the X button's
  footprint, so the total lines up directly under the amounts instead of at
  the row's true right edge. "+ Add row" split into its own
  `addCalcRowButton` style (flush left) instead of reusing checklist's
  `addItemRow` (indented to clear a checkbox calculation rows don't have).
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 12 — Lucide icon system replaces emoji UI icons
- Installed `lucide-react-native` + `react-native-svg` (`npx expo install`).
- Replaced 🎨/🗑/☀️/🌙/✕/"+" with `Palette`/`Trash2`/`Sun`/`Moon`/`X`/
  `FolderPen`/`NotepadText` across `index.tsx`, `folder/[id].tsx`,
  `note/[id].tsx`; added an icon (`TextAlignJustify`/`ListTodo`/
  `CalendarCheck2`/`SquarePlus`) before each label in the note-type panel.
  Full mapping and rationale in §7 "Icon system: Lucide".
- Two emoji intentionally left as-is (no icon chosen yet by the user):
  "⊘ None" background swatch, "⋯" folder options menu.
- Six icons reserved for not-yet-built features (`Mic`, `CalendarDays`,
  `Mail`, `Forward`, `Download`, `Pencil`) so later work reaches for the same
  ones instead of re-deciding.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 11 — calculation template polish (naming + input UX)
- **Renamed the UI label** from "Calculation" to **"Sum / Costs"** (internal
  `templateType` value stays `'calculation'` — only the display label
  changed, so no data/schema migration needed).
- **Amount field now opens the numeric keyboard** (`keyboardType="numeric"`)
  and **filters input as you type** — a new `sanitizeAmountInput()` strips
  anything that isn't a digit, keeps at most one leading "-", and at most one
  decimal separator (comma or dot), so pasting or typing letters can't get
  into the field at all rather than only being ignored at sum time.
- **More space before each row's ✕**: it previously sat directly against the
  amount field using the row's normal gap, making it easy to fat-finger while
  adjusting a number. Gave calculation rows their own `calcRow` style (split
  off from the shared `checklistRow`) with extra `marginLeft` on the ✕
  specifically, without changing spacing for checklist/daily-schedule rows.
- Verified with `npx tsc --noEmit` (clean). Not yet re-tested on-device.

### 2026-08-15, part 10 — bug fix: "Calculation" missing from the type picker
- Reported: after shipping the calculation template, the "Note type" picker
  still only showed Plain text / Checklist / Daily schedule — no Calculation,
  and no way to dismiss the picker without choosing one.
- **Root cause: not a stale bundle** (the initial suspicion, given the recent
  Fast-Refresh/SQLite incident) — the code was correct. The real cause is a
  documented React Native limitation: `Alert.alert` on Android does not
  reliably render more than ~3 buttons. The picker used
  `Alert.alert('Note type', undefined, [...4 type buttons, Cancel])` — 5
  buttons — and Android was silently dropping one rather than erroring.
- **Fix:** replaced the `Alert.alert`-based picker with an inline panel
  (`note/[id].tsx`), reusing the exact pattern already established for the
  🎨 background/text-color picker — a `ThemedView` card toggled by the "Type"
  chip, each option as its own row (current type highlighted), plus an
  explicit ✕ in the panel header so it can be closed without selecting
  anything. This also resolves the "can't close without picking" complaint,
  and avoids the same button-count ceiling if a 5th type (Kanban) is ever
  added to the list.
- Verified with `npx tsc --noEmit` (clean). Not yet re-tested on-device.

### 2026-08-15, part 9 — REQ-08 (calculation template type)
- **`CalculationRow` type** (`id`, `description`, `amount: string`) added
  alongside `ChecklistItem`; `TemplateType` gained `'calculation'`.
- **`db.ts`:** new `calculation_rows` table (id, note_id FK CASCADE, position,
  description, amount) — a brand-new table needs no `ALTER TABLE` migration,
  unlike the two earlier column additions.
- **`storage.ts`:** `getAllNotes()` bulk-loads calculation rows the same way
  it already does checklist items; new `getCalculationRows`/
  `replaceCalculationRows` (same delete-all-then-reinsert-in-order pattern).
- **New `src/lib/calculation.ts`:** `parseAmount`/`sumCalculationRows`/
  `formatSum` extracted into their own module rather than left inside
  `note/[id].tsx`, since the note preview row needs the identical total —
  duplicating the parsing logic risked the editor and the list ever showing
  two different totals for the same note.
- **`note/[id].tsx`:** added the calculation row UI (description + amount
  inputs, ✕ remove, "+ Add row", a ruled divider, a total row with a fixed
  "+" label — see D-11 for why it's not a switchable operator) and the
  conversion functions for all 6 new directed type-pairs touching
  calculation. Refactored the autosave/flush persistence logic behind one
  shared `persistFor(type, ...)` helper (previously duplicated between the
  debounce effect and the unmount-flush effect) now that there are three
  content "shapes" (content string / items / calc rows) instead of two.
- **`note-row.tsx`:** preview for calculation notes shows the total plus row
  descriptions, e.g. "= 42.50 · rent, groceries".
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 8 — bug fixes found while testing REQ-08 on-device
- **Data-loss scare, root-caused as a stuck SQLite connection, not lost
  data:** after adding the daily-schedule migration, the app on the author's
  phone started throwing `NativeDatabase.execAsync`/`prepareAsync` "rejected"
  errors on every write, and the home screen appeared empty (folders/notes
  "gone"). Root cause: a stale native SQLite handle surviving Fast Refresh
  across a long dev session (confirmed by a Force Stop of Expo Go, not just
  swipe-closing it, clearing the issue) — since writes were failing too, no
  actual `DELETE` had succeeded; the UI just couldn't read the file this
  session. No data was actually lost.
- **Two real robustness bugs found and fixed while diagnosing this:**
  1. `db.ts`'s `getDb()` cached a **rejected** promise forever once the first
     `openAndPrepareDb()` call failed — every later call got the same stale
     rejection instead of retrying, so one transient failure permanently
     broke the DB connection for the rest of the JS session. Fixed: clear
     the cached promise on failure so the next call retries fresh.
  2. `use-notes-store.tsx`'s startup load had no `try/catch` — a failure
     left `loading` stuck `true` forever and, worse, meant a DB read failure
     could never be distinguished from "fresh install" (both would otherwise
     fall through similarly). Fixed: failures are now caught, logged loudly,
     and explicitly do **not** fall into the first-launch seed branch —
     seeding only ever happens on an actual confirmed-empty read, never as a
     side effect of an error.
  3. Also added per-stage error labeling in `db.ts` (`step()` helper) so a
     future failure names exactly which part of `openAndPrepareDb` broke
     instead of a bare native `NullPointerException` with no context.

### 2026-08-15, part 7 — REQ-08 (daily schedule template type)
- **`ChecklistItem` gained an optional `time?: string` field** and
  `TemplateType` gained `'daily_schedule'` (`src/lib/types.ts`) — daily
  schedule reuses the checklist's item structure rather than being a separate
  data shape, exactly as scoped in the requirement.
- **`db.ts`:** added a `time TEXT` column to `checklist_items` (same
  guarded-`ALTER TABLE` pattern as the earlier `template_type` migration, via
  a new `migrateChecklistItemsTimeColumnIfNeeded`). `storage.ts`'s
  `ITEM_BASED_TEMPLATE_TYPES` list now gates checklist-item hydration/writes
  for both `'checklist'` and `'daily_schedule'`, and `replaceChecklistItems`
  writes the `time` column.
- **`note/[id].tsx`:** added `SCHEDULE_HOURS` (05:00–22:00) and three
  conversion primitives (`itemsToScheduleItems`, `scheduleItemsToChecklist`,
  `scheduleItemsToPlain`) that `changeTemplateType` composes for all 6
  type-pair conversions, rather than writing one dedicated function per pair.
  Converting *into* daily schedule merges existing items into the hourly
  skeleton in order, padding empty hours and appending overflow items past
  22:00 rather than dropping them (D-01). Converting *out* drops the time
  label (to checklist) or prefixes each line with it (to plain, so the time
  isn't silently lost). Row UI gained a small time `TextInput` per item, shown
  only for this template type.
- **`note-row.tsx`:** preview logic extended to treat `daily_schedule` the
  same as `checklist` (both read from `checklistItems`), with its own "Empty
  schedule" placeholder text.
- Reached only via the "Type" chip — new notes still default to `checklist`,
  not `daily_schedule` (only REQ-08's checklist is specified as the
  new-note default).
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15, part 6 — REQ-08 (plain + checklist template types)
- **New `src/lib/id.ts`:** `makeId()` extracted out of `use-notes-store.tsx`
  (now shared with the note editor, which needs to mint ids for new checklist
  items) — no behavior change, just a home both call sites can import from.
- **`Note` gained `templateType: 'plain' | 'checklist'` and
  `checklistItems?: ChecklistItem[]`** (`src/lib/types.ts`). The union is
  intentionally only two values for now — daily-schedule/calculation/kanban
  get added when each is actually built, not reserved ahead of time.
- **`db.ts`:** added `template_type` column to `notes` (new installs get it
  from `CREATE TABLE`; existing databases get it via a guarded
  `ALTER TABLE ... ADD COLUMN`, checked through `PRAGMA table_info` since
  SQLite has no `ADD COLUMN IF NOT EXISTS`), plus a new `checklist_items`
  table (FK to `notes.id`, `ON DELETE CASCADE`, ordered by `position`).
  Pre-migration AsyncStorage notes are explicitly inserted as `'plain'` (D-10).
- **`storage.ts`:** `getAllNotes()` now bulk-loads all checklist items in one
  extra query and attaches them to their notes in memory (not one query per
  note), so the store's `notes` array stays fully hydrated for previews
  without an async lookup per row. New `getChecklistItems`/
  `replaceChecklistItems` (delete-all-then-reinsert-in-order, inside a
  transaction) — simpler than tracking per-item diffs, and cheap at this
  app's scale.
- **`use-notes-store.tsx`:** `createNote()` now defaults to `templateType:
  'checklist'` seeded with one empty item; new `updateChecklistItems(id,
  items)` mutator (same fire-and-forget persistence pattern as everything
  else). `updateNote`'s patch type gained `templateType`.
- **`note/[id].tsx`:** new "Type" chip next to the folder chip (tap → action
  sheet → best-effort conversion per D-01, via `plainToChecklistItems`/
  `checklistItemsToPlain`); checklist body (checkbox + text input + remove
  per row, "+ Add item" row) rendered instead of the content `TextInput` when
  `templateType === 'checklist'`. Autosave/flush-on-unmount extended to cover
  items and templateType alongside title/content, still one 500ms debounce.
- **`note-row.tsx`:** preview text is now type-aware — checklist notes show
  `done/total · item texts` instead of a raw content snippet.
- Also (small, same session): enlarged the REQ-10 ☀️/🌙 header icons
  (16px → 26px font size, larger `hitSlop` and gap) — they were hard to tap
  accurately at the original size.
- Verified with `npx tsc --noEmit` (clean). Not yet tested on-device.

### 2026-08-15 — planning session (this URS conversion)
- Captured a large batch of new requirements (REQ-08–REQ-17) covering note template
  types, search, dark/light mode, custom photo backgrounds, AI assistant, voice
  dictation, external APIs, authentication, calendar, and alarms.
- Resolved eight open decisions (D-01–D-08) and agreed an implementation sequencing
  (D-09: SQLite migration → local features → auth/cloud sync, last).
- Converted this document from a chronological journal into a formal **User
  Requirements Specification** structure (this rewrite) — same content, reorganized
  into Introduction / Overall Description / Functional & Non-Functional
  Requirements / Decision Log / Technical Design Notes / Known Issues / Roadmap /
  Revision History.

## 12. Distribution, Local Storage & Security

Added 2026-08-17 (part 24) in response to direct questions about whether the app
is safe for real users to start relying on today, and how to get it onto their
phones. See D-12.

### 12.1 How local storage actually works (and why it's not "temporary")

Every note/folder lives in a SQLite database (`expo-sqlite`, see `db.ts`) inside
the app's own **OS-managed sandbox** — a private storage directory that only this
app's process can read or write (Android enforces this per-UID; iOS uses a
per-app container). This is not a dev-only or temporary mechanism: it is the
standard, permanent storage model virtually every production mobile app uses
for local data (Signal's local message store, Notes apps, offline caches in
Notion/Slack, etc. all work this way). It survives app restarts, phone reboots,
and in-place app updates. It is only erased if the user uninstalls the app,
manually clears the app's storage/data via OS settings, or factory-resets the
phone — never as a side effect of normal use.

### 12.2 Today's actual risk: Expo Go, not sandboxing itself

The one caveat specific to *today's* setup: the app currently only runs inside
**Expo Go** (a shared dev-client app), so Memo's data sits in Expo Go's sandbox,
not a sandbox of its own. If a user clears Expo Go's app storage/cache in
Android settings — plausible, since it looks like a generic "app" to them — it
would wipe every Expo project's local data running under Expo Go, Memo's
included. This risk goes away once the app is a real standalone build (§12.3),
which gets its own dedicated sandbox like any other installed app. Either way,
there is currently no cloud backup: an uninstalled app, lost phone, or factory
reset means the notes are gone for good, with no recovery path. Worth being
explicit about with early testers before they put anything they'd mind losing
into the app.

### 12.3 Getting a real, installable build: EAS Build steps

These are the exact steps for this project as it stands (no `eas.json` and no
`android.package` set yet — first-time setup):

1. Create a free Expo account at expo.dev if you don't have one.
2. Install the EAS CLI: `npm install -g eas-cli` (or prefix every command below
   with `npx` instead of installing globally).
3. `eas login` — authenticate the CLI once.
4. From the project root: `eas build:configure` — creates `eas.json` and links
   the project to an EAS project id (written into `app.json`). Choose Android
   when prompted (iOS needs an Apple Developer account — skip it for now).
5. Set a real Android package name in `app.json` under `"android": {
   "package": "com.<yourname>.memo" }` (reverse-DNS style, e.g.
   `com.mbrezovic.memo`) — **pick this once and don't change it later**: Android
   treats a changed package name as a *different app*, so future updates
   wouldn't be recognized as updates to the same install and testers' data
   wouldn't carry over.
6. In `eas.json`, make sure the `preview` profile builds an installable `.apk`
   (not the Play-Store-only `.aab`):
   ```json
   "preview": { "android": { "buildType": "apk" } }
   ```
7. Run `eas build --platform android --profile preview`. This builds in Expo's
   cloud (10-20 minutes); no local Android SDK needed.
8. When it finishes, EAS gives a download link/QR code. Anyone opens it on an
   Android phone's browser and installs the `.apk` directly (Android will ask
   to allow installs from that source once — a standard, expected prompt).

Once this works and testing goes well, the natural next step is Google Play's
**Internal Testing** track, which adds proper auto-updates without testers
re-downloading APKs by hand.

### 12.4 Shipping updates without losing data or adding risk

Two different kinds of update, both safe for on-device data if done right:

- **Native rebuild** (new `.apk` via `eas build` again) — needed whenever a new
  *native* dependency is added (e.g. a package requiring native code). As long
  as the package name and signing key stay the same (EAS handles signing
  automatically per project), Android treats it as an update-in-place and
  on-device data is preserved.
- **OTA / JS-only update** (`expo-updates`) — pushes JavaScript/UI changes
  directly to already-installed apps, no new `.apk`, no app-store review. Worth
  setting up once there's a standalone build, since most of this project's
  changes so far have been JS/UI-only and wouldn't need a full rebuild.

Either way, the existing SQLite migration pattern (`db.ts`'s `PRAGMA
table_info` guarded `ALTER TABLE`, never `DROP`) must stay **additive-only** —
this is the actual data-safety guarantee across updates, not the update
mechanism itself. A schema change that drops or renames a column/table without
a migration step would destroy real users' data on their next update.

### 12.5 Why authentication isn't needed yet

There is currently no server anywhere in this app — nothing a login could
protect. The real security boundary today is the OS app sandbox (§12.1), which
already exists for free and requires no design work. Authentication becomes
necessary specifically when Phase C (D-06/D-09) introduces a real backend for
cross-device sync — that is the point where "whose data is this" becomes a
question with a real answer to protect. Building auth before that would add
genuine complexity (credential storage, token handling, attack surface) with no
corresponding data to secure yet. See D-12.
