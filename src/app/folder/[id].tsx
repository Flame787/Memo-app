// Folder detail screen: lists the notes inside one folder (route param `id`)
// and offers per-note and whole-folder actions.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
// for the header title and options menu, and to navigate to the note editor
import { CircleAlert, Folder as FolderIcon, NotepadText, Pencil, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
// for the rename/recolor panel, the note list, and the "Add new note" tile
import { SafeAreaView } from "react-native-safe-area-context";

import { NoteRow } from "@/components/note-row"; // row background and text auto-contrasted against it. Shared by the folder screen's note list and the home screen's "unsorted notes" list, so both stay visually and behaviorally identical.
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DESTRUCTIVE_COLOR, FOLDER_COLORS, Spacing } from "@/constants/theme"; // curated palette of harmonious colors for folders, used in the color picker and stored in the database
import { useNotesStore } from "@/hooks/use-notes-store"; // global notes/folders store (see use-notes-store.tsx) that owns the data and decides when to save it to storage
import { useTheme } from "@/hooks/use-theme"; // hook to get the current theme colors (light/dark mode, plus the actual color values for text, background, etc.)
import { useThemePreference } from "@/hooks/use-theme-preference"; // hook to get the user's system theme preference (light/dark) so we can adjust the ghost tile background color accordingly
import { withAlpha } from "@/lib/appearance"; // dims a theme color for placeholder text
import { FolderColor } from "@/lib/types"; // type for the fixed palette of folder colors, used in the color picker and stored in the database

