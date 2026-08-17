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
import {
  ArrowDownUp,
  CalendarCheck2,
  Folder as FolderIcon,
  ListTodo,
  Palette,
  Pencil,
  SquarePlus,
  TextAlignJustify,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DESTRUCTIVE_COLOR, Spacing } from '@/constants/theme';
import { useNotesStore } from '@/hooks/use-notes-store';
import { useTheme } from '@/hooks/use-theme';
import { PASTEL_COLORS, TEXT_COLOR_OPTIONS, resolveNoteTextColor, withAlpha } from '@/lib/appearance';
import { formatSum, sumCalculationRows } from '@/lib/calculation';
import { makeId } from '@/lib/id';
import { TEMPLATES, getTemplateById, type Template } from '@/lib/templates';
import type { CalculationRow, ChecklistItem, TemplateType } from '@/lib/types';

// How long to wait after the last keystroke before writing to the store.
const AUTOSAVE_DELAY_MS = 500;

// Red is reserved for "this removes something" (a checklist item, a
// calculation row) — the app's shared destructive red (constants/theme.ts).
// A panel's own dismiss-without-doing-anything ✕ (Move to / Note type) is
// NOT this color; it uses the same color as the panel's other text/icons, so
// red stays a reliable "irreversible action" signal instead of decorating
// every ✕ regardless of what it does.
const X_ICON_COLOR = DESTRUCTIVE_COLOR;
// "+ Add item"/"+ Add row" use the app's existing brand accent (same blue as
// the Save button and selected-swatch rings elsewhere) instead of a dimmed
// copy of the note's ink color, so they read as an action, not plain text.
const ADD_ROW_COLOR = '#5B7FE0';

