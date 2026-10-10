import type { TaskInvite, TaskNode } from "@/lib/tasks";

export const ROLES = ["員工", "HR", "會計", "CEO"] as const;

export type Role = (typeof ROLES)[number];

export type OfficeUser = {
  account: string;
  password: string;
  name: string;
  role: Role;
  createdAt: string;
};

export type Session = {
  account: string;
  name: string;
  role: Role;
  companyId: string;
};

export const DEFAULT_COMPANY_ID = "default";

export type Company = {
  id: string;
  name: string;
  website: string;
  disabled: boolean;
  createdAt: string;
};

export type CompanyBundle = {
  users: OfficeUser[];
  departments: Department[];
  positions: Position[];
  assignments: Assignment[];
  permissions: StaffPermission[];
  records: WorkRecord[];
  tags: ProjectTag[];
  tasks: TaskNode[];
  invites: TaskInvite[];
};

export type OperationLog = {
  id: string;
  companyId: string;
  actor: string;
  action: string;
  at: string;
};

export type CalendarCell = {
  year: number;
  month: number;
  day: number;
  outside: boolean;
};

export const SEED_USER: OfficeUser = {
  account: "CEO",
  password: "CEO",
  name: "預設管理員",
  role: "CEO",
  createdAt: "2026-10-08 09:00",
};

export function seedUsers(): OfficeUser[] {
  return [{ ...SEED_USER }];
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function canManageUsers(role: Role): boolean {
  return role === "CEO";
}

export function canManageDepartments(role: Role): boolean {
  return role === "CEO" || role === "HR";
}

export function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function authenticate(
  users: OfficeUser[],
  account: string,
  password: string,
): OfficeUser | null {
  const normalized = account.trim();
  return (
    users.find(
      (user) => user.account === normalized && user.password === password,
    ) ?? null
  );
}

export type AddUserInput = {
  name: string;
  account: string;
  password: string;
  role: string;
};

export type AddUserResult =
  | { ok: true; user: OfficeUser }
  | { ok: false; error: string };

export function addUser(
  users: OfficeUser[],
  input: AddUserInput,
  now: Date,
): AddUserResult {
  const name = input.name.trim();
  const account = input.account.trim();
  const password = input.password;
  if (!name || !account || !password) {
    return { ok: false, error: "顯示名稱、帳戶與密碼均須填寫。" };
  }
  if (account === "CEO" && password === "CEO") {
    return { ok: false, error: "新帳戶不得使用 CEO 作為帳戶與密碼。" };
  }
  if (!isRole(input.role)) {
    return { ok: false, error: "角色只可為 CEO、HR、會計或員工。" };
  }
  if (
    users.some((user) => user.account.toLowerCase() === account.toLowerCase())
  ) {
    return { ok: false, error: "此帳戶已存在，請使用另一個帳戶名稱。" };
  }
  return {
    ok: true,
    user: {
      name,
      account,
      password,
      role: input.role,
      createdAt: stamp(now),
    },
  };
}

export function monthMatrix(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const leading = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < leading; index += 1) {
    const date = new Date(year, month, 1 - (leading - index));
    cells.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      outside: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ year, month, day, outside: false });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const date = new Date(last.year, last.month, last.day + 1);
    cells.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      outside: true,
    });
  }

  return cells;
}

export function isSameDay(
  year: number,
  month: number,
  day: number,
  now: Date,
): boolean {
  return (
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day
  );
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export type Department = {
  id: string;
  name: string;
  createdAt: string;
};

export type Position = {
  id: string;
  departmentId: string;
  name: string;
  rank: number;
  createdAt: string;
};

export type Assignment = {
  account: string;
  departmentId: string;
  positionId: string;
};

export type StaffPermission = {
  account: string;
  note: string;
  override: boolean;
  visibleAccounts: string[];
};

export type ProjectTag = {
  id: string;
  name: string;
  createdAt: string;
};

export type WorkRecord = {
  id: string;
  account: string;
  assignee: string;
  title: string;
  content: string;
  workDate: string;
  done: boolean;
  tagId: string;
  taskNodeId: string;
  taskLevel: 0 | 1 | 2 | 3 | null;
  updatedAt: string;
};

export const CROSS_PERSON_COPY =
  "跨人是指同一瀏覽器、同一本機，用不同帳戶輪流登入後才看得到。不是即時多人同時協作，也沒有即時通知。";

export const HANDOFF_COPY =
  "分交只改這筆紀錄的歸屬。同一瀏覽器輪流登入後，新歸屬者可以修改，原歸屬者不能再改。沒有即時通知。";

export const RECORD_PAGE_SIZE = 10;

let idSequence = 0;

export function createId(now: Date): string {
  idSequence += 1;
  return `${now.getTime().toString(36)}-${idSequence.toString(36)}`;
}

export function parseRank(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export type NamedResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function addDepartment(
  departments: Department[],
  name: string,
  now: Date,
): NamedResult<Department> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "部門名稱須填寫。" };
  if (departments.some((item) => item.name === trimmed)) {
    return { ok: false, error: "此部門名稱已存在。" };
  }
  return {
    ok: true,
    value: { id: createId(now), name: trimmed, createdAt: stamp(now) },
  };
}

