// Core data model for the app. Folders group notes; a note usually belongs to
// one folder, but can also be "unsorted" (no folder yet) until the user files
// it. These types are the single source of truth shared by the storage layer,
// the notes store, and every screen.

// The fixed palette a folder can be tagged with. Kept as a string-literal union
// (rather than plain `string`) so the color picker and stored data stay in sync.
// A curated, harmonious set — card text auto-contrasts, so lighter tones are fine.
export type FolderColor =
  | '#E8617D' // rose red
  | '#EE9B3A' // amber
  | '#E3C567' // honey gold
  | '#46B67F' // emerald
  | '#33A6C4' // teal
  | '#6E63E5' // indigo violet
  | '#B863C9' // orchid magenta
  | '#E888B4' // pink
  | '#D6453F' // true red
  | '#E8752E' // tangerine
  | '#8FAE3C' // olive / lime
  | '#2E9E8A' // jade teal
  | '#2F86D6' // azure blue
  | '#4A4FB8' // deep indigo
  | '#7A4FC9' // violet
  | '#A6795A'; // terracotta brown

export type Folder = {
  id: string; // unique, generated once on creation (see makeId in the store)
  name: string;
  color: FolderColor;
  createdAt: number; // epoch ms; used for stable ordering
};

export type Note = {
  id: string; // unique, generated once on creation
  folderId?: string; // which folder this note lives in; absent = unsorted (not yet filed)
  title: string;
  content: string;
  createdAt: number; // epoch ms, set once
  updatedAt: number; // epoch ms, bumped on every edit/move; drives recent-first sorting
  // --- Appearance (all optional; absent = a plain note on the theme background) ---
  backgroundColor?: string; // pastel solid background (hex); mutually exclusive with backgroundTemplateId
  backgroundTemplateId?: string; // id of a template image used as the background
  textColor?: string; // manual text-color override; when absent, text auto-contrasts with the background
};
