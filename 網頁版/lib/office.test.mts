import assert from "node:assert/strict";
import test from "node:test";
import {
  addDepartment,
  addPosition,
  addUser,
  addWorkRecord,
  assignMember,
  authenticate,
  canManageDepartments,
  canManageUsers,
  canQueryAccount,
  daysInMonth,
  monthMatrix,
  seedUsers,
  setStaffPermission,
  updateWorkRecord,
  type Assignment,
  type Position,
} from "./office.ts";

const now = new Date(2026, 9, 8, 14, 6);

test("預設 CEO 帳戶可以登入，錯誤密碼不能", () => {
  const users = seedUsers();
  assert.equal(authenticate(users, "CEO", "CEO")?.role, "CEO");
  assert.equal(authenticate(users, "CEO", "wrong"), null);
  assert.equal(authenticate(users, "ceo", "CEO"), null);
});

test("CEO 可以新增使用者，角色在建立時寫入", () => {
  const users = seedUsers();
  const created = addUser(
    users,
    { name: "陳可恩", account: "HR01", password: "HR01", role: "HR" },
    now,
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.user.role, "HR");
  assert.equal(created.user.createdAt, "2026-10-08 14:06");
  assert.equal(authenticate([...users, created.user], "HR01", "HR01")?.name, "陳可恩");
});

test("空欄位與重複帳戶會被拒絕", () => {
  const users = seedUsers();
  assert.equal(
    addUser(users, { name: "", account: "A", password: "A", role: "員工" }, now).ok,
    false,
  );
  const duplicate = addUser(
    users,
    { name: "另一位", account: "ceo", password: "x", role: "員工" },
    now,
  );
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) return;
  assert.match(duplicate.error, /已存在/);
});

test("只有 CEO 可以進入使用者管理", () => {
  assert.equal(canManageUsers("CEO"), true);
  assert.equal(canManageUsers("HR"), false);
  assert.equal(canManageUsers("會計"), false);
  assert.equal(canManageUsers("員工"), false);
});

test("CEO 與 HR 可管理部門，會計與員工不可", () => {
  assert.equal(canManageDepartments("CEO"), true);
  assert.equal(canManageDepartments("HR"), true);
  assert.equal(canManageDepartments("會計"), false);
  assert.equal(canManageDepartments("員工"), false);
});

