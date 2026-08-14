// Home screen: a two-column grid of folders (plus "add" tiles) and, below it,
// any unsorted notes waiting to be filed into a category.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteRow } from '@/components/note-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FOLDER_COLORS, Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import { autoInkForColor, withAlpha } from '@/lib/appearance';
import { Folder, FolderColor } from '@/lib/types';

// Sentinel ids for the non-folder cells appended to the grid: the two
// always-visible "add" tiles, and an invisible filler used only when the
// last tile would otherwise land alone in the final row (see below).
const ADD_CATEGORY_TILE_ID = '__add-category-tile__';
const ADD_NOTE_TILE_ID = '__add-note-tile__';
const SPACER_ID = '__grid-spacer__';

// "Border" thickness for the ghost tiles (see ghostOuter/ghostInner below).
const GHOST_BORDER = 3;

// A grid cell is either a real folder or one of the sentinels above, tagged
// with `kind` so renderItem can branch on it without ambiguity.
type GridItem =
  | (Folder & { kind: 'folder' })
  | { id: string; kind: 'add-category' }
  | { id: string; kind: 'add-note' }
  | { id: string; kind: 'spacer' };

export default function FoldersScreen() {
  const router = useRouter();
  const { folders, notesInFolder, uncategorizedNotes, createFolder, createNote, moveNote, deleteNote } =
    useNotesStore();
  // Theme text color doubles as the swatch-selection ring and the outlined
  // "add" tiles' border/text: white in dark mode, dark in light mode, so it's
  // always visible (a fixed black border would vanish on the dark theme).
  const theme = useTheme();
  // Local UI state for the inline add panel: whether it's open, and its draft fields.
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColor>(FOLDER_COLORS[0]);

  // Validate, create the folder, reset the draft, and jump straight into it.
  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return; // ignore empty/whitespace-only names
    const folder = createFolder(trimmed, color);
    setName('');
    setColor(FOLDER_COLORS[0]);
    setIsAdding(false);
    router.push(`/folder/${folder.id}`);
  }

  // Create a note with no folder yet, and open it straight away.
  function handleCreateUnsortedNote() {
    const note = createNote();
    router.push(`/note/${note.id}`);
  }

  // Long-press menu for an unsorted note: file it into any folder, or delete it.
  function handleUnsortedNoteOptions(noteId: string) {
    const moveOptions = folders.map((f) => ({
      text: `Move to "${f.name}"`,
      onPress: () => moveNote(noteId, f.id),
    }));
    Alert.alert('Note', undefined, [
      ...moveOptions,
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(noteId) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const unsorted = uncategorizedNotes();
  // Tint the "Add new category" tile with the first folder's color, so it
  // visually echoes "Category 1" (the seeded default). Falls back to the same
  // emerald used to seed it, in case every folder has since been deleted.
  const firstFolderColor = folders[0]?.color ?? '#46B67F';

  // Grid data: every folder, then the two "add" tiles, always last in that
  // order. FlatList's numColumns pairs items two-per-row in order; when that
  // would leave the last tile alone in the final row (RN stretches a lone
  // flex item to fill the row), append an invisible spacer to keep it
  // half-width instead.
  const countWithTiles = folders.length + 2;
  const gridData: GridItem[] = [
    ...folders.map((f) => ({ ...f, kind: 'folder' as const })),
    { id: ADD_CATEGORY_TILE_ID, kind: 'add-category' as const },
    { id: ADD_NOTE_TILE_ID, kind: 'add-note' as const },
    ...(countWithTiles % 2 !== 0 ? [{ id: SPACER_ID, kind: 'spacer' as const }] : []),
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Add-category panel, opened by tapping the grid tile. Placed above
            the grid (rather than at the bottom of the screen) so the on-screen
            keyboard never covers the name field or color picker. */}
        {isAdding && (
          <ThemedView type="backgroundElement" style={styles.addPanel}>
            <TextInput
              autoFocus
              placeholder="Category name"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              style={styles.input}
            />
            {/* Color picker: selected swatch gets a highlighted border. */}
            <View style={styles.colorRow}>
              {FOLDER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    color === c && { borderWidth: 3, borderColor: theme.text },
                  ]}
                />
              ))}
            </View>
            <View style={styles.addActions}>
              <Pressable onPress={() => setIsAdding(false)} style={styles.cancelButton}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.saveButton}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* Folder grid, two per row, followed by the "add" tiles. Below the
            grid (as the FlatList footer, so it isn't split into columns), any
            unsorted notes waiting to be filed into a category. */}
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === 'spacer') return <View style={styles.spacer} />;
            if (item.kind === 'add-category') {
              return (
                // "Border" built from two stacked solid fills (outer = grey,
                // inner = the card color) instead of borderWidth/borderColor —
                // see the ghostOuter/ghostInner comment below for why. Grey
                // instead of white/theme.text: white (both via theme.text and
                // as a hardcoded literal) rendered invisible on the author's
                // device specifically for this backgroundColor usage — likely
                // Android's "Force Dark" auto-darkening near-white colors,
                // unconfirmed. Mid-grey (#999999) is dark enough to be left
                // alone by that heuristic while still reading as light/neutral.
                <Pressable
                  style={[styles.folderCard, styles.ghostOuter, { backgroundColor: '#999999' }]}
                  onPress={() => setIsAdding(true)}>
                  <View style={[styles.ghostInner, { backgroundColor: '#212225' }]}>
                    {/* "+" and label match the first folder's color (falls back
                        to the same emerald used for the seeded "Category 1"
                        if the list is ever empty). */}
                    <ThemedText type="subtitle" style={{ color: firstFolderColor }}>
                      +
                    </ThemedText>
                    <ThemedText type="small" style={{ color: firstFolderColor }}>
                      Add new category
                    </ThemedText>
                  </View>
                </Pressable>
              );
            }
            if (item.kind === 'add-note') {
              return (
                <Pressable
                  style={[styles.folderCard, styles.ghostOuter, { backgroundColor: '#999999' }]}
                  onPress={handleCreateUnsortedNote}>
                  <View style={[styles.ghostInner, { backgroundColor: '#212225' }]}>
                    <ThemedText type="subtitle" style={{ color: theme.text }}>
                      +
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.text }}>
                      Add new note
                    </ThemedText>
                  </View>
                </Pressable>
              );
            }
            // Auto-contrast the card text against the folder color so it stays
            // readable on any tone (same rule the notes use).
            const ink = autoInkForColor(item.color);
            const count = notesInFolder(item.id).length;
            return (
              <Pressable
                style={[styles.folderCard, { backgroundColor: item.color }]}
                onPress={() => router.push(`/folder/${item.id}`)}>
                <ThemedText type="default" style={[styles.folderName, { color: ink }]}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: withAlpha(ink, 0.85) }}>
                  {count} {count === 1 ? 'note' : 'notes'}
                </ThemedText>
              </Pressable>
            );
          }}
          ListFooterComponent={
            unsorted.length > 0 ? (
              <View style={styles.unsortedSection}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.unsortedLabel}>
                  Unsorted
                </ThemedText>
                {unsorted.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    onPress={() => router.push(`/note/${n.id}`)}
                    onLongPress={() => handleUnsortedNoteOptions(n.id)}
                  />
                ))}
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// All spacing/radius values come from the shared Spacing scale so the UI stays
// consistent across screens.
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: { paddingTop: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  row: { gap: Spacing.three },
  folderCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  // Text color is always set inline (auto-contrast against the card color),
  // so only the non-color styling lives here.
  folderName: { fontWeight: '700' },
  // Ghost tile "border": two stacked solid-color views instead of
  // borderWidth/borderColor. RN's native border rendering (border + rounded
  // corners + a fill) looked inconsistently washed-out/transparent on
  // Android across several attempts; a padded outer view filled with a solid
  // color, containing a slightly-inset inner view filled with the card color,
  // can't render as "transparent" — it's just two opaque rectangles.
  // The inner radius is outer radius minus the padding (border thickness), so
  // the ring reads as an even width all the way around, corners included —
  // a mismatched inner radius is what made a thinner version of this look
  // uneven/"off" at the corners.
  ghostOuter: {
    padding: GHOST_BORDER, // border thickness
  },
  ghostInner: {
    flex: 1,
    borderRadius: Spacing.three - GHOST_BORDER, // matches folderCard's outer radius
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  // Invisible filler that only exists to keep a lone trailing tile at
  // half-width instead of stretching to fill the row (see gridData above).
  spacer: { flex: 1 },
  addPanel: { borderRadius: Spacing.three, padding: Spacing.three, marginBottom: Spacing.three, gap: Spacing.three },
  // "Unsorted" notes footer, below the folder grid.
  unsortedSection: { marginTop: Spacing.two, gap: Spacing.two },
  unsortedLabel: { marginBottom: Spacing.half },
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
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  saveButton: {
    backgroundColor: '#5B7FE0',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});
