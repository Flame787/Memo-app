// SQLite connection, schema, and the one-time migration from the old
// AsyncStorage format. This replaces the "load the whole array, save the whole
// array" AsyncStorage model (storage.ts, pre-2026-08-15) with real tables and
// row-level reads/writes — the fix for the documented AsyncStorage limitation
// (Plan.md NFR-03): a save no longer rewrites every folder/note just because one
// changed.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import { Folder, Note } from '@/lib/types';

// The old AsyncStorage keys — only read here, once, to migrate existing data.
const OLD_FOLDERS_KEY = 'memo.folders';
const OLD_NOTES_KEY = 'memo.notes';
const OLD_SEEDED_KEY = 'memo.seeded';

// Cached connection promise so every caller shares one open database instead
// of re-opening it (expo-sqlite connections aren't free, and concurrent opens
// of the same file are a common source of "database is locked" bugs).
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndPrepareDb();
  }
  return dbPromise;
}

async function openAndPrepareDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('memo.db');

  // WAL = better concurrent read/write behavior; foreign_keys must be turned on
  // per-connection in SQLite (it defaults to off) for the ON DELETE CASCADE
  // below to actually take effect.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      background_color TEXT,
      background_template_id TEXT,
      text_color TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);

    -- Small key/value table for one-off flags (first-launch seed, migration
    -- done) instead of a whole extra AsyncStorage key per flag.
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await migrateFromAsyncStorageIfNeeded(db);

  return db;
}

// Runs once per install: if the app previously stored folders/notes in
// AsyncStorage (every install before this migration) and SQLite hasn't been
// populated from it yet, copy that data over row by row, then stop using the
// old keys. Safe to call on every app start — it's a no-op once the
// 'migrated_from_async_storage' flag is set.
async function migrateFromAsyncStorageIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const already = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'migrated_from_async_storage'",
  );
  if (already) return;

  const [rawFolders, rawNotes, rawSeeded] = await Promise.all([
    AsyncStorage.getItem(OLD_FOLDERS_KEY),
    AsyncStorage.getItem(OLD_NOTES_KEY),
    AsyncStorage.getItem(OLD_SEEDED_KEY),
  ]);
  const oldFolders: Folder[] = rawFolders ? JSON.parse(rawFolders) : [];
  const oldNotes: Note[] = rawNotes ? JSON.parse(rawNotes) : [];

  // One transaction: either the whole migration lands, or none of it does —
  // avoids ending up with half the folders copied if something throws partway
  // through (e.g. the app gets killed mid-migration).
  await db.withTransactionAsync(async () => {
    for (const folder of oldFolders) {
      await db.runAsync('INSERT OR IGNORE INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?);', [
        folder.id,
        folder.name,
        folder.color,
        folder.createdAt,
      ]);
    }
    for (const note of oldNotes) {
      await db.runAsync(
        `INSERT OR IGNORE INTO notes
          (id, folder_id, title, content, created_at, updated_at, background_color, background_template_id, text_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          note.id,
          note.folderId ?? null,
          note.title,
          note.content,
          note.createdAt,
          note.updatedAt,
          note.backgroundColor ?? null,
          note.backgroundTemplateId ?? null,
          note.textColor ?? null,
        ],
      );
    }
    if (rawSeeded === 'true') {
      await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', 'true');");
    }
    await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('migrated_from_async_storage', 'true');");
  });

  // Data now lives in SQLite — drop the old copies so there's only ever one
  // source of truth on disk.
  await AsyncStorage.multiRemove([OLD_FOLDERS_KEY, OLD_NOTES_KEY, OLD_SEEDED_KEY]);
}
