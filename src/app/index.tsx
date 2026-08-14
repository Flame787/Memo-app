// Home screen: a two-column grid of folders plus an inline "new folder" panel.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { FolderColor } from '@/lib/types';

// Swatches offered in the color picker; must be a subset of FolderColor.
const FOLDER_COLORS: FolderColor[] = [
  '#F45B69',
  '#F7A046',
  '#F6C445',
  '#6FCF97',
  '#4FB8E8',
  '#5B7FE0',
  '#9B6FD6',
  '#B0B4BA',
];

export default function FoldersScreen() {
  const router = useRouter();
  const { folders, notesInFolder, createFolder } = useNotesStore();
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Folder grid, two per row. Shows a friendly placeholder when empty. */}
        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="subtitle" style={styles.emptyEmoji}>
                📁
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nemaš još nijednu kategoriju. Dodaj prvu i počni spremati bilješke.
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.folderCard, { backgroundColor: item.color }]}
              onPress={() => router.push(`/folder/${item.id}`)}>
              <ThemedText type="default" style={styles.folderName}>
                {item.name}
              </ThemedText>
              <ThemedText type="small" style={styles.folderCount}>
                {notesInFolder(item.id).length} bilješki
              </ThemedText>
            </Pressable>
          )}
        />

        {/* Bottom of the screen toggles between the add panel and the FAB. */}
        {isAdding ? (
          <ThemedView type="backgroundElement" style={styles.addPanel}>
            <TextInput
              autoFocus
              placeholder="Naziv kategorije"
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
                  style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
                />
              ))}
            </View>
            <View style={styles.addActions}>
              <Pressable onPress={() => setIsAdding(false)} style={styles.cancelButton}>
                <ThemedText themeColor="textSecondary">Odustani</ThemedText>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.saveButton}>
                <ThemedText style={styles.saveButtonText}>Spremi</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : (
          // Floating action button that opens the add panel.
          <Pressable style={styles.fab} onPress={() => setIsAdding(true)}>
            <ThemedText style={styles.fabText}>+ Nova kategorija</ThemedText>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

// All spacing/radius values come from the shared Spacing scale so the UI stays
// consistent across screens. Folder cards and the FAB use fixed brand colors.
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
  folderName: { color: '#fff', fontWeight: '700' },
  folderCount: { color: 'rgba(255,255,255,0.85)' },
  empty: { padding: Spacing.five, borderRadius: Spacing.three, alignItems: 'center', gap: Spacing.two },
  emptyEmoji: { fontSize: 32 },
  emptyText: { textAlign: 'center' },
  fab: {
    backgroundColor: '#5B7FE0',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  fabText: { color: '#fff', fontWeight: '700' },
  addPanel: { borderRadius: Spacing.three, padding: Spacing.three, marginBottom: Spacing.three, gap: Spacing.three },
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
  swatchSelected: { borderWidth: 3, borderColor: '#000' },
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
