// Note editor screen: edit a note's title and body with debounced autosave.
// There is no explicit "save" button — edits persist automatically.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';

// How long to wait after the last keystroke before writing to the store.
const AUTOSAVE_DELAY_MS = 500;

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // note id from the URL
  const router = useRouter();
  const { folders, getNote, getFolder, updateNote, deleteNote, moveNote } = useNotesStore();
  const note = getNote(id);

  // Editable fields are held in local state and seeded from the stored note.
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const folder = getFolder(note?.folderId ?? ''); // folder chip shown at the top

  // Keep the latest values in refs so the debounce timer and the unmount
  // flush always save what's actually on screen, never a stale closure.
  const latest = useRef({ title, content });
  latest.current = { title, content };
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave: on every edit, restart a timer; when it fires, write
  // the current values. The cleanup clears any pending timer so we don't save
  // stale values or fire after unmount.
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateNote(id, latest.current);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, id]);

  // Flush-on-leave: when the screen unmounts (user navigates back), save the
  // final state. A note left completely empty is discarded rather than kept as
  // a blank entry. Runs once per note id (deps: [id]).
  useEffect(() => {
    return () => {
      const { title: t, content: c } = latest.current;
      if (!t.trim() && !c.trim()) {
        deleteNote(id);
      } else {
        updateNote(id, { title: t, content: c });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Delete the note behind a confirmation, then return to the folder.
  function handleDelete() {
    Alert.alert('Obrisati bilješku?', undefined, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: () => {
          deleteNote(id);
          router.back();
        },
      },
    ]);
  }

  // Move this note to another folder via an action sheet of the other folders.
  function handleMove() {
    const otherFolders = folders.filter((f) => f.id !== note?.folderId);
    Alert.alert(
      'Premjesti u',
      undefined,
      [
        ...otherFolders.map((f) => ({ text: f.name, onPress: () => moveNote(id, f.id) })),
        { text: 'Odustani', style: 'cancel' as const },
      ],
    );
  }

  // Guard: the note may be gone (e.g. deleted from the folder screen). Show a
  // simple message instead of rendering the editor against a missing note.
  if (!note) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Bilješka ne postoji.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={12}>
              <ThemedText type="default">🗑</ThemedText>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Folder chip doubles as the "move to another folder" trigger. */}
        <Pressable
          style={[styles.folderChip, { backgroundColor: folder?.color ?? '#ccc' }]}
          onPress={handleMove}>
          <ThemedText type="small" style={styles.folderChipText}>
            {folder?.name ?? 'Kategorija'} · promijeni
          </ThemedText>
        </Pressable>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextInput
            placeholder="Naslov"
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
          />
          <TextInput
            placeholder="Piši ovdje…"
            value={content}
            onChangeText={setContent}
            multiline
            style={styles.contentInput}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  folderChip: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginTop: Spacing.two,
  },
  folderChipText: { color: '#fff' },
  scroll: { paddingVertical: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  titleInput: { fontSize: 22, fontWeight: '700' },
  contentInput: { fontSize: 16, lineHeight: 22, flex: 1, minHeight: 200, textAlignVertical: 'top' },
});
