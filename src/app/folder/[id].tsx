// Folder detail screen: lists the notes inside one folder (route param `id`)
// and offers per-note and whole-folder actions.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteRow } from '@/components/note-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FOLDER_COLORS, Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/hooks/use-theme-preference';
import { FolderColor } from '@/lib/types';

// "Border" thickness for the ghost "Add new note" tile (see
// addNoteTileOuter/Inner below).
const GHOST_BORDER = 2;

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // folder id from the URL
  const router = useRouter();
  const { folders, getFolder, notesInFolder, createNote, deleteNote, moveNote, deleteFolder, updateFolder } =
    useNotesStore();
  const theme = useTheme(); // for the default (no-background) note text colors
  const { scheme } = useThemePreference();
  // See the matching comment in app/index.tsx: this workaround is only valid
  // for dark mode (where theme.backgroundElement was confirmed invisible on
  // the author's device) — in light mode, use the real theme color.
  const ghostFill = scheme === 'dark' ? '#212225' : theme.backgroundElement;
  const folder = getFolder(id); // may be undefined if the folder was just deleted
  const notes = notesInFolder(id); // already sorted most-recent-first by the store

  // Local draft state for the rename/recolor panel (seeded from the folder when opened).
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<FolderColor>(FOLDER_COLORS[0]);

  // Open the edit panel pre-filled with the folder's current name/color.
  function startEditing() {
    setEditName(folder?.name ?? '');
    setEditColor(folder?.color ?? FOLDER_COLORS[0]);
    setIsEditing(true);
  }

  // Save the rename/recolor edit; ignore an empty name (nothing to save to).
  function handleSaveEdit() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateFolder(id, { name: trimmed, color: editColor });
    setIsEditing(false);
  }

  // Create a blank note here and open the editor immediately.
  function handleCreateNote() {
    const note = createNote(id);
    router.push(`/note/${note.id}`);
  }

  // Long-press menu for a single note: move to any other folder, or delete.
  function handleNoteOptions(noteId: string) {
    const otherFolders = folders.filter((f) => f.id !== id); // can't move into the current folder
    const moveOptions = otherFolders.map((f) => ({
      text: `Move to "${f.name}"`,
      onPress: () => moveNote(noteId, f.id),
    }));
    Alert.alert('Note', undefined, [
      ...moveOptions,
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(noteId) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Header "⋯" menu: edit (rename/recolor), or delete the whole folder behind
  // a second confirmation because it also removes every note inside it.
  function handleFolderOptions() {
    Alert.alert(folder?.name ?? 'Category', undefined, [
      { text: 'Edit', onPress: startEditing },
      {
        text: 'Delete category',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete this category?', 'All notes in this category will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                deleteFolder(id);
                router.back();
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
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
        {/* Rename/recolor panel, opened from the header "⋯" menu. */}
        {isEditing && (
          <ThemedView type="backgroundElement" style={styles.editPanel}>
            <TextInput
              autoFocus
              placeholder="Category name"
              value={editName}
              onChangeText={setEditName}
              onSubmitEditing={handleSaveEdit}
              style={styles.input}
            />
            <View style={styles.colorRow}>
              {FOLDER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setEditColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    editColor === c && { borderWidth: 3, borderColor: theme.text },
                  ]}
                />
              ))}
            </View>
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={styles.saveButton}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              accentColor={folder?.color}
              onPress={() => router.push(`/note/${item.id}`)}
              onLongPress={() => handleNoteOptions(item.id)}
            />
          )}
          // Always-visible outlined tile, full width, after the last real note.
          // Replaces the old floating "+ New note" button.
          ListFooterComponent={
            // "Border" built from two stacked solid fills (outer = grey, inner
            // = the card color), not borderWidth/borderColor — see the
            // addNoteTileOuter/Inner comment below for why. Grey instead of
            // white/theme.text: white rendered invisible on the author's
            // device specifically for this backgroundColor usage — likely
            // Android's "Force Dark" auto-darkening near-white colors,
            // unconfirmed. Mid-grey (#999999) is dark enough to be left alone
            // by that heuristic while still reading as light/neutral.
            <Pressable
              style={[styles.addNoteTileOuter, { backgroundColor: '#999999E6' }]}
              onPress={handleCreateNote}>
              <View style={[styles.addNoteTileInner, { backgroundColor: ghostFill }]}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  +
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.text }}>
                  Add new note
                </ThemedText>
              </View>
            </Pressable>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: { paddingTop: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  // Rename/recolor panel (same visual language as the "new category" panel on
  // the home screen: name field + color swatches + cancel/save row).
  editPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  saveButton: {
    backgroundColor: '#5B7FE0',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  // Ghost tile "border": two stacked solid-color views (see the matching
  // comment in index.tsx's ghostOuter/ghostInner) instead of
  // borderWidth/borderColor, which rendered inconsistently on Android. The
  // inner radius is the outer radius minus the padding (border thickness),
  // so the ring reads as an even width all the way around, corners included.
  // The inner view's padding/gap otherwise match NoteRow's `row` style so the
  // tile ends up close to the same size and shape as a real note row.
  addNoteTileOuter: {
    borderRadius: Spacing.two,
    padding: GHOST_BORDER, // border thickness
    marginTop: Spacing.half,
  },
  addNoteTileInner: {
    borderRadius: Spacing.two - GHOST_BORDER,
    padding: Spacing.three,
    gap: Spacing.half,
    alignItems: 'center',
  },
});