export function addPosition(
  departments: Department[],
  positions: Position[],
  input: { departmentId: string; name: string; rank: string },
  now: Date,
): NamedResult<Position> {
  const department = departments.find((item) => item.id === input.departmentId);
  if (!department) return { ok: false, error: "請選擇部門。" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "職位名稱須填寫。" };
  const rank = parseRank(input.rank);
  if (rank === null) return { ok: false, error: "職位順序須為整數。數字較大者為較高職位。" };
  if (
    positions.some(
      (item) => item.departmentId === department.id && item.name === name,
    )
  ) {
    return { ok: false, error: "此部門已有同名職位。" };
  }
  return {
    ok: true,
    value: {
      id: createId(now),
      departmentId: department.id,
      name,
      rank,
      createdAt: stamp(now),
    },
  };
}

export function assignMember(
  users: OfficeUser[],
  departments: Department[],
  positions: Position[],
  assignments: Assignment[],
  input: { account: string; departmentId: string; positionId: string },
): NamedResult<Assignment[]> {
  const account = input.account.trim();
  if (!users.some((user) => user.account === account)) {
    return { ok: false, error: "請選擇已建立的帳戶。" };
  }
  if (!departments.some((item) => item.id === input.departmentId)) {
    return { ok: false, error: "請選擇部門。" };
  }
  const position = positions.find((item) => item.id === input.positionId);
  if (!position || position.departmentId !== input.departmentId) {
    return { ok: false, error: "請選擇該部門的職位。每個部門只能有一個職位。" };
  }
  const next = assignments.filter(
    (item) => !(item.account === account && item.departmentId === input.departmentId),
  );
  next.push({
    account,
    departmentId: input.departmentId,
    positionId: position.id,
  });
  return { ok: true, value: next };
}

export function normalizeStaffPermission(value: unknown): StaffPermission | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StaffPermission>;
  if (typeof item.account !== "string" || typeof item.note !== "string") return null;
  const visibleAccounts = Array.isArray(item.visibleAccounts)
    ? [...new Set(item.visibleAccounts.filter((account): account is string => typeof account === "string" && account.trim().length > 0))]
    : [];
  const override = item.override === true;
  const note = item.note.trim();
  if (!note && !override && visibleAccounts.length === 0) return null;
  return { account: item.account, note, override, visibleAccounts };
}

export function setStaffPermission(
  users: OfficeUser[],
  permissions: StaffPermission[],
  account: string,
  note: string,
): NamedResult<StaffPermission[]> {
  const normalized = account.trim();
  if (!users.some((user) => user.account === normalized)) {
    return { ok: false, error: "請選擇已建立的帳戶。" };
  }
  const existing = permissions.find((item) => item.account === normalized);
  return assignStaffAccess(users, permissions, "CEO", {
    account: normalized,
    note,
    override: existing?.override === true,
    visibleAccounts: existing?.visibleAccounts ?? [],
  });
}

