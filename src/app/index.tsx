// Home screen: a two-column grid of folders (plus "add" tiles) and, below it,
// any unsorted notes waiting to be filed into a category.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteRow } from '@/components/note-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FOLDER_COLORS, Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import { autoInkForColor, withAlpha } from '@/lib/appearance';
import { Folder, FolderColor } from '@/lib/types';

// Sentinel id for the always-visible "add category" tile appended to the grid.
const ADD_CATEGORY_TILE_ID = '__add-category-tile__';

// "Border" thickness for the ghost tiles (see ghostInner below).
const GHOST_BORDER = 2;

// A grid cell is either a real folder or the add-category sentinel, tagged
// with `kind` so renderItem can branch on it without ambiguity.
type GridItem = (Folder & { kind: 'folder' }) | { id: string; kind: 'add-category' };

export default function FoldersScreen() {
  const router = useRouter();
  const { folders, notesInFolder, uncategorizedNotes, createFolder, createNote, moveNote, deleteNote } =
    useNotesStore();
  // Theme text color doubles as the swatch-selection ring and the outlined
  // "add" tiles' border/text: white in dark mode, dark in light mode, so it's
  // always visible (a fixed black border would vanish on the dark theme).
  const theme = useTheme();
  // Exact per-card width in px, computed from the real screen width instead
  // of a percentage: a percentage + a fixed-px gap never quite add up to
  // 100% (the leftover slack piles up on one side, since the row's default
  // alignment is flex-start) — this guarantees both columns are the same
  // size and both outer margins match, on any screen width.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - Spacing.three * 2 - Spacing.three) / 2;
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

  // Grid data: every folder, then the "add category" tile, always last.
  // Each cell has a fixed % width (see folderCard) rather than flex:1, so a
  // lone trailing item — like this tile when the folder count is even — stays
  // half-width on its own instead of needing an invisible sibling to pair
  // with (RN's numColumns does not backfill a short last row).
  const gridData: GridItem[] = [
    ...folders.map((f) => ({ ...f, kind: 'folder' as const })),
    { id: ADD_CATEGORY_TILE_ID, kind: 'add-category' as const },
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

        {/* Folder grid, two per row, followed by the "add category" tile.
            Below the grid (as the FlatList footer, so it isn't split into
            columns): the "Unsorted" section — an always-visible, full-width
            "Add new note" tile, then any unsorted notes below it. */}
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
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
                  style={[styles.folderCard, styles.ghostOuter, { width: cardWidth, backgroundColor: '#999999E6' }]}
                  onPress={() => setIsAdding(true)}>
                  <View style={[styles.ghostInner, { backgroundColor: '#212225' }]}>
                    <ThemedText type="subtitle" style={{ color: theme.text }}>
                      +
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.text }}>
                      Add new category
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
                style={[styles.folderCard, { width: cardWidth, backgroundColor: item.color }]}
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
            <View style={styles.unsortedSection}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.unsortedLabel}>
                Unsorted notes
              </ThemedText>
              {/* Full-width ghost tile, same shape as a note row — always
                  visible here, above any existing unsorted notes. */}
              <Pressable
                style={[styles.unsortedAddOuter, { backgroundColor: '#999999E6' }]}
                onPress={handleCreateUnsortedNote}>
                <View style={[styles.unsortedAddInner, { backgroundColor: '#212225' }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    +
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.text }}>
                    Add new note
                  </ThemedText>
                </View>
              </Pressable>
              {unsorted.map((n) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  onPress={() => router.push(`/note/${n.id}`)}
                  onLongPress={() => handleUnsortedNoteOptions(n.id)}
                />
              ))}
            </View>
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
  // Width is set inline per-render (see cardWidth above), computed in px from
  // the real screen width — not flex:1 (its rendered width depends on what
  // else shares its row, and can drift when a sibling has different internal
  // padding) and not a % (never quite adds up to 100% alongside a fixed-px
  // gap, leaving uneven slack on one side). A fixed px width sidesteps both:
  // every card is the same size whether paired with another card or sitting
  // alone as the last, odd one out, with symmetric margins on any screen.
  folderCard: {
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
  // Android across several attempts; a padded outer fill containing a
  // slightly-inset inner view filled with the card color can't render as
  // "transparent" — it's just two opaque rectangles. Now that folderCard has
  // a fixed width (see above) rather than flex:1, this tile's own padding no
  // longer needs to match a real folder card's — a fixed-width box is the
  // same size regardless of its own padding, so ghostOuter can safely differ.
  ghostOuter: {
    padding: GHOST_BORDER, // border thickness
  },
  ghostInner: {
    flex: 1,
    borderRadius: Spacing.three - GHOST_BORDER, // inner radius = outer radius minus border thickness, so the ring is even at the corners
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
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
  // "Add new note" ghost tile in the Unsorted section: same two-layer solid-
  // fill "border" technique as ghostOuter/ghostInner, but sized like a
  // NoteRow (full width) instead of a square-ish folder card.
  unsortedAddOuter: {
    borderRadius: Spacing.two,
    padding: GHOST_BORDER,
  },
  unsortedAddInner: {
    borderRadius: Spacing.two - GHOST_BORDER,
    padding: Spacing.three,
    gap: Spacing.half,
    alignItems: 'center',
  },
});
