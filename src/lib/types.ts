// Core data model for the app. Folders group notes; every note belongs to
// exactly one folder. These types are the single source of truth shared by the
// storage layer, the notes store, and every screen.

// The fixed palette a folder can be tagged with. Kept as a string-literal union
// (rather than plain `string`) so the color picker and stored data stay in sync.
export type FolderColor =
  | '#F45B69'
  | '#F7A046'
  | '#F6C445'
  | '#6FCF97'
  | '#4FB8E8'
  | '#5B7FE0'
  | '#9B6FD6'
  | '#B0B4BA';

export type Folder = {
  id: string; // unique, generated once on creation (see makeId in the store)
  name: string;
  color: FolderColor;
  createdAt: number; // epoch ms; used for stable ordering
};

export type Note = {
  id: string; // unique, generated once on creation
  folderId: string; // which folder this note lives in; changes when moved
  title: string;
  content: string;
  createdAt: number; // epoch ms, set once
  updatedAt: number; // epoch ms, bumped on every edit/move; drives recent-first sorting
};
