// Loads the background-template gallery for the app.
//
// Metadata (id, tier, author, license, isDark…) lives in the JSON manifest at
// assets/templates/templates.json — that file doubles as the license ledger.
// But React Native's Metro bundler needs every image `require()` to use a
// STATIC string path, so we can't build a require from a variable. Instead we
// keep a small static map of id -> require(...) here and merge it with the
// manifest at load time. Adding a template = add its entry to templates.json
// AND one line to IMAGE_SOURCES below.
import type { ImageSource } from 'expo-image';

import manifest from '../../assets/templates/templates.json';

// Raw shape of one entry as stored in templates.json.
type TemplateManifestEntry = {
  id: string;
  file: string;
  tier: 'free' | 'paid';
  isDark: boolean; // true if the image is dark overall -> use light text on top
  source: string;
  sourceUrl: string;
  author: string;
  authorUrl: string;
  license: string;
  licenseUrl: string;
};

// A template ready to use in the UI: manifest metadata + the bundled image.
export type Template = TemplateManifestEntry & {
  source_image: ImageSource;
};

// Static require map — the one place that must list each image file literally.
const IMAGE_SOURCES: Record<string, ImageSource> = {
  'unsplash-drazen-nesic-eNbN61kv06s': require('../../assets/templates/drazen-nesic-eNbN61kv06s-unsplash.jpg'),
  'unsplash-kristaps-ungurs-uLZUavKaDRw': require('../../assets/templates/kristaps-ungurs-uLZUavKaDRw-unsplash.jpg'),
  'unsplash-smithsonian-k1OoIILF9yo': require('../../assets/templates/smithsonian-k1OoIILF9yo-unsplash.jpg'),
  'unsplash-dawid-zawila-hbUh0mnK7Tw': require('../../assets/templates/dawid-zawila-hbUh0mnK7Tw-unsplash.jpg'),
};

// The gallery: only entries whose image is actually bundled are included, so a
// manifest row without a matching require is skipped instead of crashing.
export const TEMPLATES: Template[] = (manifest.templates as TemplateManifestEntry[])
  .filter((entry) => IMAGE_SOURCES[entry.id])
  .map((entry) => ({ ...entry, source_image: IMAGE_SOURCES[entry.id] }));

// Look up a single template by id (used when a note references its background).
export function getTemplateById(id: string | undefined): Template | undefined {
  if (!id) return undefined;
  return TEMPLATES.find((t) => t.id === id);
}
