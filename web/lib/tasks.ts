import type { OfficeUser, WorkRecord } from "@/lib/office";

function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let idSequence = 0;

function createId(now: Date): string {
  idSequence += 1;
  return `task-${now.getTime().toString(36)}-${idSequence.toString(36)}`;
}

export const TASK_STATUSES = ["未開始", "進行中", "已完成", "暫停"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskLevel = 0 | 1 | 2 | 3;
export type VisibilityMode = "all" | "partial" | "self";

export const LEVEL_LABEL: Record<TaskLevel, string> = {
  0: "專案",
  1: "主任務",
  2: "子任務",
  3: "工作項",
};

export type TaskNote = { id: string; title: string; done: boolean };
export type TaskLink = { id: string; url: string };

export type TaskNode = {
  id: string;
  projectId: string;
  parentId: string | null;
  level: TaskLevel;
  name: string;
  status: TaskStatus;
  assignees: string[];
  viewers: string[];
  creator: string;
  visibility: VisibilityMode;
  visibleAccounts: string[];
  notes: TaskNote[];
  links: TaskLink[];
  deleted: boolean;
};

export type TaskInvite = {
  id: string;
  nodeId: string;
  projectId: string;
  kind: "add" | "transfer";
  from: string;
  to: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
};

export type TaskResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskLevel(value: number): value is TaskLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function cleanAccounts(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function normalizeTaskNode(value: unknown): TaskNode | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<TaskNode>;
  if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.creator !== "string") return null;
  if (typeof item.level !== "number" || !isTaskLevel(item.level)) return null;
  const status = typeof item.status === "string" && isTaskStatus(item.status) ? item.status : "未開始";
  const visibility = item.visibility === "partial" || item.visibility === "self" || item.visibility === "all" ? item.visibility : "all";
  const notes = Array.isArray(item.notes)
    ? item.notes.flatMap((note) => {
        if (!note || typeof note !== "object") return [];
        const row = note as Partial<TaskNote>;
        if (typeof row.id !== "string" || typeof row.title !== "string") return [];
        return [{ id: row.id, title: row.title, done: row.done === true }];
      })
    : [];
  const links = Array.isArray(item.links)
    ? item.links.flatMap((link) => {
        if (!link || typeof link !== "object") return [];
        const row = link as Partial<TaskLink>;
        if (typeof row.id !== "string" || typeof row.url !== "string") return [];
        return [{ id: row.id, url: row.url }];
      })
    : [];
  const projectId = typeof item.projectId === "string" && item.projectId ? item.projectId : item.id;
  return {
    id: item.id,
    projectId,
    parentId: typeof item.parentId === "string" ? item.parentId : null,
    level: item.level,
    name: item.name,
    status,
    assignees: Array.isArray(item.assignees) ? cleanAccounts(item.assignees.filter((account): account is string => typeof account === "string")) : [],
    viewers: Array.isArray(item.viewers) ? cleanAccounts(item.viewers.filter((account): account is string => typeof account === "string")) : [],
    creator: item.creator,
    visibility,
    visibleAccounts: Array.isArray(item.visibleAccounts)
      ? cleanAccounts(item.visibleAccounts.filter((account): account is string => typeof account === "string"))
      : [],
    notes,
    links,
    deleted: item.deleted === true,
  };
}

export function normalizeTaskInvite(value: unknown): TaskInvite | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<TaskInvite>;
  if (
    typeof item.id !== "string" ||
    typeof item.nodeId !== "string" ||
    typeof item.projectId !== "string" ||
    typeof item.from !== "string" ||
    typeof item.to !== "string"
  ) {
    return null;
  }
  if (item.kind !== "add" && item.kind !== "transfer") return null;
  if (item.status !== "pending" && item.status !== "accepted" && item.status !== "rejected" && item.status !== "withdrawn") return null;
  return {
    id: item.id,
    nodeId: item.nodeId,
    projectId: item.projectId,
    kind: item.kind,
    from: item.from,
    to: item.to,
    status: item.status,
  };
}

function knownUser(users: OfficeUser[], account: string): boolean {
  return users.some((user) => user.account === account);
}

export function projectNode(nodes: TaskNode[], projectId: string): TaskNode | undefined {
  return nodes.find((node) => node.id === projectId && node.level === 0);
}

