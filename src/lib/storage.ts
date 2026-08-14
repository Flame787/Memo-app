// Persistence layer: reads/writes the whole folder and note lists to the
// device's AsyncStorage as JSON. This is deliberately simple — the entire
// collection is serialized on each save. The notes store owns *when* to call
// these; this module only knows *how* to read and write.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Folder, Note } from '@/lib/types';

// Storage keys are namespaced with `memo.` to avoid clashing with other keys.
const FOLDERS_KEY = 'memo.folders';
const NOTES_KEY = 'memo.notes';

// Read all folders; returns an empty list on first run (nothing stored yet).
export async function loadFolders(): Promise<Folder[]> {
  const raw = await AsyncStorage.getItem(FOLDERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Overwrite the stored folder list with the current in-memory state.
export async function saveFolders(folders: Folder[]): Promise<void> {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

// Read all notes; returns an empty list on first run.
export async function loadNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(NOTES_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Overwrite the stored note list with the current in-memory state.
export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
