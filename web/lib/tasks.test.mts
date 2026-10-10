import assert from "node:assert/strict";
import test from "node:test";
import type { OfficeUser } from "./office.ts";
import {
  LEVEL_LABEL,
  addLink,
  addNote,
  canViewNode,
  childNodes,
  completionRecord,
  createChild,
  createInvite,
  createProject,
  deleteLeaf,
  deleteProject,
  moveLink,
  respondInvite,
  restoreProject,
  setNodeStatus,
  setProjectVisibility,
  toggleNote,
  unfinishedTaskNodes,
  withdrawInvite,
  type TaskNode,
} from "./tasks.ts";

const now = new Date("2026-10-10T09:00:00");
const users: OfficeUser[] = [
  { account: "A", password: "a", name: "甲", role: "員工", createdAt: "" },
  { account: "B", password: "b", name: "乙", role: "員工", createdAt: "" },
  { account: "C", password: "c", name: "丙", role: "員工", createdAt: "" },
];

function projectOf(nodes: TaskNode[]): TaskNode {
  const project = nodes.find((node) => node.level === 0);
  if (!project) throw new Error("missing project");
  return project;
}

test("可建立四層，工作項不能再拆，名稱可重複", () => {
  const created = createProject([], users, "A", " 上線 ", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  assert.equal(root.name, "上線");
  assert.equal(root.assignees[0], "A");
  const again = createProject(created.value, users, "B", "上線", now);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.value.filter((node) => node.level === 0).length, 2);

  let nodes = created.value;
  let parent = root.id;
  for (const level of [1, 2, 3]) {
    const child = createChild(nodes, users, "A", parent, `第${level}層`, now);
    assert.equal(child.ok, true);
    if (!child.ok) return;
    nodes = child.value;
    const node = nodes.find((item) => item.level === level);
    assert.ok(node);
    parent = node.id;
  }
  const blocked = createChild(nodes, users, "A", parent, "第四層", now);
  assert.equal(blocked.ok, false);
  const outsider = createChild(nodes, users, "B", root.id, "同層", now);
  assert.equal(outsider.ok, false);
});

test("狀態不聯動，備註完成不改節點狀態", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const child = createChild(created.value, users, "A", root.id, "主任務", now);
  assert.equal(child.ok, true);
  if (!child.ok) return;
  const task = child.value.find((node) => node.level === 1);
  assert.ok(task);
  const done = setNodeStatus(child.value, "A", task.id, "已完成");
  assert.equal(done.ok, true);
  if (!done.ok) return;
  assert.equal(done.value.completed?.id, task.id);
  assert.equal(done.value.nodes.find((node) => node.id === root.id)?.status, "未開始");
  const parent = setNodeStatus(done.value.nodes, "A", root.id, "暫停");
  assert.equal(parent.ok, true);
  if (!parent.ok) return;
  assert.equal(parent.value.nodes.find((node) => node.id === task.id)?.status, "已完成");
  assert.equal(parent.value.completed, null);
  const noted = addNote(parent.value.nodes, "A", root.id, "跟進", now);
  assert.equal(noted.ok, true);
  if (!noted.ok) return;
  const note = noted.value.find((node) => node.id === root.id)?.notes[0];
  assert.ok(note);
  const toggled = toggleNote(noted.value, "A", root.id, note.id);
  assert.equal(toggled.ok, true);
  if (!toggled.ok) return;
  assert.equal(toggled.value.find((node) => node.id === root.id)?.status, "暫停");
  assert.equal(toggled.value.find((node) => node.id === root.id)?.notes[0]?.done, true);
});

test("添加與轉交須同意，拒絕與撤回不改負責人", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const forced = respondInvite(created.value, [], "B", "missing", true);
  assert.equal(forced.ok, false);
  const invited = createInvite(created.value, [], users, "A", root.id, "B", "add", now);
  assert.equal(invited.ok, true);
  if (!invited.ok) return;
  const pending = invited.value[0];
  assert.ok(pending);
  const withdrawn = withdrawInvite(invited.value, "A", pending.id);
  assert.equal(withdrawn.ok, true);
  if (!withdrawn.ok) return;
  assert.equal(withdrawn.value[0]?.status, "withdrawn");
  const again = createInvite(created.value, withdrawn.value, users, "A", root.id, "B", "add", now);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  const request = again.value[0];
  assert.ok(request);
  const rejected = respondInvite(created.value, again.value, "B", request.id, false);
  assert.equal(rejected.ok, true);
  if (!rejected.ok) return;
  assert.equal(rejected.value.invites[0]?.status, "rejected");
  assert.deepEqual(rejected.value.nodes.find((node) => node.id === root.id)?.assignees, ["A"]);
  const retry = createInvite(created.value, rejected.value.invites, users, "A", root.id, "B", "transfer", now);
  assert.equal(retry.ok, true);
  if (!retry.ok) return;
  const transfer = retry.value[0];
  assert.ok(transfer);
  const before = created.value.find((node) => node.id === root.id)?.status;
  const accepted = respondInvite(created.value, retry.value, "B", transfer.id, true);
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  const updated = accepted.value.nodes.find((node) => node.id === root.id);
  assert.deepEqual(updated?.assignees, ["B"]);
  assert.deepEqual(updated?.viewers, ["A"]);
  assert.equal(updated?.status, before);
  assert.equal(canViewNode(accepted.value.nodes, updated!, "A"), true);
  assert.equal(setNodeStatus(accepted.value.nodes, "A", root.id, "進行中").ok, false);
});

