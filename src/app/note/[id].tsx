// Note editor screen: edit a note's title and body with debounced autosave.
// There is no explicit "save" button — edits persist automatically.
// The note can also have a background (a pastel color or a template image); the
// text color auto-contrasts with that background so it always stays readable.
// Since REQ-08, a note also has a template type (plain text, checklist, or
// daily schedule, more to come — Plan.md); the editor renders a different
// body per type but shares title, background, and autosave/flush machinery
// across all of them.
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
import { PASTEL_COLORS, TEXT_COLOR_OPTIONS, resolveNoteTextColor, withAlpha } from '@/lib/appearance';
import { makeId } from '@/lib/id';
import { TEMPLATES, getTemplateById, type Template } from '@/lib/templates';
import type { ChecklistItem, TemplateType } from '@/lib/types';

// How long to wait after the last keystroke before writing to the store.
const AUTOSAVE_DELAY_MS = 500;

// The template types offered in the "change type" picker, in display order.
// 'plain' is listed first even though 'checklist' is the default for *new*
// notes (REQ-08) — this order is about a stable, predictable list, not which
// one is the default.
const TEMPLATE_TYPE_OPTIONS: { type: TemplateType; label: string }[] = [
  { type: 'plain', label: 'Plain text' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'daily_schedule', label: 'Daily schedule' },
];

// Both 'checklist' and 'daily_schedule' store their content as a
// ChecklistItem[] (see lib/types.ts) rather than the plain `content` string —
// this is the shared test for "does this templateType use `items`".
function isItemBased(type: TemplateType): boolean {
  return type === 'checklist' || type === 'daily_schedule';
}

// Daily schedule's starting hourly skeleton: 05:00 through 22:00. Just a
// default — rows can be freely added, removed, and retimed afterwards (REQ-08).
const SCHEDULE_HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);

// --- Best-effort content conversion when switching template types (Plan.md
// D-01): never silently drop text. Each pair composes from these three
// primitives rather than needing its own dedicated function. ---

// Plain -> checklist: each non-empty line becomes an item; an empty note
// gets one blank item, ready to type into rather than an empty list.
function plainToChecklistItems(content: string): ChecklistItem[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [{ id: makeId(), text: '', done: false }];
  return lines.map((text) => ({ id: makeId(), text, done: false }));
}

// Checklist -> plain (also used for daily_schedule -> plain, after dropping
// time): join item texts back into lines, dropping blank items.
function checklistItemsToPlain(items: ChecklistItem[]): string {
  return items
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join('\n');
}

// Checklist -> daily schedule: merge existing non-blank items into the
// hourly skeleton in order (item N gets hour N); items beyond the skeleton's
// length are appended at the end with no time rather than dropped. Hours the
// skeleton has but no item filled stay as empty, ready-to-type rows.
function itemsToScheduleItems(items: ChecklistItem[]): ChecklistItem[] {
  const withText = items.filter((i) => i.text.trim());
  const scheduled = SCHEDULE_HOURS.map((time, i) =>
    withText[i] ? { ...withText[i], time } : { id: makeId(), text: '', done: false, time },
  );
  const overflow = withText.slice(SCHEDULE_HOURS.length).map((i) => ({ ...i, time: undefined }));
  return [...scheduled, ...overflow];
}

// Daily schedule -> checklist: drop the time label, keep text/done, and drop
// fully-blank rows (an empty hour slot the user never used carries nothing
// worth keeping as a checklist item).
function scheduleItemsToChecklist(items: ChecklistItem[]): ChecklistItem[] {
  const withText = items.filter((i) => i.text.trim()).map(({ id, text, done }) => ({ id, text, done }));
  return withText.length === 0 ? [{ id: makeId(), text: '', done: false }] : withText;
}

