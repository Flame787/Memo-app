// Note editor screen: edit a note's title and body with debounced autosave.
// There is no explicit "save" button — edits persist automatically.
// The note can also have a background (a pastel color or a template image); the
// text color auto-contrasts with that background so it always stays readable.
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import {
  PASTEL_COLORS,
  TEXT_COLOR_OPTIONS,
  resolveNoteTextColor,
  withAlpha,
} from '@/lib/appearance';
import { TEMPLATES, getTemplateById, type Template } from '@/lib/templates';

// How long to wait after the last keystroke before writing to the store.
const AUTOSAVE_DELAY_MS = 500;

// "DD.MM.YYYY." — dots as the date separator, full 4-digit year, including a
// trailing dot after it.
function formatDate(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

// "DD.MM.YYYY. HH:MM" — the time keeps the colon.
function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(ms)} ${hh}:${min}`;
}

// Wraps the editor body in the note's background: a template image (with a
// subtle scrim to keep text legible on busy photos), a solid pastel color, or
// the plain theme background when the note has none.
function NoteBackground({
  template,
  color,
  children,
}: {
  template?: Template;
  color?: string;
  children: ReactNode;
}) {
  if (template) {
    return (
      <View style={styles.bg}>
        <Image source={template.source_image} style={styles.bgFill} contentFit="cover" />
        {/* Scrim: darken dark images / lighten light ones a touch so text of the
            matching ink color reads well even over detailed areas. */}
        <View
          style={[
            styles.bgFill,
            { backgroundColor: template.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.30)' },
          ]}
        />
        {children}
      </View>
    );
  }
  if (color) {
    return <View style={[styles.bg, { backgroundColor: color }]}>{children}</View>;
  }
  return <ThemedView style={styles.bg}>{children}</ThemedView>;
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // note id from the URL
  const router = useRouter();
  const { folders, getNote, getFolder, updateNote, deleteNote, moveNote } = useNotesStore();
  const note = getNote(id);
  const theme = useTheme();

  // Editable text is held in local state and seeded from the stored note.
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [showAppearance, setShowAppearance] = useState(false); // 🎨 panel toggle
  const folder = getFolder(note?.folderId ?? ''); // folder chip shown at the top

  // Appearance is read live from the store (not local state) so a pick in the
  // panel re-renders the background and text color immediately.
  const template = getTemplateById(note?.backgroundTemplateId);
  const textColor = resolveNoteTextColor({
    manualTextColor: note?.textColor ?? null,
    backgroundColor: note?.backgroundColor,
    templateIsDark: template?.isDark,
    fallback: theme.text, // plain note -> normal theme text color
  });
  const placeholderColor = withAlpha(textColor, 0.5);

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

  // --- Appearance mutators. Setting a color clears the template and vice versa
  // (a note has at most one background); passing undefined clears the field. ---
  function pickColor(color: string) {
    updateNote(id, { backgroundColor: color, backgroundTemplateId: undefined });
  }
  function pickTemplate(templateId: string) {
    updateNote(id, { backgroundTemplateId: templateId, backgroundColor: undefined });
  }
  function clearBackground() {
    updateNote(id, { backgroundColor: undefined, backgroundTemplateId: undefined });
  }
  function pickTextColor(value: string | null) {
    updateNote(id, { textColor: value ?? undefined });
  }

  // Delete the note behind a confirmation, then return to the folder.
  function handleDelete() {
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
      'Move to',
      undefined,
      [
        ...otherFolders.map((f) => ({ text: f.name, onPress: () => moveNote(id, f.id) })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  // Guard: the note may be gone (e.g. deleted from the folder screen). Show a
  // simple message instead of rendering the editor against a missing note.
  if (!note) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">This note does not exist.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Whether "no background" is the current state (for the panel's active marker).
  const isPlain = !note.backgroundColor && !note.backgroundTemplateId;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              {/* Toggle the appearance (background + text color) panel. */}
              <Pressable onPress={() => setShowAppearance((s) => !s)} hitSlop={12}>
                <ThemedText type="default">🎨</ThemedText>
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={12}>
                <ThemedText type="default">🗑</ThemedText>
              </Pressable>
            </View>
          ),
        }}
      />
      <NoteBackground template={template} color={note.backgroundColor}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {/* Folder chip doubles as the "move to another folder" trigger. */}
          <Pressable
            style={[styles.folderChip, { backgroundColor: folder?.color ?? '#ccc' }]}
            onPress={handleMove}>
            <ThemedText type="small" style={styles.folderChipText}>
              {folder?.name ?? 'Category'} · change
            </ThemedText>
          </Pressable>

          {/* Appearance panel: its own solid card so its controls stay readable
              regardless of the note background behind it. */}
          {showAppearance && (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <ThemedText type="smallBold" style={styles.panelLabel}>
                Background
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {/* "None" resets to the plain theme background. */}
                <Pressable
                  onPress={clearBackground}
                  style={[styles.swatch, styles.noneSwatch, isPlain && styles.swatchSelected]}>
                  <ThemedText type="small">⊘</ThemedText>
                </Pressable>
                {/* Pastel solid colors. */}
                {PASTEL_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => pickColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      note.backgroundColor === c && styles.swatchSelected,
                    ]}
                  />
                ))}
                {/* Template image thumbnails. */}
                {TEMPLATES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTemplate(t.id)}
                    style={[styles.thumb, note.backgroundTemplateId === t.id && styles.swatchSelected]}>
                    <Image source={t.source_image} style={styles.thumbImage} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>

              <ThemedText type="smallBold" style={styles.panelLabel}>
                Text color
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {TEXT_COLOR_OPTIONS.map((opt) => {
                  const active = (note.textColor ?? null) === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      onPress={() => pickTextColor(opt.value)}
                      style={[styles.textChip, active && styles.textChipSelected]}>
                      {/* Auto has no color dot; explicit colors show a dot preview. */}
                      {opt.value && <View style={[styles.textDot, { backgroundColor: opt.value }]} />}
                      <ThemedText type="small">{opt.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </ThemedView>
          )}

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TextInput
              placeholder="Title"
              placeholderTextColor={placeholderColor}
              value={title}
              onChangeText={setTitle}
              style={[styles.titleInput, { color: textColor }]}
            />
            <TextInput
              placeholder="Write here…"
              placeholderTextColor={placeholderColor}
              value={content}
              onChangeText={setContent}
              multiline
              style={[styles.contentInput, { color: textColor }]}
            />
          </ScrollView>

          {/* Metadata footer: always visible, doesn't scroll away with the content. */}
          <View style={styles.metaFooter}>
            <ThemedText type="small" style={{ color: withAlpha(textColor, 0.65) }}>
              Created: {formatDate(note.createdAt)}
            </ThemedText>
            <ThemedText type="small" style={{ color: withAlpha(textColor, 0.65) }}>
              Edited: {formatDateTime(note.updatedAt)}
            </ThemedText>
          </View>
        </SafeAreaView>
      </NoteBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  bgFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  headerActions: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  folderChip: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginTop: Spacing.two,
  },
  folderChipText: { color: '#fff' },
  // Appearance picker card.
  panel: {
    marginTop: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panelLabel: { marginBottom: Spacing.half },
  optionRow: { gap: Spacing.two, alignItems: 'center', paddingRight: Spacing.two },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  noneSwatch: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,120,128,0.4)',
  },
  swatchSelected: { borderWidth: 3, borderColor: '#5B7FE0' },
  thumb: { width: 44, height: 36, borderRadius: Spacing.two, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  textChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(120,120,128,0.4)',
  },
  textChipSelected: { borderColor: '#5B7FE0', borderWidth: 2 },
  textDot: { width: 14, height: 14, borderRadius: 7 },
  scroll: { paddingVertical: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  titleInput: { fontSize: 22, fontWeight: '700' },
  contentInput: { fontSize: 16, lineHeight: 22, flex: 1, minHeight: 200, textAlignVertical: 'top' },
  metaFooter: { paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.half },
});