export default function FolderScreen() {
  // Get the folder id from the URL, and the global notes/folders store.
  const { id } = useLocalSearchParams<{ id: string }>(); // folder id from the URL
  const router = useRouter();
  const {
    folders,
    getFolder,
    notesInFolder,
    createNote,
    deleteNote,
    moveNote,
    deleteFolder,
    updateFolder,
  } = useNotesStore();
  // global store that owns the notes/folders data and decides when to save it to storage
  const theme = useTheme(); // for the default (no-background) note text colors
  const { scheme } = useThemePreference();
  // See the matching comment in app/index.tsx: this workaround is only valid
  // for dark mode (where theme.backgroundElement was confirmed invisible on
  // the author's device) — in light mode, use the real theme color.
  const ghostFill = scheme === "dark" ? "#212225" : theme.backgroundElement;
  const folder = getFolder(id); // may be undefined if the folder was just deleted
  const notes = notesInFolder(id); // already sorted most-recent-first by the store

  // Local draft state for the rename/recolor panel (seeded from the folder when opened).
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<FolderColor>(FOLDER_COLORS[0]);
  // Header options menu toggle (Edit / Delete category panel, see below).
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  // "Delete this category?" confirmation panel toggle (replaces Alert.alert
  // so it matches the rest of the app's in-app panel look).
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Open the edit panel pre-filled with the folder's current name/color.
  function startEditing() {
    setEditName(folder?.name ?? "");
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
    Alert.alert("Note", undefined, [
      ...moveOptions,
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteNote(noteId),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  // Actually delete the folder, called from the confirmation panel below.
  function handleDeleteFolder() {
    setShowDeleteConfirm(false);
    deleteFolder(id);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      {/* Set the header title to the folder name and add the options button. */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleRow}>
              <FolderIcon size={18} color={theme.text} />
              <ThemedText type="default" style={{ color: theme.text }}>
                {folder?.name ?? ""}
              </ThemedText>
            </View>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowFolderMenu((s) => !s)} hitSlop={12}>
              <Pencil size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        {/* Folder options panel: same style as note/[id].tsx's panels (not
            Alert.alert — this app now uses one consistent in-editor panel
            look for every menu instead of the OS action-sheet style), with
            an explicit ✕ instead of a "Cancel" row, and icons next to each
            option so the destructive one is unmistakable at a glance. */}
        {showFolderMenu && (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <ThemedText type="smallBold" style={styles.panelLabel}>
                {folder?.name ?? "Category"}
              </ThemedText>
              <Pressable onPress={() => setShowFolderMenu(false)} hitSlop={8}>
                <X size={18} color={theme.text} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setShowFolderMenu(false);
                startEditing();
              }}
              style={styles.folderMenuRow}
            >
              <Pencil size={16} color={theme.text} />
              <ThemedText type="small">Edit</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowFolderMenu(false);
                setShowDeleteConfirm(true);
              }}
              style={styles.folderMenuRow}
            >
              <Trash2 size={16} color={DESTRUCTIVE_COLOR} />
              <ThemedText type="small" style={{ color: DESTRUCTIVE_COLOR }}>
                Delete category
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}
        {/* "Delete this category?" confirmation panel — same style as every
            other in-app panel (not a native Alert), closable via either the
            ✕ or "Cancel", with a red warning icon ahead of the consequence
            text and a red ✕ ahead of the actual "Delete" action. */}
        {showDeleteConfirm && (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <ThemedText type="smallBold" style={styles.panelLabel}>
                Delete this category?
              </ThemedText>
              <Pressable onPress={() => setShowDeleteConfirm(false)} hitSlop={8}>
                <X size={18} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.warningRow}>
              <CircleAlert size={16} color={DESTRUCTIVE_COLOR} />
              <ThemedText type="small" style={styles.warningText}>
                All notes in this category will be permanently deleted.
              </ThemedText>
            </View>
            <View style={styles.editActions}>
              <Pressable onPress={() => setShowDeleteConfirm(false)} style={styles.cancelButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleDeleteFolder} style={styles.folderMenuRow}>
                <Trash2 size={16} color={DESTRUCTIVE_COLOR} />
                <ThemedText type="small" style={{ color: DESTRUCTIVE_COLOR }}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}
        {/* Rename/recolor panel, opened from the folder options panel above. */}
        {isEditing && (
          <ThemedView type="backgroundElement" style={styles.editPanel}>
            <TextInput
              autoFocus
              placeholder="Category name"
              placeholderTextColor={withAlpha(theme.text, 0.5)}
              value={editName}
              onChangeText={setEditName}
              onSubmitEditing={handleSaveEdit}
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
            />
            <View style={styles.colorRow}>
              {FOLDER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setEditColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    editColor === c && {
                      borderWidth: 3,
                      borderColor: theme.text,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.editActions}>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={styles.cancelButton}
              >
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
          // Always-visible borderless tile, full width, after the last real note.
          // Replaces the old floating "+ New note" button.
          ListFooterComponent={
            <Pressable
              style={[styles.addNoteTile, { backgroundColor: ghostFill }]}
              onPress={handleCreateNote}
            >
              <NotepadText size={20} color={theme.text} />
              <ThemedText type="small" style={{ color: theme.text }}>
                Add new note
              </ThemedText>
            </Pressable>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// Styles for the folder screen, including the rename/recolor panel and the
// "Add new note" ghost tile.
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  // Folder options panel (Edit / Delete category) — same shape/radius as
  // note/[id].tsx's panels, so every in-app menu looks like one family.
  panel: {
    marginTop: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panelHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelLabel: { marginBottom: Spacing.half },
  folderMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
  },
  // Warning line in the "Delete this category?" panel: icon + consequence text.
  warningRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  warningText: { flex: 1 },
  // Rename/recolor panel (same visual language as the "new category" panel on
  // the home screen: name field + color swatches + cancel/save row).
  editPanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  colorRow: { flexDirection: "row", gap: Spacing.two, flexWrap: "wrap" },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.three,
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  saveButton: {
    backgroundColor: "#5B7FE0",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  // Borderless "ghost" tile, same fill as the panel background it sits on
  // (ghostFill) so it reads as an empty slot rather than a bordered box.
  addNoteTile: {
    borderRadius: Spacing.two,
    marginTop: Spacing.half,
    padding: Spacing.three,
    gap: Spacing.half,
    alignItems: "center",
  },
});