// Daily schedule -> plain: like checklistItemsToPlain, but prefixes each
// line with its time (if set) so that information isn't silently lost.
function scheduleItemsToPlain(items: ChecklistItem[]): string {
  return items
    .map((i) => i.text.trim())
    .map((text, idx) => (text && items[idx].time ? `${items[idx].time} ${text}` : text))
    .filter(Boolean)
    .join('\n');
}

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
  const { folders, getNote, getFolder, updateNote, updateChecklistItems, deleteNote, moveNote } = useNotesStore();
  const note = getNote(id);
  const theme = useTheme();

  // Editable text/items are held in local state and seeded from the stored
  // note. Only one of content/items is actually shown at a time (based on
  // templateType), but both stay in state so switching types never loses
  // whichever one isn't currently visible.
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(note?.checklistItems ?? []);
  const [templateType, setTemplateType] = useState<TemplateType>(note?.templateType ?? 'checklist');
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
  const latest = useRef({ title, content, items, templateType });
  latest.current = { title, content, items, templateType };
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave: on every edit, restart a timer; when it fires, write
  // the current values. Only the field that matters for the current
  // templateType is persisted as content — the other stays local-only until
  // (if ever) the note is switched back to that type. The cleanup clears any
  // pending timer so we don't save stale values or fire after unmount.
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const { title: t, content: c, items: i, templateType: tt } = latest.current;
      updateNote(id, isItemBased(tt) ? { title: t, templateType: tt } : { title: t, content: c, templateType: tt });
      if (isItemBased(tt)) updateChecklistItems(id, i);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, items, templateType, id]);

  // Flush-on-leave: when the screen unmounts (user navigates back), save the
  // final state. A note left completely empty is discarded rather than kept
  // as a blank entry — "empty" means no title and either no content (plain)
  // or every item is blank (checklist/daily schedule). Runs once per note id
  // (deps: [id]).
  useEffect(() => {
    return () => {
      const { title: t, content: c, items: i, templateType: tt } = latest.current;
      const isEmpty = !t.trim() && (isItemBased(tt) ? i.every((item) => !item.text.trim()) : !c.trim());
      if (isEmpty) {
        deleteNote(id);
      } else {
        updateNote(id, isItemBased(tt) ? { title: t, templateType: tt } : { title: t, content: c, templateType: tt });
        if (isItemBased(tt)) updateChecklistItems(id, i);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Switch template type: converts existing content best-effort (Plan.md
  // D-01) rather than discarding it, and persists immediately — this is a
  // deliberate one-off action, not continuous typing, so it skips the
  // debounce.
  function changeTemplateType(next: TemplateType) {
    if (next === templateType) return;

    let nextContent = content;
    let nextItems = items;
    if (templateType === 'plain' && next === 'checklist') {
      nextItems = plainToChecklistItems(content);
      nextContent = '';
    } else if (templateType === 'plain' && next === 'daily_schedule') {
      nextItems = itemsToScheduleItems(plainToChecklistItems(content));
      nextContent = '';
    } else if (templateType === 'checklist' && next === 'plain') {
      nextContent = checklistItemsToPlain(items);
      nextItems = [];
    } else if (templateType === 'checklist' && next === 'daily_schedule') {
      nextItems = itemsToScheduleItems(items);
    } else if (templateType === 'daily_schedule' && next === 'plain') {
      nextContent = scheduleItemsToPlain(items);
      nextItems = [];
    } else if (templateType === 'daily_schedule' && next === 'checklist') {
      nextItems = scheduleItemsToChecklist(items);
    }

    setContent(nextContent);
    setItems(nextItems);
    setTemplateType(next);
    updateNote(id, isItemBased(next) ? { templateType: next, content: '' } : { templateType: next, content: nextContent });
    if (isItemBased(next)) updateChecklistItems(id, nextItems);
  }

  function handleChangeType() {
    Alert.alert(
      'Note type',
      undefined,
      [
        ...TEMPLATE_TYPE_OPTIONS.map((opt) => ({ text: opt.label, onPress: () => changeTemplateType(opt.type) })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  // --- Item mutators (checklist + daily schedule): all local-state-first,
  // autosaved via the debounce effect above like title/content already are. ---
  function addChecklistItem() {
    setItems((prev) => [...prev, { id: makeId(), text: '', done: false, time: templateType === 'daily_schedule' ? '' : undefined }]);
  }
  function updateChecklistItemText(itemId: string, text: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, text } : item)));
  }
  function updateChecklistItemTime(itemId: string, time: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, time } : item)));
  }
  function toggleChecklistItem(itemId: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)));
  }
  function removeChecklistItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

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
  const currentTypeLabel = TEMPLATE_TYPE_OPTIONS.find((o) => o.type === templateType)?.label ?? templateType;

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
          <View style={styles.chipsRow}>
            {/* Folder chip doubles as the "move to another folder" trigger. */}
            <Pressable
              style={[styles.folderChip, { backgroundColor: folder?.color ?? '#ccc' }]}
              onPress={handleMove}>
              <ThemedText type="small" style={styles.folderChipText}>
                {folder?.name ?? 'Category'} · change
              </ThemedText>
            </Pressable>
            {/* Type chip doubles as the "change template type" trigger. */}
            <Pressable
              style={[styles.typeChip, { borderColor: withAlpha(textColor, 0.4) }]}
              onPress={handleChangeType}>
              <ThemedText type="small" style={{ color: textColor }}>
                {currentTypeLabel} · change
              </ThemedText>
            </Pressable>
          </View>

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
            {isItemBased(templateType) ? (
              <View style={styles.checklist}>
                {items.map((item) => (
                  <View key={item.id} style={styles.checklistRow}>
                    {templateType === 'daily_schedule' && (
                      <TextInput
                        placeholder="00:00"
                        placeholderTextColor={placeholderColor}
                        value={item.time ?? ''}
                        onChangeText={(text) => updateChecklistItemTime(item.id, text)}
                        style={[styles.timeInput, { color: textColor }]}
                      />
                    )}
                    <Pressable
                      onPress={() => toggleChecklistItem(item.id)}
                      hitSlop={8}
                      style={[styles.checkbox, { borderColor: withAlpha(textColor, 0.5) }]}>
                      {item.done && <View style={[styles.checkboxFill, { backgroundColor: textColor }]} />}
                    </Pressable>
                    <TextInput
                      placeholder="List item"
                      placeholderTextColor={placeholderColor}
                      value={item.text}
                      onChangeText={(text) => updateChecklistItemText(item.id, text)}
                      style={[
                        styles.checklistInput,
                        { color: textColor },
                        item.done && styles.checklistInputDone,
                      ]}
                    />
                    <Pressable onPress={() => removeChecklistItem(item.id)} hitSlop={8}>
                      <ThemedText type="small" style={{ color: withAlpha(textColor, 0.6) }}>
                        ✕
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={addChecklistItem} style={styles.addItemRow}>
                  <ThemedText type="small" style={{ color: withAlpha(textColor, 0.75) }}>
                    + Add item
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <TextInput
                placeholder="Write here…"
                placeholderTextColor={placeholderColor}
                value={content}
                onChangeText={setContent}
                multiline
                style={[styles.contentInput, { color: textColor }]}
              />
            )}
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  folderChip: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  folderChipText: { color: '#fff' },
  typeChip: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
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
  // Checklist / daily-schedule body.
  checklist: { gap: Spacing.one, marginTop: Spacing.one },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timeInput: { width: 52, fontSize: 14, fontVariant: ['tabular-nums'] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFill: { width: 12, height: 12, borderRadius: 3 },
  checklistInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.one },
  checklistInputDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  addItemRow: { paddingVertical: Spacing.two, paddingLeft: Spacing.five },
  metaFooter: { paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.half },
});