// The template types offered in the "change type" picker, in display order.
// 'plain' is listed first even though 'checklist' is the default for *new*
// notes (REQ-08) — this order is about a stable, predictable list, not which
// one is the default.
const TEMPLATE_TYPE_OPTIONS: { type: TemplateType; label: string; icon: LucideIcon }[] = [
  { type: 'plain', label: 'Plain text', icon: TextAlignJustify },
  { type: 'checklist', label: 'Checklist', icon: ListTodo },
  { type: 'daily_schedule', label: 'Daily schedule', icon: CalendarCheck2 },
  { type: 'calculation', label: 'Sum / Costs', icon: SquarePlus },
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

// Restricts a calculation row's amount input to digits, at most one leading
// "-", and at most one decimal separator (comma or dot — either is accepted
// while typing since the value is only ever parsed leniently at sum time,
// see lib/calculation.ts). Letters and any other characters are dropped
// rather than rejecting the whole edit, so pasting "12.50 EUR" still keeps
// the numeric part instead of refusing the input outright.
function sanitizeAmountInput(raw: string): string {
  const negative = raw.trim().startsWith('-');
  let digitsAndSep = raw.replace(/[^0-9,.]/g, '');
  const sepIndex = digitsAndSep.search(/[,.]/);
  if (sepIndex !== -1) {
    digitsAndSep = digitsAndSep.slice(0, sepIndex + 1) + digitsAndSep.slice(sepIndex + 1).replace(/[,.]/g, '');
  }
  return (negative ? '-' : '') + digitsAndSep;
}

// A calculation row rendered as one line of text: "description amount", or
// just the description if amount is blank. Used whenever converting *away*
// from calculation into a line-based type (plain/checklist/daily schedule).
function calculationRowToLine(row: CalculationRow): string {
  const desc = row.description.trim();
  const amt = row.amount.trim();
  if (!desc && !amt) return '';
  return amt ? `${desc} ${amt}`.trim() : desc;
}
function calculationRowsToPlain(rows: CalculationRow[]): string {
  return rows.map(calculationRowToLine).filter(Boolean).join('\n');
}
function calculationRowsToChecklistItems(rows: CalculationRow[]): ChecklistItem[] {
  const lines = rows.map(calculationRowToLine).filter(Boolean);
  return lines.length === 0 ? [{ id: makeId(), text: '', done: false }] : lines.map((text) => ({ id: makeId(), text, done: false }));
}

// Lines -> calculation rows: used converting *into* calculation from any
// line-based type. Each line becomes a description with a blank amount — a
// number can't be reliably recovered from free text, so this only carries
// over what's unambiguous (Plan.md D-01: best-effort, never a crash).
function linesToCalculationRows(lines: string[]): CalculationRow[] {
  const nonBlank = lines.filter(Boolean);
  return nonBlank.length === 0
    ? [{ id: makeId(), description: '', amount: '' }]
    : nonBlank.map((description) => ({ id: makeId(), description, amount: '' }));
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
  const { folders, getNote, getFolder, updateNote, updateChecklistItems, updateCalculationRows, deleteNote, moveNote } =
    useNotesStore();
  const note = getNote(id);
  const theme = useTheme();

  // Editable text/items/rows are held in local state and seeded from the
  // stored note. Only one of content/items/calcRows is actually shown at a
  // time (based on templateType), but all stay in state so switching types
  // never loses whichever one isn't currently visible.
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(note?.checklistItems ?? []);
  const [calcRows, setCalcRows] = useState<CalculationRow[]>(note?.calculationRows ?? []);
  const [templateType, setTemplateType] = useState<TemplateType>(note?.templateType ?? 'checklist');
  const [showAppearance, setShowAppearance] = useState(false); // 🎨 panel toggle
  const [showTypePicker, setShowTypePicker] = useState(false); // "Note type" panel toggle
  const [showMovePicker, setShowMovePicker] = useState(false); // "Move to" panel toggle
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // "Delete this note?" panel toggle
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
  const latest = useRef({ title, content, items, calcRows, templateType });
  latest.current = { title, content, items, calcRows, templateType };
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persists whichever field(s) matter for a given templateType — shared by
  // the debounced autosave and the unmount flush below, so the two can never
  // drift out of sync on which branch does what.
  function persistFor(
    tt: TemplateType,
    t: string,
    c: string,
    i: ChecklistItem[],
    rows: CalculationRow[],
  ) {
    if (isItemBased(tt)) {
      // content isn't used for this type — clear it so a stale copy from
      // before a plain -> checklist switch doesn't linger in the DB.
      updateNote(id, { title: t, content: '', templateType: tt });
      updateChecklistItems(id, i);
    } else if (tt === 'calculation') {
      updateNote(id, { title: t, content: '', templateType: tt });
      updateCalculationRows(id, rows);
    } else {
      updateNote(id, { title: t, content: c, templateType: tt });
    }
  }

  // Debounced autosave: on every edit, restart a timer; when it fires, write
  // the current values. Only the field(s) that matter for the current
  // templateType are persisted — the others stay local-only until (if ever)
  // the note is switched back to that type. The cleanup clears any pending
  // timer so we don't save stale values or fire after unmount.
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const { title: t, content: c, items: i, calcRows: rows, templateType: tt } = latest.current;
      persistFor(tt, t, c, i, rows);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, items, calcRows, templateType, id]);

  // Flush-on-leave: when the screen unmounts (user navigates back), save the
  // final state. A note left completely empty is discarded rather than kept
  // as a blank entry — "empty" means no title and, depending on type, no
  // content, or every item/row blank. Runs once per note id (deps: [id]).
  useEffect(() => {
    return () => {
      const { title: t, content: c, items: i, calcRows: rows, templateType: tt } = latest.current;
      const isEmpty =
        !t.trim() &&
        (tt === 'calculation'
          ? rows.every((row) => !row.description.trim() && !row.amount.trim())
          : isItemBased(tt)
            ? i.every((item) => !item.text.trim())
            : !c.trim());
      if (isEmpty) {
        deleteNote(id);
      } else {
        persistFor(tt, t, c, i, rows);
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
    let nextCalcRows = calcRows;
    if (templateType === 'plain' && next === 'checklist') {
      nextItems = plainToChecklistItems(content);
      nextContent = '';
    } else if (templateType === 'plain' && next === 'daily_schedule') {
      nextItems = itemsToScheduleItems(plainToChecklistItems(content));
      nextContent = '';
    } else if (templateType === 'plain' && next === 'calculation') {
      nextCalcRows = linesToCalculationRows(content.split('\n').map((l) => l.trim()));
      nextContent = '';
    } else if (templateType === 'checklist' && next === 'plain') {
      nextContent = checklistItemsToPlain(items);
      nextItems = [];
    } else if (templateType === 'checklist' && next === 'daily_schedule') {
      nextItems = itemsToScheduleItems(items);
    } else if (templateType === 'checklist' && next === 'calculation') {
      nextCalcRows = linesToCalculationRows(items.map((i) => i.text.trim()));
      nextItems = [];
    } else if (templateType === 'daily_schedule' && next === 'plain') {
      nextContent = scheduleItemsToPlain(items);
      nextItems = [];
    } else if (templateType === 'daily_schedule' && next === 'checklist') {
      nextItems = scheduleItemsToChecklist(items);
    } else if (templateType === 'daily_schedule' && next === 'calculation') {
      // Time labels don't carry over — a calculation row has no time
      // concept — but the text itself isn't dropped.
      nextCalcRows = linesToCalculationRows(items.map((i) => i.text.trim()));
      nextItems = [];
    } else if (templateType === 'calculation' && next === 'plain') {
      nextContent = calculationRowsToPlain(calcRows);
      nextCalcRows = [];
    } else if (templateType === 'calculation' && next === 'checklist') {
      nextItems = calculationRowsToChecklistItems(calcRows);
      nextCalcRows = [];
    } else if (templateType === 'calculation' && next === 'daily_schedule') {
      nextItems = itemsToScheduleItems(calculationRowsToChecklistItems(calcRows));
      nextCalcRows = [];
    }

    setContent(nextContent);
    setItems(nextItems);
    setCalcRows(nextCalcRows);
    setTemplateType(next);
    persistFor(next, title, nextContent, nextItems, nextCalcRows);
  }

  // --- Item mutators (checklist + daily schedule): all local-state-first,
  // autosaved via the debounce effect above like title/content already are. ---
  // `position` lets the Daily schedule template offer an "+ Add item" both
  // above and below the list (an appointment can belong anywhere in the day,
  // not just at the end) — Checklist only ever adds at the end.
  function addChecklistItem(position: 'start' | 'end' = 'end') {
    const item = { id: makeId(), text: '', done: false, time: templateType === 'daily_schedule' ? '' : undefined };
    setItems((prev) => (position === 'start' ? [item, ...prev] : [...prev, item]));
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

  // --- Calculation row mutators: same local-state-first, debounce-autosaved
  // pattern as the item mutators above. ---
  function addCalculationRow() {
    setCalcRows((prev) => [...prev, { id: makeId(), description: '', amount: '' }]);
  }
  function updateCalculationRowDescription(rowId: string, description: string) {
    setCalcRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, description } : row)));
  }
  function updateCalculationRowAmount(rowId: string, amount: string) {
    const sanitized = sanitizeAmountInput(amount);
    setCalcRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, amount: sanitized } : row)));
  }
  function removeCalculationRow(rowId: string) {
    setCalcRows((prev) => prev.filter((row) => row.id !== rowId));
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

  // Actually delete the note, called from the confirmation panel below.
  function handleDelete() {
    setShowDeleteConfirm(false);
    deleteNote(id);
    router.back();
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
  const currentTypeOption = TEMPLATE_TYPE_OPTIONS.find((o) => o.type === templateType);
  const currentTypeLabel = currentTypeOption?.label ?? templateType;
  // PascalCase alias so it can be used as a JSX tag below (React requires a
  // capitalized identifier to treat it as a component rather than an HTML tag).
  const CurrentTypeIcon = currentTypeOption?.icon ?? TextAlignJustify;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              {/* Toggle the appearance (background + text color) panel. */}
              <Pressable onPress={() => setShowAppearance((s) => !s)} hitSlop={12}>
                <Palette size={22} color={theme.text} />
              </Pressable>
              <Pressable onPress={() => setShowDeleteConfirm((s) => !s)} hitSlop={12}>
                <Trash2 size={22} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <NoteBackground template={template} color={note.backgroundColor}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.chipsRow}>
            {/* Folder chip toggles the move panel below (tap again to close
                without picking anything). */}
            <Pressable
              style={[styles.folderChip, { backgroundColor: folder?.color ?? '#ccc' }]}
              onPress={() => setShowMovePicker((s) => !s)}>
              <FolderIcon size={14} color="#fff" />
              <ThemedText type="small" style={styles.folderChipText}>
                {folder?.name ?? 'Category'}
              </ThemedText>
              <ArrowDownUp size={14} color="#fff" />
            </Pressable>
            {/* Type chip toggles the type panel below (tap again to close
                without picking anything — see that panel's own ✕ too). */}
            <Pressable
              style={[styles.typeChip, { borderColor: withAlpha(textColor, 0.4) }]}
              onPress={() => setShowTypePicker((s) => !s)}>
              <CurrentTypeIcon size={14} color={textColor} />
              <ThemedText type="small" style={{ color: textColor }}>
                {currentTypeLabel}
              </ThemedText>
              <Pencil size={14} color={textColor} />
            </Pressable>
          </View>

          {/* Delete-note panel: same style as every other panel here (not
              Alert.alert), closable via the ✕, with a red trash-can icon
              ahead of the actual "Delete note" action so it reads as
              different from a plain option at a glance. */}
          {showDeleteConfirm && (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <View style={styles.panelHeaderRow}>
                <ThemedText type="smallBold" style={styles.panelLabel}>
                  Delete this note?
                </ThemedText>
                <Pressable onPress={() => setShowDeleteConfirm(false)} hitSlop={8}>
                  <X size={18} color={theme.text} />
                </Pressable>
              </View>
              <Pressable onPress={handleDelete} style={styles.typeOptionRow}>
                <Trash2 size={16} color={X_ICON_COLOR} />
                <ThemedText type="small" style={{ color: X_ICON_COLOR }}>
                  Delete note
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {/* Move-to panel: a plain list (not Alert.alert — Android only
              reliably renders ~3 alert buttons, which would silently drop
              categories once there are more than a couple) with an explicit
              ✕ so it can be dismissed without picking anything. */}
          {showMovePicker && (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <View style={styles.panelHeaderRow}>
                <ThemedText type="smallBold" style={styles.panelLabel}>
                  Move this note to folder:
                </ThemedText>
                <Pressable onPress={() => setShowMovePicker(false)} hitSlop={8}>
                  <X size={18} color={theme.text} />
                </Pressable>
              </View>
              {folders
                .filter((f) => f.id !== note.folderId)
                .map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      moveNote(id, f.id);
                      setShowMovePicker(false);
                    }}
                    style={styles.typeOptionRow}>
                    <ThemedText type="small">{f.name}</ThemedText>
                  </Pressable>
                ))}
              {folders.filter((f) => f.id !== note.folderId).length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  No other categories yet.
                </ThemedText>
              )}
            </ThemedView>
          )}

          {/* Note type panel: a plain list (not Alert.alert — Android only
              reliably renders ~3 alert buttons, which silently dropped
              options once there were 4 template types + Cancel) with an
              explicit ✕ so it can be dismissed without picking anything. */}
          {showTypePicker && (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <View style={styles.panelHeaderRow}>
                <ThemedText type="smallBold" style={styles.panelLabel}>
                  Note type
                </ThemedText>
                <Pressable onPress={() => setShowTypePicker(false)} hitSlop={8}>
                  <X size={18} color={theme.text} />
                </Pressable>
              </View>
              {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.type}
                  onPress={() => {
                    changeTemplateType(opt.type);
                    setShowTypePicker(false);
                  }}
                  style={[styles.typeOptionRow, opt.type === templateType && styles.typeOptionRowSelected]}>
                  <opt.icon size={18} color={theme.text} />
                  <ThemedText type="small">{opt.label}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}

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
                {/* Daily schedule can insert an appointment anywhere, so it
                    gets an "+ Add item" above the list too, flush left like
                    the rest of the row (no checkbox to align text under) —
                    Checklist only ever adds at the end. */}
                {templateType === 'daily_schedule' && (
                  <Pressable onPress={() => addChecklistItem('start')} style={styles.addItemRowFlush}>
                    <ThemedText type="small" style={{ color: ADD_ROW_COLOR }}>
                      + Add item
                    </ThemedText>
                  </Pressable>
                )}
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
                      <X size={16} color={X_ICON_COLOR} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => addChecklistItem('end')}
                  style={templateType === 'daily_schedule' ? styles.addItemRowFlush : styles.addItemRow}>
                  <ThemedText type="small" style={{ color: ADD_ROW_COLOR }}>
                    + Add item
                  </ThemedText>
                </Pressable>
              </View>
            ) : templateType === 'calculation' ? (
              <View style={styles.checklist}>
                {calcRows.map((row) => (
                  <View key={row.id} style={styles.calcRow}>
                    <TextInput
                      placeholder="Description"
                      placeholderTextColor={placeholderColor}
                      value={row.description}
                      onChangeText={(text) => updateCalculationRowDescription(row.id, text)}
                      style={[styles.calcDescInput, { color: textColor }]}
                    />
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={placeholderColor}
                      value={row.amount}
                      onChangeText={(text) => updateCalculationRowAmount(row.id, text)}
                      keyboardType="numeric"
                      style={[styles.calcAmountInput, { color: textColor }]}
                    />
                    {/* Extra left margin (beyond the row's own gap) is
                        deliberate: this sits right after the number input,
                        and a X too close to it invites an accidental tap
                        while adjusting a digit. */}
                    <Pressable
                      onPress={() => removeCalculationRow(row.id)}
                      hitSlop={8}
                      style={styles.calcRemoveButton}>
                      <X size={16} color={X_ICON_COLOR} />
                    </Pressable>
                  </View>
                ))}
                {/* The "+" here deliberately sits in the exact same column
                    as the "=" below (same row structure, an empty
                    calcTotalValue-width box standing in for the number) —
                    it's the "everything above this line gets added" marker,
                    directly above the "=" that introduces the actual total. */}
                <View style={styles.calcTotalRow}>
                  <Pressable onPress={addCalculationRow} style={styles.addCalcRowButton}>
                    <ThemedText type="small" style={{ color: ADD_ROW_COLOR }}>
                      + Add row
                    </ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold" style={[styles.calcTotalLabel, { color: textColor }]}>
                    +
                  </ThemedText>
                  <View style={styles.calcTotalValue} />
                  <View style={styles.calcTotalSpacer} />
                </View>
                <View style={[styles.calcDivider, { backgroundColor: withAlpha(textColor, 0.3) }]} />
                <View style={styles.calcTotalRow}>
                  <ThemedText type="smallBold" style={[styles.calcTotalLabel, { color: textColor }]}>
                    =
                  </ThemedText>
                  {/* Same width + right padding as calcAmountInput, and the
                      spacer below mirrors calcRemoveButton's reserved space,
                      so this value lands directly under the amount column
                      above instead of at the row's true right edge. */}
                  <ThemedText type="smallBold" style={[styles.calcTotalValue, { color: textColor }]}>
                    {formatSum(sumCalculationRows(calcRows))}
                  </ThemedText>
                  <View style={styles.calcTotalSpacer} />
                </View>
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
            <ThemedText type="small" style={{ color: withAlpha(textColor, 0.5) }}>
              Created: {formatDate(note.createdAt)}
            </ThemedText>
            <ThemedText type="small" style={{ color: withAlpha(textColor, 0.5) }}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    // Matches folderCard/NoteRow's radius (Spacing.two) instead of the
    // pill-shaped Spacing.four these chips used before.
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  folderChipText: { color: '#fff' },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  // Appearance picker card.
  // Shared by the appearance, note-type, and move-to panels — one radius
  // change here keeps all three (and every other "box" in the app) consistent.
  panel: {
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panelLabel: { marginBottom: Spacing.half },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
  },
  typeOptionRowSelected: { backgroundColor: 'rgba(91,127,224,0.18)' },
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
  // Aligns under checklist item *text* (after the checkbox), not the row's
  // left edge — see addCalcRowButton below for why calculation needs its own.
  addItemRow: { paddingVertical: Spacing.two, paddingLeft: Spacing.five },
  // Daily schedule's "+ Add item" (top and bottom): flush with the row's own
  // left edge like the rest of the text, not indented under the checkbox.
  addItemRowFlush: { paddingVertical: Spacing.two, paddingLeft: Spacing.half },
  // Calculation body.
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  calcDescInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.one },
  // paddingRight keeps the digits off the input's own edge, not just off the
  // X button — a flush-right number reads as cramped even with room after it.
  calcAmountInput: { width: 80, fontSize: 16, paddingVertical: Spacing.one, textAlign: 'right', paddingRight: Spacing.one },
  // A calculation row has no checkbox before its description (unlike
  // checklist/daily-schedule), so "+ Add row" aligns flush left instead of
  // indented like addItemRow.
  // flex: 1 so it takes all space left of the "+" marker (see calcTotalRow),
  // instead of sizing to its own text — that's what keeps the "+" pinned to
  // the same trailing column as "=" below regardless of row width.
  addCalcRowButton: { flex: 1, paddingVertical: Spacing.two, paddingLeft: Spacing.half },
  // Extra margin on top of calcRow's own gap, so the X sits further from the
  // amount field than the row's other gaps — see the render-side comment.
  calcRemoveButton: { marginLeft: Spacing.four },
  calcDivider: { height: 1, marginTop: Spacing.one, marginBottom: Spacing.two },
  // Smaller gap than most rows (Spacing.half, not two) — the +/= label reads
  // as attached to its number, not a separate item next to it.
  calcTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.half },
  // Bigger than the row amounts above (16px) — the total is the payoff of
  // the whole template, so it gets visual weight the line items don't.
  calcTotalLabel: { fontSize: 20, fontWeight: '700' },
  // Same width/padding as calcAmountInput (so the total lines up under the
  // amount column above it), but bigger text to match calcTotalLabel.
  calcTotalValue: { width: 80, textAlign: 'right', paddingRight: Spacing.one, fontSize: 20, fontWeight: '700' },
  // Invisible spacer the same footprint as calcRemoveButton's X (icon width
  // + its marginLeft), so the total value's right edge lands where the
  // amount column's right edge does, not at the row's true right edge
  // (which is further right, past where the X buttons sit).
  calcTotalSpacer: { width: 16, marginLeft: Spacing.four },
  metaFooter: { paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.half },
});
