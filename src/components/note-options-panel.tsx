// Shared long-press menu for a note row: move it to another folder (or back
// to Unsorted), or delete it. Replaces three near-identical Alert.alert call
// sites (folder screen, home screen's Unsorted section, home screen's search
// results) that had no close (X) button, didn't match the rest of the app's
// panel styling, and — Android-specific — only reliably rendered ~3 buttons,
// silently hiding folders past the second one once a user had more than two
// categories (the same ceiling already hit and fixed for the note-type and
// move-to-folder pickers inside note/[id].tsx).
import { CircleAlert, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DESTRUCTIVE_COLOR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Folder } from '@/lib/types';

// Roughly 3 option rows tall before the list starts scrolling — matches how
// many folders used to fit in the old Alert on Android, but past that count
// this scrolls instead of silently dropping options.
const VISIBLE_OPTION_ROWS = 3;
const OPTION_ROW_HEIGHT = 44;

// Caller must pass `key={note.id}` when rendering this (see the three call
// sites) so switching the long-pressed note remounts it — otherwise the
// internal confirm-delete step below could stay open across notes.
export function NoteOptionsPanel({
  currentFolderId,
  folders,
  onClose,
  onMove,
  onDelete,
}: {
  // undefined when the note is already unsorted — hides "Move to Unsorted".
  currentFolderId: string | undefined;
  folders: Folder[];
  onClose: () => void;
  // undefined target means "move to Unsorted".
  onMove: (folderId: string | undefined) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  // "Delete note" is a two-step action, same as the folder screen's "Delete
  // this category?" panel — tapping it doesn't delete immediately, it swaps
  // this panel's content to a confirmation step first.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Never offer the folder the note is already in — only the others, plus
  // (below) Unsorted when applicable.
  const targets = folders.filter((f) => f.id !== currentFolderId);
  const showUnsortedOption = currentFolderId !== undefined;

  if (confirmingDelete) {
    return (
      <ThemedView type="backgroundElement" style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <ThemedText type="smallBold" style={styles.panelLabel}>
            Delete this note?
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={18} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.warningRow}>
          <CircleAlert size={16} color={DESTRUCTIVE_COLOR} />
          <ThemedText type="small" style={styles.warningText}>
            This note will be permanently deleted.
          </ThemedText>
        </View>
        <View style={styles.confirmActions}>
          <Pressable onPress={() => setConfirmingDelete(false)} style={styles.cancelButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.optionRow}>
            <Trash2 size={16} color={DESTRUCTIVE_COLOR} />
            <ThemedText type="small" style={{ color: DESTRUCTIVE_COLOR }}>
              Delete note
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <ThemedText type="smallBold" style={styles.panelLabel}>
          Note
        </ThemedText>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={18} color={theme.text} />
        </Pressable>
      </View>
      {/* Indicator hidden, same as the appearance panel's horizontal
          scrollers elsewhere in the app — the browser/OS default scrollbar
          read as heavy and out of place on this compact popover. */}
      <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
        {targets.map((f) => (
          <Pressable key={f.id} onPress={() => onMove(f.id)} style={styles.optionRow}>
            <ThemedText type="small">Move to &quot;{f.name}&quot;</ThemedText>
          </Pressable>
        ))}
        {/* Always the last move option, and only offered when the note is
            currently filed in a folder — moving an already-unsorted note "to
            Unsorted" is a no-op. */}
        {showUnsortedOption && (
          <Pressable onPress={() => onMove(undefined)} style={styles.optionRow}>
            <ThemedText type="small">Move to Unsorted notes</ThemedText>
          </Pressable>
        )}
        {targets.length === 0 && !showUnsortedOption && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
            No other categories yet.
          </ThemedText>
        )}
      </ScrollView>
      <Pressable onPress={() => setConfirmingDelete(true)} style={styles.optionRow}>
        <Trash2 size={16} color={DESTRUCTIVE_COLOR} />
        <ThemedText type="small" style={{ color: DESTRUCTIVE_COLOR }}>
          Delete note
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelLabel: { marginBottom: Spacing.half },
  optionsScroll: { maxHeight: VISIBLE_OPTION_ROWS * OPTION_ROW_HEIGHT },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
  },
  emptyHint: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.one },
  // Confirm-delete step — same shape as folder/[id].tsx's "Delete this
  // category?" panel, so both destructive confirmations look identical.
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  warningText: { flex: 1 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
});