export function childNodes(nodes: TaskNode[], parentId: string): TaskNode[] {
  return nodes.filter((node) => node.parentId === parentId && !node.deleted);
}

export function isAssignee(node: TaskNode, account: string): boolean {
  return node.assignees.includes(account);
}

function isAncestor(nodes: TaskNode[], ancestorId: string, node: TaskNode): boolean {
  let parentId = node.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = nodes.find((item) => item.id === parentId)?.parentId ?? null;
  }
  return false;
}

export function canViewNode(nodes: TaskNode[], node: TaskNode, account: string): boolean {
  if (!account || node.deleted) return false;
  const project = projectNode(nodes, node.projectId);
  if (!project || project.deleted) return false;
  if (project.assignees.includes(account)) return true;
  if (node.assignees.includes(account) || node.viewers.includes(account)) return true;
  const ownsDescendant = nodes.some(
    (item) =>
      !item.deleted &&
      item.projectId === project.id &&
      item.id !== node.id &&
      (item.assignees.includes(account) || item.viewers.includes(account)) &&
      isAncestor(nodes, node.id, item),
  );
  if (ownsDescendant) return true;
  if (project.visibility === "all") return true;
  if (project.visibility === "partial" && project.visibleAccounts.includes(account)) return true;
  return false;
}

export function canEditNode(node: TaskNode, account: string): boolean {
  return !node.deleted && node.assignees.includes(account);
}

export function createProject(nodes: TaskNode[], users: OfficeUser[], actor: string, name: string, now: Date): TaskResult<TaskNode[]> {
  if (!knownUser(users, actor)) return { ok: false, error: "未登入不得建立專案。" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "專案名稱須填寫。" };
  const id = createId(now);
  const node: TaskNode = {
    id,
    projectId: id,
    parentId: null,
    level: 0,
    name: trimmed,
    status: "未開始",
    assignees: [actor],
    viewers: [],
    creator: actor,
    visibility: "self",
    visibleAccounts: [],
    notes: [],
    links: [],
    deleted: false,
  };
  return { ok: true, value: [node, ...nodes] };
}

export function createChild(nodes: TaskNode[], users: OfficeUser[], actor: string, parentId: string, name: string, now: Date): TaskResult<TaskNode[]> {
  if (!knownUser(users, actor)) return { ok: false, error: "未登入不得建立節點。" };
  const parent = nodes.find((node) => node.id === parentId && !node.deleted);
  if (!parent) return { ok: false, error: "找不到上一層節點。" };
  if (!isAssignee(parent, actor)) return { ok: false, error: "只有此節點的負責人可以建立下一層。" };
  if (parent.level >= 3) return { ok: false, error: "工作項之下不能再拆。" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "名稱須填寫。" };
  const level = (parent.level + 1) as TaskLevel;
  const node: TaskNode = {
    id: createId(now),
    projectId: parent.projectId,
    parentId: parent.id,
    level,
    name: trimmed,
    status: "未開始",
    assignees: [actor],
    viewers: [],
    creator: actor,
    visibility: "all",
    visibleAccounts: [],
    notes: [],
    links: [],
    deleted: false,
  };
  return { ok: true, value: [node, ...nodes] };
}

export function setNodeStatus(
  nodes: TaskNode[],
  actor: string,
  nodeId: string,
  status: string,
): TaskResult<{ nodes: TaskNode[]; completed: TaskNode | null }> {
  if (!isTaskStatus(status)) return { ok: false, error: "狀態只可為未開始、進行中、已完成或暫停。" };
  const current = nodes.find((node) => node.id === nodeId && !node.deleted);
  if (!current) return { ok: false, error: "找不到此節點。" };
  if (!canEditNode(current, actor)) return { ok: false, error: "只有負責人可以改這個節點。" };
  const completed = current.status !== "已完成" && status === "已完成" ? { ...current, status } : null;
  return {
    ok: true,
    value: {
      nodes: nodes.map((node) => (node.id === nodeId ? { ...node, status } : node)),
      completed,
    },
  };
}