export function assignRole(
  users: OfficeUser[],
  actorRole: Role,
  account: string,
  role: string,
): NamedResult<OfficeUser[]> {
  if (!canManageDepartments(actorRole)) return { ok: false, error: "沒有權限指派角色。" };
  const normalized = account.trim();
  const current = users.find((user) => user.account === normalized);
  if (!current) return { ok: false, error: "請選擇已建立的帳戶。" };
  if (!isRole(role)) return { ok: false, error: "角色只可為 CEO、HR、會計或員工。" };
  if (current.role === "CEO" && role !== "CEO" && users.filter((user) => user.role === "CEO").length <= 1) {
    return { ok: false, error: "公司至少要保留一位 CEO。" };
  }
  return {
    ok: true,
    value: users.map((user) => (user.account === normalized ? { ...user, role } : user)),
  };
}

export function assignStaffAccess(
  users: OfficeUser[],
  permissions: StaffPermission[],
  actorRole: Role,
  input: { account: string; note: string; override: boolean; visibleAccounts: string[] },
): NamedResult<StaffPermission[]> {
  if (!canManageDepartments(actorRole)) return { ok: false, error: "沒有權限指派個別權限。" };
  const normalized = input.account.trim();
  if (!users.some((user) => user.account === normalized)) {
    return { ok: false, error: "請選擇已建立的帳戶。" };
  }
  const visibleAccounts = [
    ...new Set(input.visibleAccounts.map((account) => account.trim()).filter((account) => account && account !== normalized)),
  ];
  if (visibleAccounts.some((account) => !users.some((user) => user.account === account))) {
    return { ok: false, error: "可見帳戶必須是已建立的帳戶。" };
  }
  const note = input.note.trim();
  const override = input.override === true;
  const next = permissions.filter((item) => item.account !== normalized);
  if (!note && !override && visibleAccounts.length === 0) return { ok: true, value: next };
  next.push({ account: normalized, note, override, visibleAccounts });
  return { ok: true, value: next };
}

export function rankInDepartment(
  assignments: Assignment[],
  positions: Position[],
  account: string,
  departmentId: string,
): number | null {
  const assignment = assignments.find(
    (item) => item.account === account && item.departmentId === departmentId,
  );
  if (!assignment) return null;
  return positions.find((item) => item.id === assignment.positionId)?.rank ?? null;
}

export function sharesDepartment(assignments: Assignment[], left: string, right: string): boolean {
  if (!left || !right || left === right) return false;
  const departmentIds = new Set(
    assignments.filter((item) => item.account === left).map((item) => item.departmentId),
  );
  return assignments.some((item) => item.account === right && departmentIds.has(item.departmentId));
}

export function canQueryAccount(
  assignments: Assignment[],
  positions: Position[],
  viewer: string,
  owner: string,
  permissions: StaffPermission[] = [],
): boolean {
  if (!viewer || viewer === owner) return false;
  const permission = permissions.find((item) => item.account === viewer);
  if (permission?.override) {
    return sharesDepartment(assignments, viewer, owner) && permission.visibleAccounts.includes(owner);
  }
  const departmentIds = new Set(
    assignments
      .filter((item) => item.account === viewer)
      .map((item) => item.departmentId),
  );
  for (const departmentId of departmentIds) {
    const viewerRank = rankInDepartment(assignments, positions, viewer, departmentId);
    const ownerRank = rankInDepartment(assignments, positions, owner, departmentId);
    if (viewerRank !== null && ownerRank !== null && viewerRank > ownerRank) {
      return true;
    }
  }
  return false;
}

export function changePassword(
  users: OfficeUser[],
  account: string,
  oldPassword: string,
  newPassword: string,
): NamedResult<OfficeUser[]> {
  const user = users.find((item) => item.account === account);
  if (!user) return { ok: false, error: "未登入不得更改密碼。" };
  if (user.password !== oldPassword) return { ok: false, error: "舊密碼不正確。" };
  if (!newPassword) return { ok: false, error: "新密碼須填寫。" };
  return {
    ok: true,
    value: users.map((item) => (item.account === account ? { ...item, password: newPassword } : item)),
  };
}

export function changePosition(
  positions: Position[],
  assignments: Assignment[],
  input: { account: string; departmentId: string; positionId: string },
): NamedResult<Assignment[]> {
  const current = assignments.find(
    (item) => item.account === input.account && item.departmentId === input.departmentId,
  );
  if (!current) return { ok: false, error: "請指定此帳戶已屬的部門。" };
  const position = positions.find((item) => item.id === input.positionId);
  if (!position || position.departmentId !== input.departmentId) {
    return { ok: false, error: "請選擇該部門的職位。" };
  }
  return {
    ok: true,
    value: assignments.map((item) =>
      item.account === input.account && item.departmentId === input.departmentId
        ? { ...item, positionId: position.id }
        : item,
    ),
  };
}

