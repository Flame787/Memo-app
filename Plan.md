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
made along the way (§6), known issues (§8), and where the project currently stands
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
| REQ-08 | Note template types | Must | 🔴 Planned |
| REQ-09 | Search | Must/Could | 🔴 Planned (text) / Deferred (voice) |
| REQ-10 | Dark/light mode toggle | Should | 🔴 Planned |
| REQ-11 | Custom photo backgrounds | Should | 🔴 Planned |
| REQ-12 | AI assistant | Could | 🔴 Deferred |
| REQ-13 | Voice-to-text dictation | Could | 🔴 Deferred |
| REQ-14 | External API integrations | Should | 🔴 Planned |
| REQ-15 | Authentication + cloud sync | Must | 🔴 Planned |
| REQ-16 | Calendar | Must | 🔴 Planned |
| REQ-17 | Alarms/notifications | Should | 🔴 Planned |

**Next up:** the Phase A SQLite migration (§9) — the shared prerequisite that
REQ-08, REQ-11, and REQ-16 all independently need before they can start.

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
**Priority:** Must · **Status:** Planned (Phase B)

Each note picks a **template type** governing how its content is structured and
rendered (chosen at creation; changing it later triggers a best-effort content
conversion — D-01).

- **Checklist (default)** — a list of items, each with its own checkbox; checking
  it strikes through that item's text. **Does not exist today** — the current
  editor is a single free-text `content` field, so this is a real data-model change
  (a string → a structured item list), not just a new visual style.
- **Daily schedule** — rows pre-seeded hourly from 05:00 to 22:00, each with a
  checkbox + an editable free-text label. The hour value is editable, rows can be
  added/deleted freely, and 05–22 is just a starting default. Structurally this is
  the checklist template with an extra editable "time" field per item. Feeds REQ-17
  (alarms) and, via D-08, REQ-16 (calendar).
- **Calculation** — free rows of (description, number), a ruled line, and a total
  row below it auto-summing every number above via a selectable operator (default
  `+`). Needs careful numeric-input handling: locale decimal separator, negative
  numbers, rejecting non-numeric input without crashing the sum.
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

### 🔴 REQ-10 — Dark mode / light mode toggle
**Priority:** Should · **Status:** Planned (Phase B)
- A manual toggle on the homepage.
- **First launch:** defaults to the phone's current system theme — the plumbing
  already exists (`useColorScheme()`, wired into `hooks/use-color-scheme.ts`).
- After that, the user's explicit choice **overrides and persists** until changed
  again — stop following system theme changes once picked manually.
- **Ties into the unresolved theme-color bug** (§8): a light-mode toggle will
  immediately expose it, since three tiles are currently hardcoded dark-mode-only
  as a workaround. Worth root-causing before this ships.

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

### 🔴 NFR-03 — Performance & storage scalability
AsyncStorage (whole-array JSON under two keys) does not scale once note/folder
counts grow — each save overwrites the entire array, no relational queries. Three
separate requirements now depend on fixing this (REQ-08, REQ-11, REQ-16) — see
Phase A, §9. Replacement: **SQLite** (`expo-sqlite`) with real tables and FK
relations.

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

## 8. Known Issues

### `theme.text` / `theme.backgroundElement` invisible on one device (unresolved)
On the author's Android phone (native, Expo Go), the three "add" ghost tiles (home
screen's "Add new category"/"Add new note", folder screen's "Add new note") were
invisible when styled with `theme.text` / `theme.backgroundElement` as inline
`backgroundColor` — despite those same theme values rendering correctly everywhere
else in the app, and despite the source values being correct
(`Colors.dark.text = '#ffffff'`). Confirmed with a debug test: hardcoded neon colors
(`#FF00FF`/`#00FFFF`) rendered immediately, ruling out a layout/zero-size issue —
it's specifically about those two theme values in this `backgroundColor` context, on
that device. Root cause not found.

**Current workaround:** those three tiles use hardcoded literal hex colors —
`#5B7FE0` (the app's brand blue, already used on FAB/Save buttons) for the border,
`#212225` for the inner card fill — instead of the theme values. White itself (via
`theme.text` and as a hardcoded `#FFFFFF` literal) stayed invisible on the author's
device even after the debug test; blue was picked because it's already proven
visible elsewhere in the app, not because the underlying cause was found.

**Known trade-off:** these three tiles are dark-mode-only until this is properly
root-caused — directly relevant to REQ-10 (dark/light toggle), which will expose
this immediately. Revisit if it recurs elsewhere, or when REQ-10 is scheduled.

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

9. 🔴 **Phase A — SQLite migration first, as shared infrastructure. ← NEXT UP.**
   Move off AsyncStorage's whole-array model before building REQ-08, REQ-11, or
   REQ-16 — all three independently need relational, queryable storage. Doing this
   once now avoids shipping three separate workarounds for the same limitation.
   Not started.
10. 🔴 **Phase B — local-only features, after Phase A and before auth.** Note
    template types (REQ-08, including Kanban's swipe interaction), custom gallery
    photo backgrounds (REQ-11), the calendar (REQ-16, multi-tag dates + public
    holidays), and daily-schedule alarms (REQ-17, including the repeat-daily prompt
    and the Alarms screen). None of these need a backend. Search's text part
    (REQ-09) and the dark/light mode toggle (REQ-10) are self-contained and can
    slot in anywhere within this phase. Not started.
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
