// Home screen: a two-column grid of folders (plus "add" tiles) and, below it,
// any unsorted notes waiting to be filed into a category.
import { Stack, useRouter } from 'expo-router';
import { FolderPen, LayoutGrid, Moon, NotepadText, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteRow } from '@/components/note-row';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FOLDER_COLORS, Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/hooks/use-theme-preference';
import { autoInkForColor, withAlpha } from '@/lib/appearance';
import { noteMatchesQuery } from '@/lib/search';
import { Folder, FolderColor, Note } from '@/lib/types';

// Sentinel id for the always-visible "add category" tile appended to the grid.
const ADD_CATEGORY_TILE_ID = '__add-category-tile__';

// A grid cell is either a real folder or the add-category sentinel, tagged
// with `kind` so renderItem can branch on it without ambiguity.
type GridItem = (Folder & { kind: 'folder' }) | { id: string; kind: 'add-category' };

export default function FoldersScreen() {
  const router = useRouter();
  const { folders, notes, getFolder, notesInFolder, uncategorizedNotes, createFolder, createNote, moveNote, deleteNote } =
    useNotesStore();
  // Theme text color doubles as the swatch-selection ring and the outlined
  // "add" tiles' border/text: white in dark mode, dark in light mode, so it's
  // always visible (a fixed black border would vanish on the dark theme).
  const theme = useTheme();
  const { scheme, setScheme } = useThemePreference();
  // The ghost tiles' fill was hardcoded near-black (see the comment at their
  // usage below) because `theme.backgroundElement` rendered invisible in dark
  // mode on the author's device — likely Android/MIUI "Force Dark" auto-
  // remapping near-white colors specifically when the system is in dark mode
  // (see Plan.md §8). That workaround only makes sense *for* dark mode: in
  // light mode there's no reason to expect the same failure (the light
  // palette's `backgroundElement` isn't a near-white value being auto-
  // darkened), and keeping it hardcoded there would put theme.text's black
  // "+"/label text on a permanently near-black tile — invisible. So the
  // workaround only applies when the resolved scheme is actually dark.
  const ghostFill = scheme === 'dark' ? '#212225' : theme.backgroundElement;
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
  // REQ-09 (text search; voice deferred, D-03/D-12): a persistent search bar
  // pinned at the bottom. While it has a query, it replaces the folder grid
  // with a flat, app-wide list of matching notes — search here is meant to
  // find a note regardless of which folder it's filed under.
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching
    ? notes.filter((n) => noteMatchesQuery(n, searchQuery)).sort((a, b) => b.updatedAt - a.updatedAt)
    : [];

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

  // Long-press menu for a search result: it could be filed in any folder (or
  // none), so exclude only its own current folder from the "move to" list —
  // same shape as handleUnsortedNoteOptions/handleNoteOptions elsewhere.
  function handleSearchResultOptions(note: Note) {
    const moveOptions = folders
      .filter((f) => f.id !== note.folderId)
      .map((f) => ({ text: `Move to "${f.name}"`, onPress: () => moveNote(note.id, f.id) }));
    Alert.alert(note.title.trim() || 'Note', undefined, [
      ...moveOptions,
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
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
      {/* Dark/light picker (REQ-10): both icons always visible, the active
          one full-opacity and the other dimmed, so the current mode is
          obvious at a glance. Tapping either sets that mode directly (not a
          flip) — the first tap turns today's OS-following behavior into a
          persisted manual choice, see use-theme-preference.tsx for why. */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleRow}>
              <LayoutGrid size={20} color={theme.text} />
              <ThemedText type="default" style={{ color: theme.text }}>
                Memo app
              </ThemedText>
            </View>
          ),
          headerRight: () => (
            <View style={styles.themePicker}>
              {/* Both icons are the same toggle, not two separate "pick this
                  mode" buttons — tapping either one flips light/dark, so
                  there's no dead icon that requires tapping the *other* one
                  to do anything. */}
              <Pressable onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} hitSlop={10}>
                <Sun size={24} color={scheme === 'light' ? theme.text : withAlpha(theme.text, 0.35)} />
              </Pressable>
              <Pressable onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} hitSlop={10}>
                <Moon size={24} color={scheme === 'dark' ? theme.text : withAlpha(theme.text, 0.35)} />
              </Pressable>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Add-category panel, opened by tapping the grid tile. Placed above
            the grid (rather than at the bottom of the screen) so the on-screen
            keyboard never covers the name field or color picker. */}
        {isAdding && (
          <ThemedView type="backgroundElement" style={styles.addPanel}>
            <TextInput
              autoFocus
              placeholder="Category name"
              placeholderTextColor={withAlpha(theme.text, 0.5)}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
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

        {/* While searching, the grid/unsorted view is replaced entirely by a
            flat, app-wide list of matches — search is meant to find a note
            regardless of which folder (if any) it's filed under, not to
            filter the grid itself. */}
        {isSearching ? (
          // Distinct `key` from the grid FlatList below: without it, React
          // reuses the same underlying FlatList instance across the ternary
          // swap (same component type, same position in the tree) and just
          // diffs its numColumns prop from 2 to undefined — which FlatList
          // explicitly doesn't support changing on an existing instance and
          // throws for. A different key forces a real unmount/remount.
          <FlatList
            key="search-results"
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <NoteRow
                note={item}
                accentColor={getFolder(item.folderId ?? '')?.color}
                onPress={() => router.push(`/note/${item.id}`)}
                onLongPress={() => handleSearchResultOptions(item)}
              />
            )}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.emptySearch}>
                No notes found.
              </ThemedText>
            }
          />
        ) : (
          // Folder grid, two per row, followed by the "add category" tile.
          // Below the grid (as the FlatList footer, so it isn't split into
          // columns): the "Unsorted" section — an always-visible, full-width
          // "Add new note" tile, then any unsorted notes below it.
          <FlatList
            key="grid"
            data={gridData}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.kind === 'add-category') {
                return (
                  // Borderless "ghost" tile — same fill as the panel
                  // background (ghostFill) so it reads as an empty slot, not
                  // a bordered box.
                  <Pressable
                    style={[styles.folderCard, styles.ghostTile, { width: cardWidth, backgroundColor: ghostFill }]}
                    onPress={() => setIsAdding(true)}>
                    <FolderPen size={30} color={theme.text} />
                    <ThemedText type="small" style={{ color: theme.text }}>
                      Add new category
                    </ThemedText>
                  </Pressable>
                );
              }
              // Auto-contrast the card text against the folder color so it
              // stays readable on any tone (same rule the notes use).
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
                  style={[styles.unsortedAddTile, { backgroundColor: ghostFill }]}
                  onPress={handleCreateUnsortedNote}>
                  <NotepadText size={22} color={theme.text} />
                  <ThemedText type="small" style={{ color: theme.text }}>
                    Add new note
                  </ThemedText>
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
        )}

        {/* REQ-09: persistent search, pinned at the bottom of the screen. */}
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search notes" />
      </SafeAreaView>
    </ThemedView>
  );
}

// All spacing/radius values come from the shared Spacing scale so the UI stays
// consistent across screens.
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Larger gap (Spacing.three) than a typical icon row keeps the two 24px
  // icons' hitSlop zones from overlapping.
  themePicker: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
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
    // Matches NoteRow's radius (Spacing.two) rather than the softer
    // Spacing.three it used before — folder cards and note rows now read as
    // the same family of "box" across the app instead of two different
    // roundnesses.
    borderRadius: Spacing.two,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  // Text color is always set inline (auto-contrast against the card color),
  // so only the non-color styling lives here.
  folderName: { fontWeight: '700' },
  // Borderless "ghost" tile — filled with ghostFill (same tone as panel
  // backgrounds) so it reads as an empty slot rather than a bordered box.
  ghostTile: {
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
  // "Add new note" ghost tile in the Unsorted section: same borderless fill
  // as ghostTile, but sized like a NoteRow (full width) instead of a
  // square-ish folder card.
  unsortedAddTile: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.half,
    alignItems: 'center',
  },
  emptySearch: { textAlign: 'center', marginTop: Spacing.six },
});
