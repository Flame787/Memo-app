// Persistence layer: row-level CRUD against the SQLite tables opened in
// db.ts. Unlike the old AsyncStorage version of this file (pre-2026-08-15,
// see Plan.md NFR-03), a save here only ever touches the one row that
// changed — there is no more "read the whole array, rewrite the whole
// array" step. The notes store (use-notes-store.tsx) still owns *when* to
// call these; this module only knows *how* to read and write single rows.
import { getDb } from '@/lib/db';
import { ChecklistItem, Folder, FolderColor, Note, TemplateType } from '@/lib/types';

// SQLite rows are snake_case columns of primitives (no camelCase, no
// `undefined` — SQLite has NULL); these map a row back to the app's TS types.
type FolderRow = { id: string; name: string; color: string; created_at: number };
type NoteRow = {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  template_type: string;
  created_at: number;
  updated_at: number;
  background_color: string | null;
  background_template_id: string | null;
  text_color: string | null;
};
type ChecklistItemRow = {
  id: string;
  note_id: string;
  position: number;
  text: string;
  done: number;
  time: string | null;
};

function rowToFolder(row: FolderRow): Folder {
  return { id: row.id, name: row.name, color: row.color as FolderColor, createdAt: row.created_at };
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    folderId: row.folder_id ?? undefined,
    title: row.title,
    content: row.content,
    templateType: row.template_type as TemplateType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    backgroundColor: row.background_color ?? undefined,
    backgroundTemplateId: row.background_template_id ?? undefined,
    textColor: row.text_color ?? undefined,
  };
}

function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return { id: row.id, text: row.text, done: row.done === 1, time: row.time ?? undefined };
}

// Template types whose content lives in checklist_items rather than the
// notes.content column — checklist and daily_schedule share the same
// underlying row shape (see db.ts).
const ITEM_BASED_TEMPLATE_TYPES: TemplateType[] = ['checklist', 'daily_schedule'];

// --- Folders ---------------------------------------------------------------

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FolderRow>('SELECT * FROM folders ORDER BY created_at ASC;');
  return rows.map(rowToFolder);
}

export async function insertFolder(folder: Folder): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?);', [
    folder.id,
    folder.name,
    folder.color,
    folder.createdAt,
  ]);
}

export async function updateFolderRow(id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>): Promise<void> {
  const db = await getDb();
  // Build the SET clause from whichever fields were actually passed, so a
  // partial patch (e.g. just the color) never clobbers the other column.
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.color !== undefined) {
    fields.push('color = ?');
    values.push(patch.color);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?;`, values);
}

// Deleting a folder also deletes every note inside it — enforced by the
// `ON DELETE CASCADE` foreign key in db.ts, not by application code.
export async function deleteFolderRow(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM folders WHERE id = ?;', [id]);
}

// --- Notes -------------------------------------------------------------

// Loads every note, then attaches each one's checklist items (a single bulk
// query grouped in memory, not one query per note) — cheap at this app's
// scale, and keeps the in-memory `notes` array always fully hydrated so
// screens never need a separate async lookup just to render a preview.
export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const [noteRows, itemRows] = await Promise.all([
    db.getAllAsync<NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC;'),
    db.getAllAsync<ChecklistItemRow>('SELECT * FROM checklist_items ORDER BY note_id ASC, position ASC;'),
  ]);
  const itemsByNoteId = new Map<string, ChecklistItem[]>();
  for (const row of itemRows) {
    const list = itemsByNoteId.get(row.note_id) ?? [];
    list.push(rowToChecklistItem(row));
    itemsByNoteId.set(row.note_id, list);
  }
  return noteRows.map((row) => {
    const note = rowToNote(row);
    if (ITEM_BASED_TEMPLATE_TYPES.includes(note.templateType)) note.checklistItems = itemsByNoteId.get(note.id) ?? [];
    return note;
  });
}

export async function insertNote(note: Note): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO notes
      (id, folder_id, title, content, template_type, created_at, updated_at, background_color, background_template_id, text_color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      note.id,
      note.folderId ?? null,
      note.title,
      note.content,
      note.templateType,
      note.createdAt,
      note.updatedAt,
      note.backgroundColor ?? null,
      note.backgroundTemplateId ?? null,
      note.textColor ?? null,
    ],
  );
  if (ITEM_BASED_TEMPLATE_TYPES.includes(note.templateType) && note.checklistItems?.length) {
    await replaceChecklistItems(note.id, note.checklistItems);
  }
}

const NOTE_PATCH_COLUMNS = {
  title: 'title',
  content: 'content',
  folderId: 'folder_id',
  templateType: 'template_type',
  backgroundColor: 'background_color',
  backgroundTemplateId: 'background_template_id',
  textColor: 'text_color',
  updatedAt: 'updated_at',
} as const;

export async function updateNoteRow(
  id: string,
  patch: Partial<
    Pick<
      Note,
      | 'title'
      | 'content'
      | 'folderId'
      | 'templateType'
      | 'backgroundColor'
      | 'backgroundTemplateId'
      | 'textColor'
      | 'updatedAt'
    >
  >,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  // Iterate the fixed column map (not `Object.keys(patch)`) so a field
  // explicitly set to `undefined` in the patch — used elsewhere in the app to
  // mean "clear this" — still turns into a real `NULL` write, not a skip.
  for (const [key, column] of Object.entries(NOTE_PATCH_COLUMNS) as [keyof typeof NOTE_PATCH_COLUMNS, string][]) {
    if (!(key in patch)) continue;
    fields.push(`${column} = ?`);
    values.push((patch as Record<string, string | number | undefined>)[key] ?? null);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?;`, values);
}

export async function deleteNoteRow(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?;', [id]);
}

// --- Checklist items -----------------------------------------------------

export async function getChecklistItems(noteId: string): Promise<ChecklistItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChecklistItemRow>(
    'SELECT * FROM checklist_items WHERE note_id = ? ORDER BY position ASC;',
    [noteId],
  );
  return rows.map(rowToChecklistItem);
}

// Replaces a note's entire item list in one go: delete what's there, insert
// the new list in order. Simpler than tracking per-item inserts/updates/
// deletes against whatever the UI last had, and cheap enough at this app's
// scale (a checklist realistically has a handful to a few dozen items) —
// wrapped in a transaction so a note is never left with a partial list if
// this is interrupted partway through.
export async function replaceChecklistItems(noteId: string, items: ChecklistItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM checklist_items WHERE note_id = ?;', [noteId]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.runAsync(
        'INSERT INTO checklist_items (id, note_id, position, text, done, time) VALUES (?, ?, ?, ?, ?, ?);',
        [item.id, noteId, i, item.text, item.done ? 1 : 0, item.time ?? null],
      );
    }
  });
}

// --- Meta flags (first-launch seed) -----------------------------------

// Whether the one-time first-launch welcome content has already been created.
// Tracked as its own flag rather than inferred from "folders/notes are
// empty" — otherwise deleting everything later would bring the welcome
// category back on the next launch, which would be surprising.
export async function hasSeeded(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'seeded';");
  return row?.value === 'true';
}

export async function markSeeded(): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', 'true');");
}

// --- Meta flags (dark/light mode override, REQ-10) ----------------------

// The user's manual light/dark choice, if they've ever toggled it. `null`
// means "no manual choice yet" — the app should follow the OS scheme.
export async function getThemeOverride(): Promise<'light' | 'dark' | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'theme_override';");
  return row?.value === 'light' || row?.value === 'dark' ? row.value : null;
}

export async function setThemeOverride(value: 'light' | 'dark'): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('theme_override', ?);", [value]);
}
