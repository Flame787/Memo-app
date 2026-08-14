"""
Compress JPEG/PNG images in a folder for use as mobile app assets.

Why this exists: raw phone/stock photos are 1-15 MB each — far too big to bundle
in the app. Run every new background template through this before committing it.

What it does per image:
  - respects EXIF orientation (so rotated phone photos don't come out sideways)
  - downscales so the longest side is at most --max px (never upscales)
  - re-encodes JPEG at --quality with optimize + progressive
  - strips metadata (EXIF/GPS) -> smaller + more private

Requires Pillow:  python -m pip install --user Pillow

Usage:
  python scripts/compress-images.py <folder> [--max 1600] [--quality 80] [--inplace]

Without --inplace it writes to a sibling "<folder>/compressed" folder so you can
compare before replacing. With --inplace it overwrites the files in place.
"""
import argparse
import os
from PIL import Image, ImageOps

# Only these get processed; everything else in the folder is left alone.
EXTS = {".jpg", ".jpeg", ".png"}


def human(n: int) -> str:
    """Format a byte count as a short human-readable string (e.g. 1.4MB)."""
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}" if unit == "B" else f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def compress(path: str, out_path: str, max_side: int, quality: int) -> None:
    """Load one image, downscale/re-encode it, and write it to out_path as JPEG."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)          # bake in orientation, then we can drop EXIF
        im = im.convert("RGB")                     # drop alpha/CMYK so it can be saved as JPEG
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))     # never upscale (cap at 1.0)
        if scale < 1.0:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)  # LANCZOS = high-quality downscale
        im.save(out_path, "JPEG", quality=quality, optimize=True, progressive=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--max", type=int, default=1600, help="max longest side in px")
    ap.add_argument("--quality", type=int, default=80, help="JPEG quality 1-95")
    ap.add_argument("--inplace", action="store_true", help="overwrite originals")
    args = ap.parse_args()

    # In-place writes back to the source folder; otherwise use a compare-first subfolder.
    out_dir = args.folder if args.inplace else os.path.join(args.folder, "compressed")
    os.makedirs(out_dir, exist_ok=True)

    before_total = after_total = 0
    for name in sorted(os.listdir(args.folder)):
        src = os.path.join(args.folder, name)
        if not os.path.isfile(src) or os.path.splitext(name)[1].lower() not in EXTS:
            continue
        before = os.path.getsize(src)
        # Always emit .jpg since we re-encode as JPEG (a .png input becomes .jpg).
        out_name = os.path.splitext(name)[0] + ".jpg"
        dst = os.path.join(out_dir, out_name)
        compress(src, dst, args.max, args.quality)
        after = os.path.getsize(dst)
        before_total += before
        after_total += after
        pct = (1 - after / before) * 100 if before else 0
        print(f"{name:45s} {human(before):>9s} -> {human(after):>9s}  (-{pct:.0f}%)")

    # Print a total savings line so the win is visible at a glance.
    if before_total:
        pct = (1 - after_total / before_total) * 100
        print("-" * 78)
        print(f"{'TOTAL':45s} {human(before_total):>9s} -> {human(after_total):>9s}  (-{pct:.0f}%)")


if __name__ == "__main__":
    main()
