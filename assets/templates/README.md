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
| `isDark`     | `true` if the image is dark overall → the app puts light text on it (see below) |
| `source`     | Where it came from (e.g. `"Unsplash"`)                             |
| `sourceUrl`  | Direct link to the original photo page                            |
| `author`     | Photographer / author name                                        |
| `authorUrl`  | Link to the author's profile                                      |
| `license`    | License name (e.g. `"Unsplash License"`)                          |
| `licenseUrl` | Link to the license text                                          |

## Adding a new template — checklist

1. Compress the image first (see `Plan.md` → Image asset optimization) and drop it here.
2. Add its entry to `templates.json`, including `isDark`.
3. Add one line to the static require map in `src/lib/templates.ts` (`IMAGE_SOURCES`):
   Metro needs a literal `require('...')` path, so this can't be automated from the manifest.
4. To get `isDark`, compute the image's average luminance (dark if < 0.5). One-off:
   ```
   python -c "from PIL import Image; im=Image.open('FILE.jpg').convert('RGB').resize((64,64)); px=list(im.getdata()); print(sum(0.2126*r+0.7152*g+0.0722*b for r,g,b in px)/(len(px)*255))"
   ```

### Example

```json
{
  "id": "unsplash-sunset-01",
  "file": "sunset-01.jpg",
  "tier": "free",
  "isDark": false,
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
