// Shared helpers for the calculation template type (REQ-08). Used by the
// note editor (live total while editing) and the note preview row (list
// summary), so the two can never compute a different total for the same data.
import { CalculationRow } from '@/lib/types';

// Leniently parses one row's amount: trims, treats a locale comma as a
// decimal point, and contributes 0 (not a crash or NaN) for anything that
// still isn't a valid number — an unfinished "-" or an empty row shouldn't
// break the total while the user is still typing.
export function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return 0;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function sumCalculationRows(rows: CalculationRow[]): number {
  return rows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
}

// Whole numbers print without decimals; anything else to 2 places.
export function formatSum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
