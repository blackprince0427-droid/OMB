export const TASK_TREE_VIEW_MODE_KEY = "omb-v7-task-tree-view-mode";

export type TaskTreeViewMode = "dense" | "kanban";
export type KanbanLaneMode = "l1" | "status";

export function parseTaskTreeViewMode(value: string | null | undefined): TaskTreeViewMode {
  return value === "kanban" ? "kanban" : "dense";
}

export function readTaskTreeViewMode(
  storage: { getItem(key: string): string | null } | null | undefined,
): TaskTreeViewMode {
  if (!storage) return "dense";
  try {
    return parseTaskTreeViewMode(storage.getItem(TASK_TREE_VIEW_MODE_KEY));
  } catch {
    return "dense";
  }
}

export function writeTaskTreeViewMode(
  storage: { setItem(key: string, value: string): void },
  mode: TaskTreeViewMode,
): void {
  storage.setItem(TASK_TREE_VIEW_MODE_KEY, mode);
}

export type DenseTreeNode = {
  id: string;
  parentId: string | null;
  deleted?: boolean;
};

export function listDenseRows<T extends DenseTreeNode>(
  nodes: readonly T[],
  projectId: string,
  expanded: Readonly<Record<string, boolean>>,
): T[] {
  const children = new Map<string, T[]>();
  for (const node of nodes) {
    if (node.deleted || !node.parentId) continue;
    const list = children.get(node.parentId);
    if (list) list.push(node);
    else children.set(node.parentId, [node]);
  }
  const rows: T[] = [];
  const walk = (parentId: string, depth: number) => {
    if (depth > 4) return;
    const list = children.get(parentId);
    if (!list) return;
    for (const child of list) {
      rows.push(child);
      if (expanded[child.id]) walk(child.id, depth + 1);
    }
  };
  walk(projectId, 0);
  return rows;
}

export function taskNoteSummary(notes: readonly { title: string }[]): string {
  return notes
    .map((note) => note.title.trim())
    .filter(Boolean)
    .join("、");
}

export function linkLabel(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const text = `${parsed.host}${path}`;
    return text.length > 28 ? `${text.slice(0, 27)}…` : text;
  } catch {
    return trimmed.length > 28 ? `${trimmed.slice(0, 27)}…` : trimmed;
  }
}