export function recordAssignee(record: Pick<WorkRecord, "account" | "assignee">): string {
  return record.assignee || record.account;
}

export function canEditWorkRecord(record: WorkRecord, actor: string): boolean {
  return recordAssignee(record) === actor;
}

export function addProjectTag(tags: ProjectTag[], name: string, now: Date): NamedResult<ProjectTag> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "標籤名稱須填寫。" };
  if (tags.some((item) => item.name === trimmed)) return { ok: false, error: "此標籤名稱已存在。" };
  return { ok: true, value: { id: createId(now), name: trimmed, createdAt: stamp(now) } };
}

export function recordsWithTag(records: WorkRecord[], tagId: string): WorkRecord[] {
  return records.filter((item) => item.tagId === tagId);
}

export function addWorkRecord(
  records: WorkRecord[],
  account: string,
  input: { title: string; content: string; workDate?: string; assignee?: string; tagId?: string },
  now: Date,
  context: { users?: OfficeUser[]; tags?: ProjectTag[] } = {},
): NamedResult<WorkRecord> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "工作紀錄標題須填寫。" };
  const assignee = (input.assignee ?? account).trim() || account;
  if (context.users && !context.users.some((user) => user.account === assignee)) {
    return { ok: false, error: "請選擇已建立的歸屬帳戶。" };
  }
  const tagId = (input.tagId ?? "").trim();
  if (tagId && !context.tags?.some((tag) => tag.id === tagId)) {
    return { ok: false, error: "請選擇已建立的專案標籤。" };
  }
  const workDate = input.workDate && /^\d{4}-\d{2}-\d{2}$/.test(input.workDate) ? input.workDate : dateStamp(now);
  return {
    ok: true,
    value: {
      id: createId(now),
      account,
      assignee,
      title,
      content: input.content.trim(),
      workDate,
      done: false,
      tagId,
      taskNodeId: "",
      taskLevel: null,
      updatedAt: stamp(now),
    },
  };
}

export function updateWorkRecord(
  records: WorkRecord[],
  actor: string,
  id: string,
  input: { title: string; content: string; tagId?: string },
  now: Date,
  tags?: ProjectTag[],
): NamedResult<WorkRecord[]> {
  const current = records.find((item) => item.id === id);
  if (!current || !canEditWorkRecord(current, actor)) {
    return { ok: false, error: "只能修改歸屬自己的工作紀錄。" };
  }
  const title = input.title.trim();
  if (!title) return { ok: false, error: "工作紀錄標題須填寫。" };
  let tagId = current.tagId;
  if (input.tagId !== undefined) {
    tagId = input.tagId.trim();
    if (tagId && !tags?.some((tag) => tag.id === tagId)) {
      return { ok: false, error: "請選擇已建立的專案標籤。" };
    }
  }
  return {
    ok: true,
    value: records.map((item) =>
      item.id === id
        ? { ...item, title, content: input.content.trim(), tagId, taskNodeId: item.taskNodeId, taskLevel: item.taskLevel, updatedAt: stamp(now) }
        : item,
    ),
  };
}

export function completeWorkRecord(
  records: WorkRecord[],
  actor: string,
  id: string,
  now: Date,
): NamedResult<WorkRecord[]> {
  const current = records.find((item) => item.id === id);
  if (!current || !canEditWorkRecord(current, actor)) {
    return { ok: false, error: "只能把歸屬自己的工作紀錄標為已完成。" };
  }
  return {
    ok: true,
    value: records.map((item) => (item.id === id ? { ...item, done: true, updatedAt: stamp(now) } : item)),
  };
}

export function reassignWorkRecord(
  records: WorkRecord[],
  actor: string,
  id: string,
  assignee: string,
  users: OfficeUser[],
  now: Date,
): NamedResult<WorkRecord[]> {
  const current = records.find((item) => item.id === id);
  if (!current || !canEditWorkRecord(current, actor)) {
    return { ok: false, error: "只有目前歸屬者可以分交這筆工作紀錄。" };
  }
  const nextAssignee = assignee.trim();
  if (!users.some((user) => user.account === nextAssignee)) {
    return { ok: false, error: "請選擇已建立的歸屬帳戶。" };
  }
  return {
    ok: true,
    value: records.map((item) => (item.id === id ? { ...item, assignee: nextAssignee, updatedAt: stamp(now) } : item)),
  };
}

