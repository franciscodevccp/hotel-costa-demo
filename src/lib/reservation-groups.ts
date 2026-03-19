export const GROUP_PREFIX = "[GRP:";

export function buildReservationGroupTag(groupId: string): string {
  return `${GROUP_PREFIX}${groupId}]`;
}

export function extractReservationGroupId(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const start = notes.indexOf(GROUP_PREFIX);
  if (start < 0) return null;
  const end = notes.indexOf("]", start);
  if (end < 0) return null;
  const raw = notes.slice(start + GROUP_PREFIX.length, end).trim();
  return raw || null;
}

export function buildReservationNotesWithGroup(
  notes: string | null | undefined,
  groupId: string
): string {
  const tag = buildReservationGroupTag(groupId);
  const plain = (notes ?? "").trim();
  return plain ? `${tag} ${plain}` : tag;
}

export function stripReservationGroupTag(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const groupId = extractReservationGroupId(notes);
  if (!groupId) return notes;
  const tag = buildReservationGroupTag(groupId);
  const cleaned = notes.replace(tag, "").trim();
  return cleaned || null;
}
