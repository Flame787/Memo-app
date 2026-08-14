// Note-appearance helpers: the pastel background palette, the text-color choices,
// and the contrast math that keeps note text readable on any background.
//
// Auto-contrast uses the WCAG relative-luminance + contrast-ratio method (not a
// naive "is the color light?" threshold): we compute the contrast ratio of the
// background against both a dark and a light ink, then pick whichever is higher.
// That's the same model accessibility tools use, so text stays legible even on
// mid-tone colors where a simple threshold guesses wrong.

// Ink colors we auto-pick between. Near-black/near-white read better than pure
// #000/#fff (a touch softer, less harsh on colored backgrounds).
export const DARK_INK = '#1A1A1A';
export const LIGHT_INK = '#FFFFFF';

// Pastel solid backgrounds offered in the picker. All are light, so auto-contrast
// will land on dark ink for these — but we still compute it rather than assume.
export const PASTEL_COLORS: string[] = [
  '#FADADD', // pink
  '#FDE1C2', // peach
  '#FEF3C7', // butter
  '#D8F3DC', // mint
  '#CDE7F0', // sky
  '#DBD4F0', // lavender
  '#F5D0C5', // coral
  '#E8E8E8', // soft grey
];

// Manual text-color overrides the user can force. `null` means "Auto" (let the
// contrast math decide) and is the default/recommended choice.
export const TEXT_COLOR_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'Auto', value: null },
  { label: 'White', value: LIGHT_INK },
  { label: 'Dark', value: DARK_INK },
  { label: 'Blue', value: '#1D3A8A' },
  { label: 'Red', value: '#8A1D2E' },
];

// Parse '#rgb' or '#rrggbb' into 0-255 channels; null if it isn't a hex color.
function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join(''); // #abc -> #aabbcc
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// WCAG relative luminance of a color (0 = black, 1 = white).
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  // Linearize each sRGB channel, then weight by human eye sensitivity.
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colors (1 = identical, 21 = black-on-white).
function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Pick the ink (dark or light) with the better contrast against a solid color.
export function autoInkForColor(backgroundColor: string): string {
  return contrastRatio(backgroundColor, DARK_INK) >= contrastRatio(backgroundColor, LIGHT_INK)
    ? DARK_INK
    : LIGHT_INK;
}

// Resolve the actual text color for a note, in priority order:
//   1. a manual override the user chose, else
//   2. auto-contrast from the note's background (solid color, or a template's
//      precomputed isDark flag), else
//   3. the theme's default text color (plain note, no custom background).
export function resolveNoteTextColor(opts: {
  manualTextColor?: string | null;
  backgroundColor?: string;
  templateIsDark?: boolean;
  fallback: string;
}): string {
  const { manualTextColor, backgroundColor, templateIsDark, fallback } = opts;
  if (manualTextColor) return manualTextColor;
  if (templateIsDark !== undefined) return templateIsDark ? LIGHT_INK : DARK_INK;
  if (backgroundColor) return autoInkForColor(backgroundColor);
  return fallback;
}

// A dimmed version of the text color for placeholder/secondary text on the note.
// Alpha as a 2-digit hex suffix (RN supports 8-digit hex colors).
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  const [r, g, b] = rgb.map((c) => c.toString(16).padStart(2, '0'));
  return `#${r}${g}${b}${a}`;
}