test("刪專案進刪除頁可還原，有子節點不能單獨刪上層", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const child = createChild(created.value, users, "A", root.id, "主任務", now);
  assert.equal(child.ok, true);
  if (!child.ok) return;
  const task = child.value.find((node) => node.level === 1);
  assert.ok(task);
  assert.equal(deleteLeaf(child.value, "A", root.id).ok, false);
  const grandchild = createChild(child.value, users, "A", task.id, "子任務", now);
  assert.equal(grandchild.ok, true);
  if (!grandchild.ok) return;
  assert.equal(deleteLeaf(grandchild.value, "A", task.id).ok, false);
  assert.equal(deleteLeaf(grandchild.value, "B", task.id).ok, false);
  assert.equal(deleteProject(grandchild.value, "B", root.id).ok, false);
  const removed = deleteProject(grandchild.value, "A", root.id);
  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  assert.equal(removed.value.every((node) => node.deleted), true);
  const leaf = removed.value.find((node) => node.level === 2);
  assert.ok(leaf);
  const restored = restoreProject(removed.value, "A", root.id);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.value.every((node) => !node.deleted), true);
  assert.equal(childNodes(restored.value, task.id).length, 1);
  assert.equal(leaf.status, restored.value.find((node) => node.id === leaf.id)?.status);
});

test("部分可見時外人看不到，負責人仍看得到自己的節點與上層", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const child = createChild(created.value, users, "A", root.id, "主任務", now);
  assert.equal(child.ok, true);
  if (!child.ok) return;
  const task = child.value.find((node) => node.level === 1);
  assert.ok(task);
  const invited = createInvite(child.value, [], users, "A", task.id, "B", "add", now);
  assert.equal(invited.ok, true);
  if (!invited.ok) return;
  const accepted = respondInvite(child.value, invited.value, "B", invited.value[0]!.id, true);
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  const narrowed = setProjectVisibility(accepted.value.nodes, users, "A", root.id, "partial", ["C"]);
  assert.equal(narrowed.ok, true);
  if (!narrowed.ok) return;
  const project = projectOf(narrowed.value);
  const owned = narrowed.value.find((node) => node.id === task.id);
  assert.ok(owned);
  assert.equal(canViewNode(narrowed.value, project, "A"), true);
  assert.equal(canViewNode(narrowed.value, owned, "C"), true);
  assert.equal(canViewNode(narrowed.value, project, "B"), true);
  assert.equal(canViewNode(narrowed.value, owned, "B"), true);
  const hidden = createChild(narrowed.value, users, "A", root.id, "別的", now);
  assert.equal(hidden.ok, true);
  if (!hidden.ok) return;
  const other = hidden.value.find((node) => node.name === "別的");
  assert.ok(other);
  assert.equal(canViewNode(hidden.value, other, "B"), false);
  const selfOnly = setProjectVisibility(hidden.value, users, "A", root.id, "self", []);
  assert.equal(selfOnly.ok, true);
  if (!selfOnly.ok) return;
  assert.equal(canViewNode(selfOnly.value, other, "C"), false);
  assert.equal(canViewNode(selfOnly.value, projectOf(selfOnly.value), "B"), true);
});

test("連結可排序，完成節點只寫標題與層級", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const first = addLink(created.value, "A", root.id, "https://example.com/a", now);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addLink(first.value, "A", root.id, "https://example.com/b", now);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const links = second.value.find((node) => node.id === root.id)?.links ?? [];
  assert.equal(links.length, 2);
  const moved = moveLink(second.value, "A", root.id, links[1]!.id, -1);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(moved.value.find((node) => node.id === root.id)?.links[0]?.url, "https://example.com/b");
  assert.equal(addLink(created.value, "B", root.id, "https://example.com", now).ok, false);
  const done = setNodeStatus(moved.value, "A", root.id, "已完成");
  assert.equal(done.ok, true);
  if (!done.ok || !done.value.completed) return;
  const record = completionRecord(done.value.completed, "A", now);
  assert.equal(record.title, "專案");
  assert.equal(record.content, "");
  assert.equal(record.taskLevel, 0);
  assert.equal(LEVEL_LABEL[0], "專案");
  assert.equal(unfinishedTaskNodes(done.value.nodes, "A").some((node) => node.id === root.id), false);
});

test("轉交專案後新負責人可改可見範圍，原負責人只剩該節點可見", () => {
  const created = createProject([], users, "A", "專案", now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const root = projectOf(created.value);
  const invited = createInvite(created.value, [], users, "A", root.id, "B", "transfer", now);
  assert.equal(invited.ok, true);
  if (!invited.ok) return;
  const accepted = respondInvite(created.value, invited.value, "B", invited.value[0]!.id, true);
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  const project = projectOf(accepted.value.nodes);
  assert.equal(project.status, "未開始");
  assert.deepEqual(project.assignees, ["B"]);
  assert.ok(project.viewers.includes("A"));
  assert.equal(setProjectVisibility(accepted.value.nodes, users, "A", root.id, "all", []).ok, false);
  const opened = setProjectVisibility(accepted.value.nodes, users, "B", root.id, "self", []);
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  const child = createChild(opened.value, users, "B", root.id, "主任務", now);
  assert.equal(child.ok, true);
  if (!child.ok) return;
  const task = child.value.find((node) => node.name === "主任務");
  assert.ok(task);
  assert.equal(canViewNode(child.value, projectOf(child.value), "A"), true);
  assert.equal(canViewNode(child.value, task, "A"), false);
  assert.equal(canViewNode(child.value, task, "B"), true);
});
