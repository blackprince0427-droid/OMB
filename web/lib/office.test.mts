import assert from "node:assert/strict";
import test from "node:test";
import {
  addDepartment,
  addPosition,
  addUser,
  addWorkRecord,
  appendOperationLog,
  assignMember,
  authenticate,
  canManageDepartments,
  canManageUsers,
  authenticateDeveloper,
  canQueryAccount,
  changePassword,
  companyForLocation,
  createCompany,
  createCompanyWithInitialCeo,
  defaultCompany,
  disableCompany,
  emptyBundle,
  changePosition,
  completeWorkRecord,
  dateStamp,
  daysInMonth,
  logsForCompany,
  monthMatrix,
  normalizeWorkRecord,
  pageOf,
  recordsForAccount,
  seedUsers,
  setStaffPermission,
  unfinishedRecords,
  updateWorkRecord,
  type Assignment,
  type Position,
  type WorkRecord,
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

test("更改密碼要對上舊密碼，新密碼原樣保存", () => {
  const users = seedUsers();
  assert.equal(changePassword(users, "CEO", "wrong", "next").ok, false);
  assert.equal(changePassword(users, "CEO", "CEO", "").ok, false);
  const spaced = changePassword(users, "CEO", "CEO", " CEO ");
  assert.equal(spaced.ok, true);
  if (!spaced.ok) return;
  assert.equal(spaced.value[0]?.password, " CEO ");
  assert.equal(authenticate(spaced.value, "CEO", " CEO ")?.account, "CEO");
  assert.equal(changePassword(users, "CEO", "CEO", "CEO").ok, true);
});

test("更改職位只替換已屬部門，查詢範圍跟著變", () => {
  const positions: Position[] = [
    { id: "p-high", departmentId: "d1", name: "主任", rank: 2, createdAt: "" },
    { id: "p-low", departmentId: "d1", name: "職員", rank: 1, createdAt: "" },
    { id: "p-top", departmentId: "d1", name: "經理", rank: 3, createdAt: "" },
    { id: "p-sales-low", departmentId: "d2", name: "職員", rank: 1, createdAt: "" },
  ];
  const assignments: Assignment[] = [
    { account: "LEAD", departmentId: "d1", positionId: "p-high" },
    { account: "CLERK", departmentId: "d1", positionId: "p-low" },
  ];
  const outside = changePosition(positions, assignments, {
    account: "CLERK",
    departmentId: "d2",
    positionId: "p-sales-low",
  });
  assert.equal(outside.ok, false);
  assert.equal(assignments.length, 2);

  const raised = changePosition(positions, assignments, {
    account: "CLERK",
    departmentId: "d1",
    positionId: "p-top",
  });
  assert.equal(raised.ok, true);
  if (!raised.ok) return;
  assert.equal(raised.value.filter((item) => item.account === "CLERK").length, 1);
  assert.equal(canQueryAccount(raised.value, positions, "LEAD", "CLERK"), false);
  assert.equal(canQueryAccount(raised.value, positions, "CLERK", "LEAD"), true);
});

test("工作紀錄按 10 筆分頁，日期搜尋只留當天", () => {
  let records: WorkRecord[] = [];
  for (let index = 0; index < 11; index += 1) {
    const created = addWorkRecord(
      [],
      "CEO",
      { title: `同日${index}`, content: "", workDate: "2026-10-08" },
      now,
    );
    assert.equal(created.ok, true);
    if (!created.ok) return;
    records = [created.value, ...records];
  }
  const other = addWorkRecord([], "CEO", { title: "另一天", content: "", workDate: "2026-10-07" }, now);
  assert.equal(other.ok, true);
  if (!other.ok) return;
  records = [other.value, ...records];

  const sameDay = recordsForAccount(records, "CEO", "2026-10-08");
  assert.equal(sameDay.length, 11);
  assert.equal(pageOf(sameDay, 1).items.length, 10);
  assert.equal(pageOf(sameDay, 2).items.length, 1);
  assert.equal(pageOf(sameDay, 2).pageCount, 2);
  assert.equal(recordsForAccount(records, "CEO").length, 12);
  assert.equal(recordsForAccount(records, "CEO")[0]?.title, "另一天");
});

test("標為已完成後離開未完成清單，工作紀錄仍在", () => {
  const created = addWorkRecord([], "HR01", { title: "未完成", content: "待辦" }, now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.done, false);
  assert.equal(created.value.workDate, dateStamp(now));
  const blocked = completeWorkRecord([created.value], "CEO", created.value.id, now);
  assert.equal(blocked.ok, false);
  const done = completeWorkRecord([created.value], "HR01", created.value.id, now);
  assert.equal(done.ok, true);
  if (!done.ok) return;
  assert.equal(unfinishedRecords(done.value, "HR01").length, 0);
  assert.equal(done.value.length, 1);
  assert.equal(done.value[0]?.done, true);
  const edited = updateWorkRecord(done.value, "HR01", created.value.id, { title: "仍完成", content: "" }, now);
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.value[0]?.done, true);
  assert.equal(edited.value[0]?.workDate, "2026-10-08");
});

test("舊工作紀錄補上日期與未完成", () => {
  const record = normalizeWorkRecord({
    id: "old",
    account: "CEO",
    title: "舊紀錄",
    content: "",
    updatedAt: "2026-10-01 09:30",
  });
  assert.equal(record?.workDate, "2026-10-01");
  assert.equal(record?.done, false);
});

