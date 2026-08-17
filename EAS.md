# EAS Build & Distribution — Step-by-Step Guide

**Purpose:** how to take an Expo/React Native project from "runs in Expo Go on my
phone" to "a real, installable app other people can download and test on their own
Android phones" — via **EAS** (Expo Application Services). Written while setting
this up for **Memo**, but the steps are generic — reusable for any future Expo
project (just swap the project name/ID).

**Last updated:** 2026-08-17

---

## 0. Background — what EAS actually is

- **Expo Go** (the app used so far) is a *shared* pre-built container app — fine for
  development, but it can't include this project's own icon, name, or any native
  module Expo Go itself doesn't ship with. It also can't be handed to someone else
  as "the app."
- **EAS Build** compiles a real, standalone binary (`.apk`/`.aab` for Android,
  `.ipa` for iOS) that is *this* app — own icon, own name, installable directly on
  a phone, no Expo Go required to run it.
- **EAS** (the service) is free to start (limited free build queue/minutes per
  month; paid tiers exist for heavier use) — no cost for occasional personal-project
  builds.
- Two Android output formats matter here:
  - **AAB** (Android App Bundle) — what Google Play *requires* for Play Store
    submission. **Cannot** be installed directly on a phone.
  - **APK** — a plain installable file. This is what you want for "let testers
    install it directly," sideloaded, no Play Store involved.

---

## 1. One-time account setup

1. Create a free account at [expo.dev](https://expo.dev) if you don't have one
   (email/password or GitHub login).
2. On expo.dev, create a project (or use the "Existing project" flow shown when you
   open a repo that's already connected). This gives you a **project ID** (a UUID,
   e.g. `b16334de-4074-4160-86b8-dbfaf448032f`) — expo.dev shows the exact `eas init`
   command with your ID already filled in; copy it from there rather than typing it
   by hand.

## 2. Log in to EAS CLI from the terminal

No global install needed — `npx` fetches `eas-cli` on demand each time.

```bash
npx eas-cli@latest login
```

Enter the same email/password used on expo.dev. Verify it worked:

```bash
npx eas-cli@latest whoami
```

Should print your Expo username, not "Not logged in."

**Troubleshooting — `Invalid package config` / `ERR_INVALID_PACKAGE_CONFIG`:** a
corrupted `npx` cache entry. Fix by clearing it, then re-run the command:

- Windows: delete `%LOCALAPPDATA%\npm-cache\_npx`
- macOS/Linux: `rm -rf ~/.npm/_npx`

## 3. Connect the local project to the expo.dev project

Run inside the project root (where `package.json`/`app.json` live):

```bash
npx eas-cli@latest init --id <your-project-id-from-expo.dev>
```

What this does: writes `extra.eas.projectId` into `app.json` under the `expo` key,
linking this codebase to the project you created on expo.dev. Commit that change —
it's small and needed by anyone else building this project.

**Troubleshooting — `Project slug (x) does not match the value configured in the
"slug" field (Y)`:** expo.dev auto-generates the project's slug (lowercase,
kebab-case) from the name you gave it when creating the project; `app.json`'s
`slug` field must match **exactly**, including case. If they differ, `init` links
the project (writes `projectId`) but then fails this check — fix by editing
`app.json`'s `slug` to match what's on expo.dev (check the project's dashboard URL,
`expo.dev/accounts/<owner>/projects/<slug>`, for the exact value), then re-run
`init`; it will say "Project already linked" and just proceed. Avoid `--force`
here — it renames the *remote* project's slug to match your local one instead,
which isn't what you want if the remote slug is already correct.

## 4. Generate `eas.json` (build profiles)

```bash
npx eas-cli@latest build:configure
```

This creates `eas.json` in the project root with default build **profiles** —
named configurations (`development`, `preview`, `production` by default) that each
build command picks via `--profile <name>`. `init` sometimes offers to run this
step automatically; if it doesn't ask, run it explicitly. Commit `eas.json`.

**Troubleshooting — `Input is required, but stdin is not readable` /
`Failed to display prompt: Which platforms would you like to configure for EAS
Build?`:** happens when the terminal running the command can't handle an
interactive prompt (e.g. a non-interactive shell, some IDE-embedded terminals, CI).
The plain `build:configure` normally asks *which platform(s)* interactively —
skip that prompt by passing the platform directly:

```bash
npx eas-cli@latest build:configure --platform android
```

`--platform android` means "only set up the Android side of this config, skip
iOS" — correct here since the goal is Android APKs for direct-install testing, not
an iOS build. (Use `--platform all` instead if a prompt-capable terminal is
available and both platforms are wanted.)

### Why the profile matters for Android format

- `production` profile → builds an **AAB** by default (Play Store format, **not**
  directly installable).