test("部門、職位與一人多部門指派", () => {
  const users = seedUsers();
  const created = addUser(
    users,
    { name: "陳可恩", account: "HR01", password: "HR01", role: "員工" },
    now,
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const accounts = [...users, created.user];

  const empty = addDepartment([], "  ", now);
  assert.equal(empty.ok, false);

  const accounting = addDepartment([], "會計部", now);
  const sales = addDepartment([], "業務部", now);
  assert.equal(accounting.ok && sales.ok, true);
  if (!accounting.ok || !sales.ok) return;
  const departments = [accounting.value, sales.value];

  const badRank = addPosition(departments, [], {
    departmentId: accounting.value.id,
    name: "主任",
    rank: "一",
  }, now);
  assert.equal(badRank.ok, false);

  const lead = addPosition(departments, [], {
    departmentId: accounting.value.id,
    name: "主任",
    rank: "2",
  }, now);
  assert.equal(lead.ok, true);
  if (!lead.ok) return;
  const clerk = addPosition(departments, [lead.value], {
    departmentId: accounting.value.id,
    name: "職員",
    rank: "1",
  }, now);
  const salesLead = addPosition(departments, [], {
    departmentId: sales.value.id,
    name: "主任",
    rank: "5",
  }, now);
  assert.equal(clerk.ok && salesLead.ok, true);
  if (!clerk.ok || !salesLead.ok) return;
  const positions = [lead.value, clerk.value, salesLead.value];

  const first = assignMember(accounts, departments, positions, [], {
    account: "HR01",
    departmentId: accounting.value.id,
    positionId: clerk.value.id,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const replaced = assignMember(accounts, departments, positions, first.value, {
    account: "HR01",
    departmentId: accounting.value.id,
    positionId: lead.value.id,
  });
  assert.equal(replaced.ok, true);
  if (!replaced.ok) return;
  const inAccounting = replaced.value.filter(
    (item) => item.account === "HR01" && item.departmentId === accounting.value.id,
  );
  assert.equal(inAccounting.length, 1);
  assert.equal(inAccounting[0]?.positionId, lead.value.id);

  const both = assignMember(accounts, departments, positions, replaced.value, {
    account: "HR01",
    departmentId: sales.value.id,
    positionId: salesLead.value.id,
  });
  assert.equal(both.ok, true);
  if (!both.ok) return;
  assert.equal(both.value.filter((item) => item.account === "HR01").length, 2);

  const wrongPosition = assignMember(accounts, departments, positions, both.value, {
    account: "CEO",
    departmentId: sales.value.id,
    positionId: clerk.value.id,
  });
  assert.equal(wrongPosition.ok, false);
});

test("同一部門較高職位才可查詢，個別權限不改變查詢", () => {
  const departments = [
    { id: "d1", name: "會計部", createdAt: "" },
    { id: "d2", name: "業務部", createdAt: "" },
  ];
  const positions: Position[] = [
    { id: "p-high", departmentId: "d1", name: "主任", rank: 2, createdAt: "" },
    { id: "p-low", departmentId: "d1", name: "職員", rank: 1, createdAt: "" },
    { id: "p-sales", departmentId: "d2", name: "主任", rank: 9, createdAt: "" },
    { id: "p-sales-low", departmentId: "d2", name: "職員", rank: 1, createdAt: "" },
  ];
  const assignments: Assignment[] = [
    { account: "LEAD", departmentId: "d1", positionId: "p-high" },
    { account: "CLERK", departmentId: "d1", positionId: "p-low" },
    { account: "OTHER", departmentId: "d2", positionId: "p-sales" },
    { account: "BOTH", departmentId: "d1", positionId: "p-high" },
    { account: "BOTH", departmentId: "d2", positionId: "p-sales-low" },
  ];

  assert.equal(canQueryAccount(assignments, positions, "LEAD", "CLERK"), true);
  assert.equal(canQueryAccount(assignments, positions, "CLERK", "LEAD"), false);
  assert.equal(canQueryAccount(assignments, positions, "LEAD", "LEAD"), false);
  assert.equal(canQueryAccount(assignments, positions, "OTHER", "CLERK"), false);
  assert.equal(canQueryAccount(assignments, positions, "LEAD", "OTHER"), false);
  assert.equal(canQueryAccount(assignments, positions, "OTHER", "BOTH"), true);
  assert.equal(canQueryAccount(assignments, positions, "LEAD", "BOTH"), false);

  const permissions = setStaffPermission(
    [{ ...seedUsers()[0], account: "CLERK" }],
    [],
    "CLERK",
    "可查看全部",
  );
  assert.equal(permissions.ok, true);
  assert.equal(canQueryAccount(assignments, positions, "CLERK", "LEAD"), false);
});

test("工作紀錄只可由本人修改", () => {
  const created = addWorkRecord([], "HR01", { title: " 對帳 ", content: "上午" }, now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.title, "對帳");
  const blocked = updateWorkRecord([created.value], "CEO", created.value.id, {
    title: "改掉",
    content: "",
  }, now);
  assert.equal(blocked.ok, false);
  const edited = updateWorkRecord([created.value], "HR01", created.value.id, {
    title: "對帳完成",
    content: "下午",
  }, now);
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.value[0]?.title, "對帳完成");
  assert.equal(edited.value[0]?.account, "HR01");
});

test("月視圖由星期日開始，並鋪滿當月", () => {
  const cells = monthMatrix(2026, 9);
  assert.equal(cells.length % 7, 0);
  assert.equal(new Date(cells[0].year, cells[0].month, cells[0].day).getDay(), 0);
  const current = cells.filter((cell) => !cell.outside);
  assert.equal(current.length, daysInMonth(2026, 9));
  assert.equal(current[0].day, 1);
  assert.equal(current.at(-1)?.day, 31);
});