export function recordsForAccount(records: WorkRecord[], account: string, workDate = ""): WorkRecord[] {
  return records.filter((item) => {
    if (recordAssignee(item) !== account) return false;
    if (workDate && item.workDate !== workDate) return false;
    return true;
  });
}

export function unfinishedRecords(records: WorkRecord[], account: string): WorkRecord[] {
  return records.filter((item) => recordAssignee(item) === account && !item.done);
}

export function crossPersonTodos(
  records: WorkRecord[],
  viewer: string,
  assignments: Assignment[],
  positions: Position[],
  permissions: StaffPermission[] = [],
): { assignedToMe: WorkRecord[]; visibleToMe: WorkRecord[] } {
  const open = records.filter((item) => !item.done);
  return {
    assignedToMe: open.filter((item) => recordAssignee(item) === viewer && item.account !== viewer),
    visibleToMe: open.filter((item) => {
      const owner = recordAssignee(item);
      if (owner === viewer) return false;
      return canQueryAccount(assignments, positions, viewer, owner, permissions);
    }),
  };
}

export function normalizeWorkRecord(value: unknown): WorkRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<WorkRecord>;
  if (
    typeof item.id !== "string" ||
    typeof item.account !== "string" ||
    typeof item.title !== "string" ||
    typeof item.content !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }
  const workDate =
    typeof item.workDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.workDate)
      ? item.workDate
      : item.updatedAt.slice(0, 10);
  const assignee = typeof item.assignee === "string" && item.assignee.trim() ? item.assignee : item.account;
  return {
    id: item.id,
    account: item.account,
    assignee,
    title: item.title,
    content: item.content,
    workDate,
    done: item.done === true,
    tagId: typeof item.tagId === "string" ? item.tagId : "",
    taskNodeId: typeof item.taskNodeId === "string" ? item.taskNodeId : "",
    taskLevel: item.taskLevel === 0 || item.taskLevel === 1 || item.taskLevel === 2 || item.taskLevel === 3 ? item.taskLevel : null,
    updatedAt: item.updatedAt,
  };
}

export function pageOf<T>(items: T[], page: number, size = RECORD_PAGE_SIZE): {
  items: T[];
  page: number;
  pageCount: number;
} {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pageCount };
}

export function defaultCompany(): Company {
  return {
    id: DEFAULT_COMPANY_ID,
    name: "預設公司",
    website: "/",
    disabled: false,
    createdAt: "2026-10-08 09:00",
  };
}

export function emptyBundle(): CompanyBundle {
  return {
    users: [],
    departments: [],
    positions: [],
    assignments: [],
    permissions: [],
    records: [],
    tags: [],
    tasks: [],
    invites: [],
  };
}

export function isConsolePath(path: string): boolean {
  return path === "/console" || path.startsWith("/console/");
}

const ROOT_PATHS = new Set(["/", "/overview", "/calendar", "/records", "/pending", "/account", "/users", "/departments", "/permissions", "/projects", "/deleted"]);

export function stripQuery(path: string): string {
  const index = path.indexOf("?");
  return index === -1 ? path : path.slice(0, index);
}

export function companyBaseFromPath(path: string): string {
  const pathname = stripQuery(path);
  if (isConsolePath(pathname) || pathname === "/" || ROOT_PATHS.has(pathname)) return "";
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "";
}

const WORK_PATHS = new Set(["/records", "/pending", "/projects", "/deleted"]);

export function officeRouteKey(path: string): string {
  const pathname = stripQuery(path);
  if (isConsolePath(pathname)) return "backend";
  const base = companyBaseFromPath(pathname);
  const rest = (base ? pathname.slice(base.length) : pathname) || "/";
  if (WORK_PATHS.has(rest)) return `${base}::work`;
  return pathname;
}

export const DEVELOPER_ACCOUNT = "開發人員";
export const DEVELOPER_PASSWORD = "開發人員";

