# Background templates

Drop background-template image files in this folder, and add one entry per image
to [`templates.json`](./templates.json). The app reads that manifest to build the
in-app template gallery (see requirement #7 in `Plan.md`).

The manifest doubles as the **per-template license record** the plan requires: for
every template we keep its source, author, and license so the free/paid tiers stay
legally clean.

## Manifest entry schema

Each item in `templates.json` → `templates` is:

| Field        | Meaning                                                            |
|--------------|-------------------------------------------------------------------|
| `id`         | Stable unique id, referenced from a note (e.g. `unsplash-sunset-01`) |
| `file`       | File name in this folder (e.g. `sunset-01.jpg`)                    |
| `tier`       | `"free"` or `"paid"`                                               |
| `source`     | Where it came from (e.g. `"Unsplash"`)                             |
| `sourceUrl`  | Direct link to the original photo page                            |
| `author`     | Photographer / author name                                        |
| `authorUrl`  | Link to the author's profile                                      |
| `license`    | License name (e.g. `"Unsplash License"`)                          |
| `licenseUrl` | Link to the license text                                          |

### Example

```json
{
  "id": "unsplash-sunset-01",
  "file": "sunset-01.jpg",
  "tier": "free",
  "source": "Unsplash",
  "sourceUrl": "https://unsplash.com/photos/xxxxxxxxxxx",
  "author": "Jane Doe",
  "authorUrl": "https://unsplash.com/@janedoe",
  "license": "Unsplash License",
  "licenseUrl": "https://unsplash.com/license"
}
```

## Attribution & licensing notes

- **Unsplash (free tier):** attribution is **not legally required** by the Unsplash
  License, but it is appreciated and good practice. We keep `author`/`authorUrl` in
  the manifest regardless — it costs nothing and lets us show credit if we choose to.
- **Paid tier — caution:** the Unsplash License does **not** allow selling unmodified
  photos, nor compiling Unsplash photos to build a competing service. Do **not** put
  raw Unsplash images behind the paywall. Paid templates need either a different
  source whose license permits paid redistribution, or genuine added design value.
  Confirm per source before charging. (See #7 in `Plan.md`.)
