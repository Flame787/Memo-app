// Generate a compact, collision-resistant id: base36 timestamp + random suffix.
// Good enough for a local, single-device app (no server coordination needed).
// Shared by the notes store and any screen that needs to create an id before
// handing an object to the store (e.g. a new checklist item row).
export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
