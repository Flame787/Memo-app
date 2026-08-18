// Text-search matching for REQ-09 (voice search stays deferred — D-03/D-12).
// One shared definition of "does this match" so the homepage, folder screen,
// and in-note search bars can never quietly disagree on what counts as a hit.
import type { Note } from './types';

// Case-insensitive substring test. A blank query never matches anything —
// callers filtering a list should already skip calling this when the search
// field is empty, but this stays defensive rather than assuming that.
export function textMatchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return text.toLowerCase().includes(q);
}

// Number of non-overlapping, case-insensitive occurrences of `query` in
// `text` — used for a "N found" hint against free-form text (a note's title
// or plain-text content), where each occurrence gets its own highlight, so
// the count should match what's actually highlighted on screen.
export function countOccurrences(text: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  let i = 0;
  while (true) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) break;
    count++;
    i = idx + q.length;
  }
  return count;
}

// Whether any part of a note matches — title, plus whichever field actually
// holds its content for that templateType. Mirrors REQ-08's "search scope
// depends on REQ-08" note in Plan.md: once content became structured
// (checklist items, calculation rows) instead of one string, search has to
// look inside that structure, not just `content`.
export function noteMatchesQuery(note: Note, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (textMatchesQuery(note.title, q)) return true;
  if (note.templateType === 'checklist' || note.templateType === 'daily_schedule') {
    return (note.checklistItems ?? []).some((item) => textMatchesQuery(item.text, q));
  }
  if (note.templateType === 'calculation') {
    return (note.calculationRows ?? []).some(
      (row) => textMatchesQuery(row.description, q) || textMatchesQuery(row.amount, q),
    );
  }
  return textMatchesQuery(note.content, q);
}
