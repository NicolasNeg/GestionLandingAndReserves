/** Pila simple deshacer / rehacer sobre snapshots serializados. */

export type HistoryStacks = { past: string[]; future: string[] };

export function pushSnapshot(stacks: HistoryStacks, snapshot: string, max = 60): HistoryStacks {
  const past = [...stacks.past, snapshot];
  if (past.length > max) past.splice(0, past.length - max);
  return { past, future: [] };
}

export function undo(stacks: HistoryStacks, current: string): { stacks: HistoryStacks; next: string | null } {
  if (stacks.past.length <= 1) return { stacks, next: null };
  const past = [...stacks.past];
  const prev = past[past.length - 2];
  const popped = past.pop()!;
  const future = [popped, ...stacks.future];
  return { stacks: { past, future }, next: prev };
}

export function redo(stacks: HistoryStacks, current: string): { stacks: HistoryStacks; next: string | null } {
  if (!stacks.future.length) return { stacks, next: null };
  const [head, ...rest] = stacks.future;
  const past = [...stacks.past, head];
  return { stacks: { past, future: rest }, next: head };
}
