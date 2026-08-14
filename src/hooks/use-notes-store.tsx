// Central state for the whole app: keeps the folder and note lists in memory,
// exposes mutation helpers, and transparently persists changes to AsyncStorage.
// Screens read and mutate data only through the `useNotesStore()` hook so there
// is a single source of truth.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { hasSeeded, loadFolders, loadNotes, markSeeded, saveFolders, saveNotes } from '@/lib/storage';
import { Folder, FolderColor, Note } from '@/lib/types';

// Generate a compact, collision-resistant id: base36 timestamp + random suffix.
// Good enough for a local, single-device app (no server coordination needed).
function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Public shape of the store, exposed through context. `loading` is true until
// the initial read from storage finishes; all mutators update in-memory state
// synchronously and let the persistence effects below write to disk.
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
  // Gate that stays false until the first load completes. It stops the save
  // effects below from overwriting stored data with the initial empty arrays
  // before real data has been read in.
  const hasLoaded = useRef(false);

  // On mount: read folders and notes in parallel, then open the save gate.
  // On the very first launch ever (seeded flag not set), skip the empty
  // loaded data and seed one welcome category + note instead, so the app
  // isn't blank out of the box. The seed only ever runs once: the flag stays
  // set even if the user later deletes everything, so a cleared app stays
  // empty rather than getting the welcome content back.
  useEffect(() => {
    (async () => {
      const [loadedFolders, loadedNotes, seeded] = await Promise.all([loadFolders(), loadNotes(), hasSeeded()]);
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
        setFolders([folder]);
        setNotes([note]);
        await markSeeded();
      }
      hasLoaded.current = true;
      setLoading(false);
    })();
  }, []);

  // Persist folders whenever they change (but not during the initial load).
  useEffect(() => {
    if (hasLoaded.current) saveFolders(folders);
  }, [folders]);

  // Persist notes whenever they change (but not during the initial load).
  useEffect(() => {
    if (hasLoaded.current) saveNotes(notes);
  }, [notes]);

  // All mutators use functional setState updates so they never depend on a
  // stale copy of the list captured in a closure.
  const store: NotesStore = {
    loading,
    folders,
    notes,
    // Create a folder, append it, and return it so the caller can navigate to it.
    createFolder: (name, color) => {
      const folder: Folder = { id: makeId(), name, color, createdAt: Date.now() };
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    updateFolder: (id, patch) => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    // Deleting a folder also removes every note inside it (no orphaned notes).
    deleteFolder: (id) => {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setNotes((prev) => prev.filter((n) => n.folderId !== id));
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
      return note;
    },
    // Patch text and/or appearance fields; always refresh updatedAt so ordering reflects the edit.
    updateNote: (id, patch) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
    },
    deleteNote: (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    // Reassign a note to another folder; treated as an edit, so updatedAt bumps.
    moveNote: (id, folderId) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, folderId, updatedAt: Date.now() } : n)));
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