- `preview` profile → builds an **APK** by default (`"buildType": "apk"`) —
  installable directly on any Android phone. **This is the one to use for handing
  the app to testers without going through the Play Store.**

Check/edit `eas.json` after generation — confirm the profile you intend to use has:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

**In practice, the auto-generated `preview` profile from `build:configure` does
*not* include `"android": { "buildType": "apk" }`** — it only sets
`"distribution": "internal"`. `distribution: internal` controls *who can install
the build* (registered test devices, no store review), not the file format —
without an explicit `buildType`, Android still defaults to **AAB**. This line must
be added by hand every time; it's not there out of the box.

**Action taken for Memo (2026-08-17):** edited `eas.json` by hand to add
`"android": { "buildType": "apk" }` inside the `preview` profile, so it now reads:

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

Treat this as a required step, not optional troubleshooting — every fresh
`build:configure` run needs this same manual addition before `--profile preview`
actually produces an installable APK.

If you want `production` itself to output an APK instead of AAB (e.g. no Play Store
release planned yet), add `"android": { "buildType": "apk" }` to that profile
instead — but keeping `preview` as the APK profile and reserving `production` for
an eventual real Play Store AAB is the cleaner long-term split.

## 4b. Set the Android package name (`android.package` in `app.json`)

Running a non-interactive build (see §5) without this set fails with:

```
The "android.package" is required to be set in app config when running in non-interactive mode.
```

Expo's interactive CLI can prompt for this and fill it in automatically; a
non-interactive build (any CI, or a terminal that can't handle prompts — see §4's
stdin note) can't, so it must already be in `app.json` beforehand. Add it under
`expo.android`:

```json
"android": {
  "package": "com.yourdomain.yourapp"
}
```

**This is effectively permanent — treat it like a domain name, not a config
value to bikeshed later.** It's the app's unique identity on a device and (if ever
published) on the Play Store; it's also tied to the Android signing keystore EAS
generates on the first build (§5). Changing it after real users have installed the
app means it looks like installing a brand-new app, not an update. Convention:
reverse-domain notation, lowercase, no hyphens — `com.<yourname-or-org>.<appname>`.

**Action taken for Memo (2026-08-17):** set `"package": "com.marina.memo"`.

## 5. Run the build

```bash
npx eas-cli@latest build --platform android --profile preview
```

- This uploads the project to Expo's build servers (**cloud build** — no Android
  Studio / local SDK needed on this machine).
- First Android build ever for a project: EAS offers to generate a new Android
  **keystore** (signing credentials) and store it on Expo's servers — accept this
  unless you already manage your own keystore. This keystore must stay the same for
  every future build of the same app (needed to publish updates to the same app
  identity later), so let EAS manage/store it rather than regenerating it per build.
- The terminal shows a live queue/build log link (`https://expo.dev/accounts/.../builds/...`).
  A free-tier build typically takes several minutes (queue time varies).

**Confirmed working for Memo (2026-08-17):** first `eas build --platform android
--profile preview` run, with §3/§4/§4b's fixes (slug match, `buildType: apk`,
`android.package`) already in place, went straight through: resolved the
`preview` environment, initialized `versionCode` at 1, generated and stored a new
keystore on Expo's servers ("Using remote Android credentials (Expo server)" /
"Created keystore"), uploaded the project (~4.4 MB compressed), computed the build
fingerprint, then queued. Total hands-on time from a clean `eas.json` to "waiting
for build to complete" was a handful of commands, no further manual fixes needed.

**First Memo build completed successfully (2026-08-17).** Queue + build time was
long enough on the free tier that it was worth checking the live status page
instead of just staring at the terminal (see §5 note above) — status went
`queued` → `in progress` → `finished`. Terminal then printed a QR code directly
plus the same install link shown on the web dashboard:
`https://expo.dev/accounts/marbrezs-team/projects/memo/builds/1af2eb93-c66d-40dd-8b7c-940489c05f61`.
That per-build URL is permanent — reusable any time to re-download this exact
build or hand it to a new tester, no need to re-run `eas build` just to get the
link again.

**Aside — unrelated browser permission prompt:** while the build page was open,
Chrome/Edge showed an "expo.dev wants to Access other apps and services on this
device" prompt (a casting/display-related browser permission, not anything EAS
Build itself needs). Not required for checking build status or downloading the
APK — safe to **Block**.

## 6. Install & test on a phone

When the build finishes, the terminal (and the expo.dev build page) shows:

- A **direct download link** to the `.apk`.
- A **QR code** — scanning it with an Android phone's camera opens the download
  link directly on-device.

To install:

