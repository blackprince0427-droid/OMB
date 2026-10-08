import assert from "node:assert/strict";
import test from "node:test";
import {
  addUser,
  authenticate,
  canManageUsers,
  daysInMonth,
  monthMatrix,
  seedUsers,
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

test("月視圖由星期日開始，並鋪滿當月", () => {
  const cells = monthMatrix(2026, 9);
  assert.equal(cells.length % 7, 0);
  assert.equal(new Date(cells[0].year, cells[0].month, cells[0].day).getDay(), 0);
  const current = cells.filter((cell) => !cell.outside);
  assert.equal(current.length, daysInMonth(2026, 9));
  assert.equal(current[0].day, 1);
  assert.equal(current.at(-1)?.day, 31);
});