export function setProjectVisibility(
  nodes: TaskNode[],
  users: OfficeUser[],
  actor: string,
  projectId: string,
  mode: string,
  visibleAccounts: string[],
): TaskResult<TaskNode[]> {
  if (mode !== "all" && mode !== "partial" && mode !== "self") return { ok: false, error: "可見範圍只可為全專案、部分可見或只限自己。" };
  const project = projectNode(nodes, projectId);
  if (!project || project.deleted) return { ok: false, error: "找不到此專案。" };
  if (!project.assignees.includes(actor)) return { ok: false, error: "只有專案負責人可以設定可見範圍。" };
  const accounts = cleanAccounts(visibleAccounts).filter((account) => account !== actor);
  if (accounts.some((account) => !knownUser(users, account))) return { ok: false, error: "可見人員必須是本公司帳戶。" };
  return {
    ok: true,
    value: nodes.map((node) => (node.id === project.id ? { ...node, visibility: mode, visibleAccounts: mode === "partial" ? accounts : node.visibleAccounts } : node)),
  };
}

export function deleteLeaf(nodes: TaskNode[], actor: string, nodeId: string): TaskResult<TaskNode[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (node.level === 0) return { ok: false, error: "刪除專案請使用刪除整棵樹。" };
  if (node.creator !== actor) return { ok: false, error: "只能刪除自己建立的節點。" };
  if (childNodes(nodes, node.id).length > 0) return { ok: false, error: "底下已有子節點，不能單獨刪除這一層。" };
  return { ok: true, value: nodes.filter((item) => item.id !== node.id) };
}

export function deleteProject(nodes: TaskNode[], actor: string, projectId: string): TaskResult<TaskNode[]> {
  const project = projectNode(nodes, projectId);
  if (!project || project.deleted) return { ok: false, error: "找不到此專案。" };
  if (project.creator !== actor) return { ok: false, error: "只能刪除自己建立的專案。" };
  return {
    ok: true,
    value: nodes.map((node) => (node.projectId === project.id ? { ...node, deleted: true } : node)),
  };
}

export function restoreProject(nodes: TaskNode[], actor: string, projectId: string): TaskResult<TaskNode[]> {
  const project = nodes.find((node) => node.id === projectId && node.level === 0 && node.deleted);
  if (!project) return { ok: false, error: "刪除紀錄裡沒有這個專案。" };
  if (project.creator !== actor) return { ok: false, error: "只能還原自己建立的專案。" };
  return {
    ok: true,
    value: nodes.map((node) => (node.projectId === project.id ? { ...node, deleted: false } : node)),
  };
}

export function createInvite(
  nodes: TaskNode[],
  invites: TaskInvite[],
  users: OfficeUser[],
  actor: string,
  nodeId: string,
  target: string,
  kind: "add" | "transfer",
  now: Date,
): TaskResult<TaskInvite[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (!isAssignee(node, actor)) return { ok: false, error: "只有負責人可以邀請。" };
  const to = target.trim();
  if (!knownUser(users, to)) return { ok: false, error: "請選擇本公司的帳戶。" };
  if (to === actor) return { ok: false, error: "不能邀請自己。" };
  if (kind === "add" && node.assignees.includes(to)) return { ok: false, error: "此帳戶已是負責人。" };
  if (invites.some((item) => item.nodeId === node.id && item.to === to && item.kind === kind && item.status === "pending")) {
    return { ok: false, error: "已有尚未回覆的邀請。" };
  }
  const invite: TaskInvite = {
    id: createId(now),
    nodeId: node.id,
    projectId: node.projectId,
    kind,
    from: actor,
    to,
    status: "pending",
  };
  return { ok: true, value: [invite, ...invites] };
}

export function withdrawInvite(invites: TaskInvite[], actor: string, inviteId: string): TaskResult<TaskInvite[]> {
  const current = invites.find((item) => item.id === inviteId);
  if (!current || current.status !== "pending") return { ok: false, error: "這次邀請不能撤回。" };
  if (current.from !== actor) return { ok: false, error: "只有邀請人可以撤回。" };
  return { ok: true, value: invites.map((item) => (item.id === inviteId ? { ...item, status: "withdrawn" } : item)) };
}

