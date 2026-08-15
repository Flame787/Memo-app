// Central state for the whole app: keeps the folder and note lists in memory,
// exposes mutation helpers, and persists changes to SQLite (storage.ts).
// Screens read and mutate data only through the `useNotesStore()` hook so
// there is a single source of truth.
//
// Persistence model (since the 2026-08-15 SQLite migration): every mutator
// below updates React state immediately (so the UI feels instant) and fires
// off the matching single-row SQLite write in the background, without
// awaiting it. This is "optimistic local update, persist async" — the same
// UX the old AsyncStorage version had, but the write on the SQLite side now
// touches one row instead of re-serializing every folder/note on every
// change (see Plan.md NFR-03). A write failing only logs a warning; it does
// not roll back the in-memory state, since retrying silently would be more
// surprising than a rare, logged miss for a local single-user app.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  deleteFolderRow,
  deleteNoteRow,
  getAllFolders,
  getAllNotes,
  hasSeeded,
  insertFolder,
  insertNote,
  markSeeded,
  updateFolderRow,
  updateNoteRow,
} from '@/lib/storage';
import { Folder, FolderColor, Note } from '@/lib/types';

// Generate a compact, collision-resistant id: base36 timestamp + random suffix.
// Good enough for a local, single-device app (no server coordination needed).
function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Fire-and-forget a persistence call: log if it fails, but never throw into
// the caller (a mutator's UI-facing return value already went out).
function persist(label: string, task: Promise<void>): void {
  task.catch((err) => console.error(`[notes-store] failed to persist ${label}:`, err));
}

// Public shape of the store, exposed through context. `loading` is true until
// the initial read from storage finishes; all mutators update in-memory state
// synchronously and persist to SQLite in the background (see file header).
type NotesStore = {
  loading: boolean;
  folders: Folder[];
  notes: Note[];
  createFolder: (name: string, color: FolderColor) => Folder;
  // Patch a folder's name and/or color (e.g. editing it after creation).
  updateFolder: (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => void;
  deleteFolder: (id: string) => void;
  notesInFolder: (folderId: string) => Note[];
  // Notes with no folder yet, most-recently-updated first.
  uncategorizedNotes: () => Note[];
  // Omit folderId (or pass undefined) to create an unsorted note.
  createNote: (folderId?: string) => Note;
  updateNote: (
    id: string,
    // Editable fields: text and appearance. Passing a field as `undefined`
    // clears it (used to switch a note between color/template/no background).
    patch: Partial<Pick<Note, 'title' | 'content' | 'backgroundColor' | 'backgroundTemplateId' | 'textColor'>>,
  ) => void;
  deleteNote: (id: string) => void;
  moveNote: (id: string, folderId: string) => void;
  getNote: (id: string) => Note | undefined;
  getFolder: (id: string) => Folder | undefined;
};

const NotesStoreContext = createContext<NotesStore | null>(null);

// Wraps the app (mounted in _layout.tsx) and provides the store to all screens.
export function NotesStoreProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // On mount: open/prepare the SQLite DB (db.ts also runs the one-time
  // AsyncStorage migration the first time this executes on a device), then
  // read folders and notes. On the very first launch ever (seeded flag not
  // set), skip the empty loaded data and seed one welcome category + note
  // instead, so the app isn't blank out of the box. The seed only ever runs
  // once: the flag stays set even if the user later deletes everything, so a
  // cleared app stays empty rather than getting the welcome content back.
  useEffect(() => {
    (async () => {
      const [loadedFolders, loadedNotes, seeded] = await Promise.all([getAllFolders(), getAllNotes(), hasSeeded()]);
      if (seeded) {
        setFolders(loadedFolders);
        setNotes(loadedNotes);
      } else {
        const folder: Folder = {
          id: makeId(),
          name: 'Category 1',
          color: '#46B67F', // emerald — same swatch as in the color picker
          createdAt: Date.now(),
        };
        const note: Note = {
          id: makeId(),
          folderId: folder.id,
          title: 'Hello!',
          content:
            'Welcome to the app. This is a first note. You can edit text, edit background template, or delete this note and create new ones.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await insertFolder(folder);
        await insertNote(note);
        await markSeeded();
        setFolders([folder]);
        setNotes([note]);
      }
      setLoading(false);
    })();
  }, []);

  // All mutators use functional setState updates so they never depend on a
  // stale copy of the list captured in a closure, and persist a single row to
  // SQLite in the background (see file header) rather than the whole list.
  const store: NotesStore = {
    loading,
    folders,
    notes,
    // Create a folder, append it, and return it so the caller can navigate to it.
    createFolder: (name, color) => {
      const folder: Folder = { id: makeId(), name, color, createdAt: Date.now() };
      setFolders((prev) => [...prev, folder]);
      persist('insertFolder', insertFolder(folder));
      return folder;
    },
    updateFolder: (id, patch) => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      persist('updateFolderRow', updateFolderRow(id, patch));
    },
    // Deleting a folder also removes every note inside it (mirrors the
    // database's ON DELETE CASCADE — see db.ts — in local state).
    deleteFolder: (id) => {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setNotes((prev) => prev.filter((n) => n.folderId !== id));
      persist('deleteFolderRow', deleteFolderRow(id));
    },
    // Notes for one folder, most-recently-updated first.
    notesInFolder: (folderId) => notes.filter((n) => n.folderId === folderId).sort((a, b) => b.updatedAt - a.updatedAt),
    uncategorizedNotes: () => notes.filter((n) => !n.folderId).sort((a, b) => b.updatedAt - a.updatedAt),
    // Create an empty note, in a folder or unsorted; title/content are filled in on the note screen.
    createNote: (folderId) => {
      const note: Note = {
        id: makeId(),
        folderId,
        title: '',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [...prev, note]);
      persist('insertNote', insertNote(note));
      return note;
    },
    // Patch text and/or appearance fields; always refresh updatedAt so ordering reflects the edit.
    updateNote: (id, patch) => {
      const updatedAt = Date.now();
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt } : n)));
      persist('updateNoteRow', updateNoteRow(id, { ...patch, updatedAt }));
    },
    deleteNote: (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      persist('deleteNoteRow', deleteNoteRow(id));
    },
    // Reassign a note to another folder; treated as an edit, so updatedAt bumps.
    moveNote: (id, folderId) => {
      const updatedAt = Date.now();
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, folderId, updatedAt } : n)));
      persist('updateNoteRow (move)', updateNoteRow(id, { folderId, updatedAt }));
    },
    // Lookup helpers used by the detail screens; return undefined if not found.
    getNote: (id) => notes.find((n) => n.id === id),
    getFolder: (id) => folders.find((f) => f.id === id),
  };

  return <NotesStoreContext.Provider value={store}>{children}</NotesStoreContext.Provider>;
}

// Convenience hook. Throws if used outside the provider so the mistake surfaces
// immediately during development instead of silently returning null.
export function useNotesStore(): NotesStore {
  const ctx = useContext(NotesStoreContext);
  if (!ctx) throw new Error('useNotesStore must be used within NotesStoreProvider');
  return ctx;
}
