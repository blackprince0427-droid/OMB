import assert from "node:assert/strict";
import test from "node:test";
import {
  TASK_TREE_VIEW_MODE_KEY,
  linkLabel,
  listDenseRows,
  parseTaskTreeViewMode,
  readTaskTreeViewMode,
  taskNoteSummary,
  writeTaskTreeViewMode,
  type DenseTreeNode,
} from "./task-tree-view.ts";

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(TASK_TREE_VIEW_MODE_KEY, initial);
  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

function row(id: string, parentId: string | null, deleted = false): DenseTreeNode {
  return { id, parentId, deleted };
}

test("顯示方式預設密集表，只接受看板這個已存值", () => {
  assert.equal(parseTaskTreeViewMode(null), "dense");
  assert.equal(parseTaskTreeViewMode(""), "dense");
  assert.equal(parseTaskTreeViewMode("table"), "dense");
  assert.equal(parseTaskTreeViewMode("DENSE"), "dense");
  assert.equal(parseTaskTreeViewMode("kanban"), "kanban");
  assert.equal(readTaskTreeViewMode(null), "dense");
  assert.equal(readTaskTreeViewMode(undefined), "dense");
  assert.equal(readTaskTreeViewMode(memoryStorage()), "dense");
  assert.equal(readTaskTreeViewMode(memoryStorage("kanban")), "kanban");
  assert.equal(readTaskTreeViewMode(memoryStorage("nope")), "dense");
  assert.equal(
    readTaskTreeViewMode({
      getItem() {
        throw new Error("blocked");
      },
    }),
    "dense",
  );
});

test("寫入後再讀，上次的顯示方式還在", () => {
  const storage = memoryStorage();
  writeTaskTreeViewMode(storage, "kanban");
  assert.equal(storage.getItem(TASK_TREE_VIEW_MODE_KEY), "kanban");
  assert.equal(readTaskTreeViewMode(storage), "kanban");
  writeTaskTreeViewMode(storage, "dense");
  assert.equal(readTaskTreeViewMode(storage), "dense");
});

test("密集表預設只到 L1，展開後才出現 L2／L3", () => {
  const nodes = [
    row("p", null),
    row("a", "p"),
    row("a1", "a"),
    row("a1a", "a1"),
    row("a2", "a"),
    row("b", "p"),
    row("gone", "a", true),
  ];
  assert.deepEqual(
    listDenseRows(nodes, "p", {}).map((node) => node.id),
    ["a", "b"],
  );
  assert.deepEqual(
    listDenseRows(nodes, "p", { a: true }).map((node) => node.id),
    ["a", "a1", "a2", "b"],
  );
  assert.deepEqual(
    listDenseRows(nodes, "p", { a: true, a1: true }).map((node) => node.id),
    ["a", "a1", "a1a", "a2", "b"],
  );
  assert.deepEqual(
    listDenseRows(nodes, "p", { a1: true }).map((node) => node.id),
    ["a", "b"],
  );
});

test("備註與連結摘要可放進表格", () => {
  assert.equal(taskNoteSummary([]), "");
  assert.equal(taskNoteSummary([{ title: " 草案 " }, { title: "" }, { title: "規格" }]), "草案、規格");
  assert.equal(linkLabel("https://example.com/spec"), "example.com/spec");
  assert.equal(linkLabel("https://example.com/"), "example.com");
  assert.equal(linkLabel("不是網址"), "不是網址");
});