export function authenticateDeveloper(account: string, password: string): boolean {
  return account.trim() === DEVELOPER_ACCOUNT && password === DEVELOPER_PASSWORD;
}

export type ParsedWebsite = { host: string | null; path: string };

export function parseWebsite(website: string): ParsedWebsite | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  let host: string | null = null;
  let path = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      host = url.host;
      path = url.pathname || "/";
    } catch {
      return null;
    }
  } else if (!trimmed.startsWith("/")) {
    return null;
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (!path.startsWith("/")) return null;
  if (path.split("/").filter(Boolean).length > 1) return null;
  if (path === "/console" || (path !== "/" && ROOT_PATHS.has(path))) return null;
  return { host, path };
}

function parsedCompanyWebsite(company: Company): ParsedWebsite | null {
  const website = company.id === DEFAULT_COMPANY_ID && company.website === "" ? "/" : company.website;
  return parseWebsite(website);
}

function websitesConflict(left: ParsedWebsite, right: ParsedWebsite): boolean {
  if (left.path !== right.path) return false;
  if (left.path === "/" && left.host !== right.host) return false;
  if (left.host === null || right.host === null) return true;
  return left.host === right.host;
}

export function companyForLocation(companies: Company[], origin: string, pathname: string): Company | null {
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = "";
  }
  let best: { company: Company; score: number } | null = null;
  for (const company of companies) {
    const parsed = parsedCompanyWebsite(company);
    if (!parsed) continue;
    if (parsed.host !== null && parsed.host !== originHost) continue;
    const matches =
      parsed.path === "/"
        ? ROOT_PATHS.has(pathname)
        : pathname === parsed.path || pathname.startsWith(`${parsed.path}/`);
    if (!matches) continue;
    const score = (parsed.host ? 10000 : 0) + parsed.path.length;
    if (!best || score > best.score) best = { company, score };
  }
  return best?.company ?? null;
}

export function createCompany(
  companies: Company[],
  input: { name: string; website: string },
  now: Date,
): NamedResult<Company> {
  const name = input.name.trim();
  const website = input.website.trim();
  if (!name) return { ok: false, error: "公司名稱須填寫。" };
  if (!website) return { ok: false, error: "網站須填寫。" };
  const parsed = parseWebsite(website);
  if (!parsed) return { ok: false, error: "網站須為一層路徑（例如 /acme）或 http(s) 網址，且不能占用系統頁面。" };
  if (companies.some((item) => item.name === name)) return { ok: false, error: "此公司名稱已存在。" };
  if (
    companies.some((item) => {
      const other = parsedCompanyWebsite(item);
      return other ? websitesConflict(parsed, other) : false;
    })
  ) {
    return { ok: false, error: "此網站已存在。" };
  }
  return {
    ok: true,
    value: {
      id: createId(now),
      name,
      website,
      disabled: false,
      createdAt: stamp(now),
    },
  };
}

export function createCompanyWithInitialCeo(
  companies: Company[],
  input: { name: string; website: string; ceoName: string; account: string; password: string },
  now: Date,
): NamedResult<{ company: Company; user: OfficeUser }> {
  const created = createCompany(companies, input, now);
  if (!created.ok) return created;
  const ceo = addUser(
    [],
    { name: input.ceoName, account: input.account, password: input.password, role: "CEO" },
    now,
  );
  if (!ceo.ok) return ceo;
  return { ok: true, value: { company: created.value, user: ceo.user } };
}

export function disableCompany(companies: Company[], name: string): NamedResult<Company[]> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "公司名稱須填寫。" };
  const current = companies.find((item) => item.name === trimmed);
  if (!current) return { ok: false, error: "找不到此公司。" };
  if (current.disabled) return { ok: false, error: "此公司已停用。" };
  return {
    ok: true,
    value: companies.map((item) => (item.id === current.id ? { ...item, disabled: true } : item)),
  };
}

export function appendOperationLog(
  logs: OperationLog[],
  input: { companyId: string; actor: string; action: string },
  now: Date,
): OperationLog[] {
  return [
    {
      id: createId(now),
      companyId: input.companyId,
      actor: input.actor,
      action: input.action,
      at: stamp(now),
    },
    ...logs,
  ];
}

export function logsForCompany(logs: OperationLog[], companyId: string): OperationLog[] {
  return logs.filter((item) => item.companyId === companyId);
}
