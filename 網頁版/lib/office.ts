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
};

export type WorkRecord = {
  id: string;
  account: string;
  title: string;
  content: string;
  workDate: string;
  done: boolean;
  updatedAt: string;
};

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
  const trimmed = note.trim();
  const next = permissions.filter((item) => item.account !== normalized);
  if (trimmed) next.push({ account: normalized, note: trimmed });
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

export function canQueryAccount(
  assignments: Assignment[],
  positions: Position[],
  viewer: string,
  owner: string,
): boolean {
  if (!viewer || viewer === owner) return false;
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

export function addWorkRecord(
  records: WorkRecord[],
  account: string,
  input: { title: string; content: string; workDate?: string },
  now: Date,
): NamedResult<WorkRecord> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "工作紀錄標題須填寫。" };
  const workDate = input.workDate && /^\d{4}-\d{2}-\d{2}$/.test(input.workDate) ? input.workDate : dateStamp(now);
  return {
    ok: true,
    value: {
      id: createId(now),
      account,
      title,
      content: input.content.trim(),
      workDate,
      done: false,
      updatedAt: stamp(now),
    },
  };
}

export function updateWorkRecord(
  records: WorkRecord[],
  actor: string,
  id: string,
  input: { title: string; content: string },
  now: Date,
): NamedResult<WorkRecord[]> {
  const current = records.find((item) => item.id === id);
  if (!current || current.account !== actor) {
    return { ok: false, error: "只能修改自己的工作紀錄。" };
  }
  const title = input.title.trim();
  if (!title) return { ok: false, error: "工作紀錄標題須填寫。" };
  return {
    ok: true,
    value: records.map((item) =>
      item.id === id
        ? { ...item, title, content: input.content.trim(), updatedAt: stamp(now) }
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
  if (!current || current.account !== actor) {
    return { ok: false, error: "只能把自己的工作紀錄標為已完成。" };
  }
  return {
    ok: true,
    value: records.map((item) =>
      item.id === id ? { ...item, done: true, updatedAt: stamp(now) } : item,
    ),
  };
}

export function recordsForAccount(records: WorkRecord[], account: string, workDate = ""): WorkRecord[] {
  return records.filter((item) => {
    if (item.account !== account) return false;
    if (workDate && item.workDate !== workDate) return false;
    return true;
  });
}

export function unfinishedRecords(records: WorkRecord[], account: string): WorkRecord[] {
  return records.filter((item) => item.account === account && !item.done);
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
  return {
    id: item.id,
    account: item.account,
    title: item.title,
    content: item.content,
    workDate,
    done: item.done === true,
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
