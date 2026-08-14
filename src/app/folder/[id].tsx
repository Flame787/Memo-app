// Folder detail screen: lists the notes inside one folder (route param `id`)
// and offers per-note and whole-folder actions.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';

// Build the one-line preview shown under each note title: trim, fall back to a
// placeholder when empty, and cap the length with an ellipsis.
function preview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'Prazna bilješka';
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // folder id from the URL
  const router = useRouter();
  const { folders, getFolder, notesInFolder, createNote, deleteNote, moveNote, deleteFolder } = useNotesStore();
  const folder = getFolder(id); // may be undefined if the folder was just deleted
  const notes = notesInFolder(id); // already sorted most-recent-first by the store

  // Create a blank note here and open the editor immediately.
  function handleCreateNote() {
    const note = createNote(id);
    router.push(`/note/${note.id}`);
  }

  // Long-press menu for a single note: move to any other folder, or delete.
  function handleNoteOptions(noteId: string) {
    const otherFolders = folders.filter((f) => f.id !== id); // can't move into the current folder
    const moveOptions = otherFolders.map((f) => ({
      text: `Premjesti u "${f.name}"`,
      onPress: () => moveNote(noteId, f.id),
    }));
    Alert.alert('Bilješka', undefined, [
      ...moveOptions,
      { text: 'Obriši', style: 'destructive', onPress: () => deleteNote(noteId) },
      { text: 'Odustani', style: 'cancel' },
    ]);
  }

  // Header "⋯" menu: delete the whole folder, behind a second confirmation
  // because it also removes every note inside it.
  function handleFolderOptions() {
    Alert.alert(folder?.name ?? 'Kategorija', undefined, [
      {
        text: 'Obriši kategoriju',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Obrisati kategoriju?', 'Sve bilješke u ovoj kategoriji bit će trajno obrisane.', [
            { text: 'Odustani', style: 'cancel' },
            {
              text: 'Obriši',
              style: 'destructive',
              onPress: () => {
                deleteFolder(id);
                router.back();
              },
            },
          ]),
      },
      { text: 'Odustani', style: 'cancel' },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      {/* Set the header title to the folder name and add the options button. */}
      <Stack.Screen
        options={{
          title: folder?.name ?? '',
          headerRight: () => (
            <Pressable onPress={handleFolderOptions} hitSlop={12}>
              <ThemedText type="default">⋯</ThemedText>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nema bilješki u ovoj kategoriji.
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            // Tap opens the note; long-press opens the move/delete menu. The
            // left border is tinted with the folder's color for quick context.
            <Pressable
              style={[styles.noteRow, { borderLeftColor: folder?.color ?? '#ccc' }]}
              onPress={() => router.push(`/note/${item.id}`)}
              onLongPress={() => handleNoteOptions(item.id)}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {item.title.trim() || 'Bez naslova'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {preview(item.content)}
              </ThemedText>
            </Pressable>
          )}
        />
        {/* Floating action button: add a new note to this folder. */}
        <Pressable style={styles.fab} onPress={handleCreateNote}>
          <ThemedText style={styles.fabText}>+ Nova bilješka</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: { paddingTop: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  empty: { padding: Spacing.five, borderRadius: Spacing.three, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
  noteRow: {
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,120,128,0.08)',
    gap: Spacing.half,
  },
  fab: {
    backgroundColor: '#5B7FE0',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  fabText: { color: '#fff', fontWeight: '700' },
});
