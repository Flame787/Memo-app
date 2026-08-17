// A single note preview row: title + one-line content preview, with the
// note's own background (template image or solid color) mirrored behind it
// and text auto-contrasted against it. Shared by the folder screen's note
// list and the home screen's "unsorted notes" list, so both stay visually
// and behaviorally identical.
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveNoteTextColor, withAlpha } from '@/lib/appearance';
import { formatSum, sumCalculationRows } from '@/lib/calculation';
import { getTemplateById } from '@/lib/templates';
import { Note } from '@/lib/types';

// Cap a preview string's length with an ellipsis.
function truncate(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

// Build the one-line preview shown under the title: for a plain note, the
// free-text content; for a checklist or daily schedule, a "done/total" count
// plus the item texts; for a calculation, the running total plus the row
// descriptions. Falls back to a placeholder when there's nothing to show yet.
function preview(note: Note): string {
  if (note.templateType === 'checklist' || note.templateType === 'daily_schedule') {
    const items = note.checklistItems ?? [];
    const withText = items.filter((i) => i.text.trim());
    if (withText.length === 0) return note.templateType === 'daily_schedule' ? 'Empty schedule' : 'Empty checklist';
    const done = items.filter((i) => i.done).length;
    return `${done}/${items.length} · ${truncate(withText.map((i) => i.text.trim()).join(', '))}`;
  }
  if (note.templateType === 'calculation') {
    const rows = note.calculationRows ?? [];
    const withDescription = rows.filter((r) => r.description.trim());
    if (withDescription.length === 0) return 'Empty calculation';
    return `= ${formatSum(sumCalculationRows(rows))} · ${truncate(withDescription.map((r) => r.description.trim()).join(', '))}`;
  }
  const trimmed = note.content.trim();
  return trimmed ? truncate(trimmed) : 'Empty note';
}

export function NoteRow({
  note,
  accentColor,
  onPress,
  onLongPress,
}: {
  note: Note;
  // Left-border tint, typically the parent folder's color. Notes with no
  // folder (unsorted) have no natural color, so this is optional.
  accentColor?: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const template = getTemplateById(note.backgroundTemplateId);
  // Whether the row needs a custom text color at all: either it has a
  // background to contrast against, or the user forced a manual color
  // (which applies regardless of background).
  const hasCustomTextColor = !!(template || note.backgroundColor || note.textColor);
  const textColor = resolveNoteTextColor({
    manualTextColor: note.textColor ?? null,
    backgroundColor: note.backgroundColor,
    templateIsDark: template?.isDark,
    fallback: theme.text,
  });

  return (
    // Tap opens the note; long-press opens the move/delete menu.
    <Pressable
      style={[
        styles.row,
        { borderLeftColor: accentColor ?? 'rgba(120,120,128,0.4)' },
        note.backgroundColor ? { backgroundColor: note.backgroundColor } : null,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}>
      {/* Template image fills the row, with a scrim for legibility. */}
      {template && (
        <>
          <Image source={template.source_image} style={styles.rowImage} contentFit="cover" />
          <View
            style={[
              styles.rowImage,
              { backgroundColor: template.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.30)' },
            ]}
          />
        </>
      )}
      <ThemedText type="smallBold" numberOfLines={1} style={hasCustomTextColor ? { color: textColor } : undefined}>
        {note.title.trim() || 'Untitled'}
      </ThemedText>
      <ThemedText
        type="small"
        numberOfLines={1}
        themeColor={hasCustomTextColor ? undefined : 'textSecondary'}
        style={hasCustomTextColor ? { color: withAlpha(textColor, 0.75) } : undefined}>
        {preview(note)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,120,128,0.08)',
    gap: Spacing.half,
    overflow: 'hidden', // clip the template image to the rounded row
  },
  // Template image / scrim fill the whole row; the text renders on top of it.
  rowImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