export function respondInvite(
  nodes: TaskNode[],
  invites: TaskInvite[],
  actor: string,
  inviteId: string,
  accept: boolean,
): TaskResult<{ nodes: TaskNode[]; invites: TaskInvite[] }> {
  const current = invites.find((item) => item.id === inviteId);
  if (!current || current.status !== "pending") return { ok: false, error: "這次邀請已結束。" };
  if (current.to !== actor) return { ok: false, error: "只有被邀請的帳戶可以回覆。" };
  const node = nodes.find((item) => item.id === current.nodeId);
  if (!node || node.deleted) return { ok: false, error: "節點已不在進行中的專案裡。" };
  if (!accept) {
    return {
      ok: true,
      value: { nodes, invites: invites.map((item) => (item.id === inviteId ? { ...item, status: "rejected" } : item)) },
    };
  }
  const nextNodes = nodes.map((item) => {
    if (item.id !== node.id) return item;
    if (current.kind === "add") {
      return { ...item, assignees: cleanAccounts([...item.assignees, current.to]) };
    }
    return {
      ...item,
      status: item.status,
      assignees: cleanAccounts([...item.assignees.filter((account) => account !== current.from), current.to]),
      viewers: cleanAccounts([...item.viewers.filter((account) => account !== current.to), current.from]),
    };
  });
  return {
    ok: true,
    value: {
      nodes: nextNodes,
      invites: invites.map((item) => (item.id === inviteId ? { ...item, status: "accepted" } : item)),
    },
  };
}

export function addNote(nodes: TaskNode[], actor: string, nodeId: string, title: string, now: Date): TaskResult<TaskNode[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (!canEditNode(node, actor)) return { ok: false, error: "只有負責人可以加備註。" };
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "備註標題須填寫。" };
  const note: TaskNote = { id: createId(now), title: trimmed, done: false };
  return { ok: true, value: nodes.map((item) => (item.id === node.id ? { ...item, notes: [...item.notes, note] } : item)) };
}

export function toggleNote(nodes: TaskNode[], actor: string, nodeId: string, noteId: string): TaskResult<TaskNode[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (!canEditNode(node, actor)) return { ok: false, error: "只有負責人可以改備註。" };
  if (!node.notes.some((note) => note.id === noteId)) return { ok: false, error: "找不到這則備註。" };
  return {
    ok: true,
    value: nodes.map((item) =>
      item.id === node.id
        ? { ...item, status: item.status, notes: item.notes.map((note) => (note.id === noteId ? { ...note, done: !note.done } : note)) }
        : item,
    ),
  };
}

function httpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function addLink(nodes: TaskNode[], actor: string, nodeId: string, url: string, now: Date): TaskResult<TaskNode[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (!canEditNode(node, actor)) return { ok: false, error: "只有負責人可以加連結。" };
  const href = httpUrl(url);
  if (!href) return { ok: false, error: "連結須為 http 或 https 網址。" };
  const link: TaskLink = { id: createId(now), url: href };
  return { ok: true, value: nodes.map((item) => (item.id === node.id ? { ...item, links: [...item.links, link] } : item)) };
}

export function moveLink(nodes: TaskNode[], actor: string, nodeId: string, linkId: string, direction: -1 | 1): TaskResult<TaskNode[]> {
  const node = nodes.find((item) => item.id === nodeId && !item.deleted);
  if (!node) return { ok: false, error: "找不到此節點。" };
  if (!canEditNode(node, actor)) return { ok: false, error: "只有負責人可以調整連結順序。" };
  const index = node.links.findIndex((link) => link.id === linkId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= node.links.length) return { ok: false, error: "這個連結不能再移動。" };
  const links = [...node.links];
  const [row] = links.splice(index, 1);
  if (!row) return { ok: false, error: "找不到這個連結。" };
  links.splice(next, 0, row);
  return { ok: true, value: nodes.map((item) => (item.id === node.id ? { ...item, links } : item)) };
}

export function unfinishedTaskNodes(nodes: TaskNode[], account: string): TaskNode[] {
  return nodes.filter((node) => !node.deleted && node.status !== "已完成" && canViewNode(nodes, node, account));
}

export function completionRecord(node: TaskNode, actor: string, now: Date): WorkRecord {
  return {
    id: createId(now),
    account: actor,
    assignee: actor,
    title: node.name,
    content: "",
    workDate: dateStamp(now),
    done: true,
    tagId: "",
    taskNodeId: node.id,
    taskLevel: node.level,
    updatedAt: stamp(now),
  };
}