1. Open the link/QR on the Android phone.
2. Download the `.apk`.
3. Android will likely block install in **two separate ways**, both normal for any
   APK not from the Play Store, not a sign of anything wrong with the build:
   - **"Install unknown apps"** permission needed for the browser/file manager used
     — Settings → Apps → *(that app)* → Install unknown apps → Allow.
   - **Play Protect: "App blocked to protect your device"** — a *different* check
     (Google's on-device malware scanner), triggered because a brand-new APK has no
     download reputation yet, unrelated to the unknown-sources permission above.
     Two ways past it:
     - Look for a small **"Install anyway"** link on the same blocking screen
       (easy to miss — smaller text under the main message) and tap it.
     - If that link isn't there: Play Store app → profile icon (top right) → **Play
       Protect** → gear icon (settings) → turn off **"Scan apps with Play
       Protect"** → retry the install → turn the setting back on afterward (it was
       only off to let this one APK through).
4. Install, open — the app now runs standalone, own icon/name, no Expo Go involved.

**Sharing with other testers:** send them the same download link or QR (visible
again any time on the build's page at expo.dev/accounts/.../builds/...) — anyone
with the link can install it, no Expo account needed on their end.

## 7. Distributing updates after code changes

**Key thing to understand first: `git push` to GitHub does nothing to the app by
itself.** `eas build` uploads whatever's in the local project folder at the moment
you run it (see the "Compressing project files and uploading to EAS Build" step in
§5's log) — it does not pull from GitHub. Pushing to GitHub and building for
testers are two separate, unrelated steps unless GitHub integration is explicitly
set up (not covered here — see "Option B" below for why it's not needed for this
project's scale).

There are two ways to get a new version onto testers' phones. **Option A works
right now, no setup needed** — that's what Memo is using today. Option B is a
one-time setup for later, when faster iteration is worth it.

### Option A — rebuild & reshare (current approach, no setup required)

```bash
npx eas-cli@latest build --platform android --profile preview
```

- Every run produces a **new `.apk` with a new, different download link/QR code**
  (not the same URL as the previous build).
- Share that new link/QR with every tester again (chat, email, whatever channel).
- Each tester opens the new link, downloads, and installs over the old app —
  Android treats it as a normal update and **keeps existing app data**, as long as
  the signing keystore hasn't changed (EAS reuses the same stored keystore
  automatically — see §5).
- Each install goes through the same Play Protect / "unknown sources" prompts as
  the first install (§6) — expected every time, since each build is a brand-new
  APK with no reputation yet.
- **Use this for any change**, including native/config changes (new native module,
  icon, permission, `app.json` edits) — Option B below can't handle those.

### Option B — EAS Update (OTA), for later — not set up yet for Memo

For **JS/React-only changes** (no native module, icon, or `app.json` changes),
`expo-updates` lets you push an update that the already-installed app fetches and
applies **the next time it's opened** — no new APK, no manual reinstall by
testers. Meaningfully faster iteration once testing is frequent enough to matter.

**Not yet set up — do this when ready to switch:**

1. `npx expo install expo-updates` — adds the package.
2. Configure an **update channel** in `eas.json` (typically matching the `preview`
   build profile so preview builds check that channel) and confirm `app.json` has
   the `expo-updates` config Expo's install step adds automatically.
3. Rebuild once with `eas build` (Option A) — this rebuilt APK is the one that
   gains OTA capability; testers install it once the normal way.
4. From then on, for JS-only changes: `eas update --branch preview` (exact command
   depends on the channel/branch setup from step 2) pushes the update — no new
   APK, no new link to distribute, testers get it on next app open.
5. **Still need Option A (a full rebuild)** whenever a change touches native code,
   permissions, the app icon, or `app.json` — OTA only ever carries JS bundle
   changes, never a new binary.

Reference: [docs.expo.dev/eas-update/introduction](https://docs.expo.dev/eas-update/introduction/).

**Decision (2026-08-17):** staying on Option A for now — no immediate need for
faster iteration yet. Revisit Option B once update frequency makes manual
rebuild-and-reshare noticeably tedious.

## 8. Quick reference — full command sequence

```bash
npx eas-cli@latest login                                  # once per machine/account
npx eas-cli@latest whoami                                 # verify login
npx eas-cli@latest init --id <project-id>                 # once per project
npx eas-cli@latest build:configure                        # once per project (creates eas.json)
npx eas-cli@latest build --platform android --profile preview   # every time you want a new installable build
```

## 9. Applying this to a future project

1. Create the project on expo.dev, copy its project ID.
2. `npx eas-cli@latest login` (skip if already logged in on this machine).
3. `npx eas-cli@latest init --id <new-id>` inside that project's folder.
4. `npx eas-cli@latest build:configure`.
5. Confirm/edit `eas.json` so the profile you'll use builds an APK (§4 above).
6. `npx eas-cli@latest build --platform android --profile preview`.
7. Commit `app.json` (now has `extra.eas.projectId`) and `eas.json` to the repo so
   the link persists for anyone else building the project.