test("只限後台建立公司，新公司沒有預設帳戶", () => {
  const companies = [defaultCompany()];
  assert.equal(createCompany(companies, { name: " ", website: "https://a.example" }, now).ok, false);
  assert.equal(createCompany(companies, { name: "甲公司", website: " " }, now).ok, false);
  const created = createCompany(companies, { name: " 甲公司 ", website: " https://a.example " }, now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.name, "甲公司");
  assert.equal(created.value.website, "https://a.example");
  assert.equal(created.value.disabled, false);
  const fresh = emptyBundle();
  assert.equal(fresh.users.length, 0);
  assert.equal(fresh.records.length, 0);
  const duplicate = createCompany([created.value], { name: "甲公司", website: "https://b.example" }, now);
  assert.equal(duplicate.ok, false);
  const sameSite = createCompany([created.value], { name: "乙公司", website: "https://a.example" }, now);
  assert.equal(sameSite.ok, false);
});

test("停用公司保留公司本身，該公司帳戶不得再登入", () => {
  const created = createCompany([defaultCompany()], { name: "甲公司", website: "https://a.example" }, now);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const companies = [defaultCompany(), created.value];
  const disabled = disableCompany(companies, "甲公司");
  assert.equal(disabled.ok, true);
  if (!disabled.ok) return;
  assert.equal(disabled.value.length, 2);
  assert.equal(disabled.value.find((item) => item.name === "甲公司")?.disabled, true);
  assert.equal(disabled.value.find((item) => item.name === "預設公司")?.disabled, false);
  assert.equal(disableCompany(disabled.value, "甲公司").ok, false);
  assert.equal(disableCompany(disabled.value, "沒有這家").ok, false);
  const users = seedUsers();
  assert.equal(authenticate(users, "CEO", "CEO")?.account, "CEO");
  assert.equal(authenticate([], "CEO", "CEO"), null);
});

test("不同公司的日誌不得互通", () => {
  const first = appendOperationLog([], { companyId: "a", actor: "開發者後台", action: "建立公司" }, now);
  const both = appendOperationLog(first, { companyId: "b", actor: "開發者後台", action: "停用公司" }, now);
  assert.equal(logsForCompany(both, "a").length, 1);
  assert.equal(logsForCompany(both, "a")[0]?.action, "建立公司");
  assert.equal(logsForCompany(both, "b")[0]?.action, "停用公司");
  assert.equal(logsForCompany(both, "c").length, 0);
});

test("新帳戶不得使用 CEO 作為帳戶與密碼", () => {
  const rejected = addUser(seedUsers(), { name: "某人", account: "CEO", password: "CEO", role: "員工" }, now);
  assert.equal(rejected.ok, false);
  const named = addUser([], { name: "陳可恩", account: "CEO", password: "其他密碼", role: "CEO" }, now);
  assert.equal(named.ok, true);
});

test("建立公司必須同時建立只屬於該公司的初始 CEO", () => {
  const created = createCompanyWithInitialCeo(
    [defaultCompany()],
    { name: "甲公司", website: "/acme", ceoName: " 陳可恩 ", account: " BOSS ", password: "secret" },
    now,
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.user.account, "BOSS");
  assert.equal(created.value.user.role, "CEO");
  assert.equal(created.value.user.password, "secret");
  const shared = createCompanyWithInitialCeo(
    [defaultCompany()],
    { name: "乙公司", website: "/beta", ceoName: "某人", account: "CEO", password: "CEO" },
    now,
  );
  assert.equal(shared.ok, false);
  const blockedPath = createCompany([defaultCompany()], { name: "丙公司", website: "/overview" }, now);
  assert.equal(blockedPath.ok, false);
});

test("一個網站只載入網站相符的公司", () => {
  const acme = createCompany([defaultCompany()], { name: "甲公司", website: "/acme" }, now);
  assert.equal(acme.ok, true);
  if (!acme.ok) return;
  const hosted = createCompany([defaultCompany(), acme.value], { name: "乙公司", website: "https://acme.example" }, now);
  assert.equal(hosted.ok, true);
  if (!hosted.ok) return;
  const companies = [defaultCompany(), acme.value, hosted.value];
  assert.equal(companyForLocation(companies, "http://127.0.0.1:43123", "/overview")?.name, "預設公司");
  assert.equal(companyForLocation(companies, "http://127.0.0.1:43123", "/acme")?.name, "甲公司");
  assert.equal(companyForLocation(companies, "http://127.0.0.1:43123", "/acme/records")?.name, "甲公司");
  assert.equal(companyForLocation(companies, "https://acme.example", "/")?.name, "乙公司");
  assert.equal(companyForLocation(companies, "https://acme.example", "/overview")?.id, hosted.value.id);
  assert.notEqual(companyForLocation(companies, "http://127.0.0.1:43123", "/acme")?.id, "default");
});

test("同部門職位順序相同不可互相查詢", () => {
  const positions: Position[] = [
    { id: "p1", departmentId: "d1", name: "甲", rank: 2, createdAt: "" },
    { id: "p2", departmentId: "d1", name: "乙", rank: 2, createdAt: "" },
  ];
  const assignments: Assignment[] = [
    { account: "A", departmentId: "d1", positionId: "p1" },
    { account: "B", departmentId: "d1", positionId: "p2" },
  ];
  assert.equal(canQueryAccount(assignments, positions, "A", "B"), false);
  assert.equal(canQueryAccount(assignments, positions, "B", "A"), false);
});

test("開發人員登入不使用公司帳戶", () => {
  assert.equal(authenticateDeveloper("開發人員", "開發人員"), true);
  assert.equal(authenticateDeveloper("CEO", "CEO"), false);
  assert.equal(authenticateDeveloper("開發人員", "開發人員 "), false);
});

test("公司網站與後台的路徑分開", () => {
  assert.equal(companyForLocation([defaultCompany()], "http://127.0.0.1:43123", "/console"), null);
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
