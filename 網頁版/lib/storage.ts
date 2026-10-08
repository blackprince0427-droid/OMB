import {
  isRole,
  seedUsers,
  type Assignment,
  type Department,
  type OfficeUser,
  type Position,
  type Session,
  normalizeWorkRecord,
  type StaffPermission,
  type WorkRecord,
} from "@/lib/office";

export const USERS_KEY = "osp-dev-v1-users";
export const SESSION_KEY = "osp-dev-v1-session";
export const DEPARTMENTS_KEY = "osp-dev-v2-departments";
export const POSITIONS_KEY = "osp-dev-v2-positions";
export const ASSIGNMENTS_KEY = "osp-dev-v2-assignments";
export const PERMISSIONS_KEY = "osp-dev-v2-permissions";
export const RECORDS_KEY = "osp-dev-v2-records";

function isUser(value: unknown): value is OfficeUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<OfficeUser>;
  return (
    typeof user.account === "string" &&
    typeof user.password === "string" &&
    typeof user.name === "string" &&
    typeof user.role === "string" &&
    isRole(user.role) &&
    typeof user.createdAt === "string"
  );
}

export function loadUsers(): OfficeUser[] {
  if (typeof window === "undefined") return seedUsers();
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return seedUsers();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedUsers();
    const users = parsed.filter(isUser);
    return users.length > 0 ? users : seedUsers();
  } catch {
    return seedUsers();
  }
}

export function saveUsers(users: OfficeUser[]): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadSession(users: OfficeUser[]): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const session = parsed as Partial<Session>;
    if (typeof session.account !== "string") return null;
    const user = users.find((item) => item.account === session.account);
    if (!user) return null;
    return { account: user.account, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

function readList<T>(key: string, keep: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(keep);
  } catch {
    return [];
  }
}

function isDepartment(value: unknown): value is Department {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Department>;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.createdAt === "string";
}

function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Position>;
  return (
    typeof item.id === "string" &&
    typeof item.departmentId === "string" &&
    typeof item.name === "string" &&
    typeof item.rank === "number" &&
    Number.isInteger(item.rank) &&
    typeof item.createdAt === "string"
  );
}

function isAssignment(value: unknown): value is Assignment {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Assignment>;
  return typeof item.account === "string" && typeof item.departmentId === "string" && typeof item.positionId === "string";
}

function isPermission(value: unknown): value is StaffPermission {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StaffPermission>;
  return typeof item.account === "string" && typeof item.note === "string" && item.note.trim().length > 0;
}

export function loadDepartments(): Department[] {
  return readList(DEPARTMENTS_KEY, isDepartment);
}

export function saveDepartments(departments: Department[]): void {
  window.localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
}

export function loadPositions(): Position[] {
  return readList(POSITIONS_KEY, isPosition);
}

export function savePositions(positions: Position[]): void {
  window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

export function loadAssignments(): Assignment[] {
  return readList(ASSIGNMENTS_KEY, isAssignment);
}

export function saveAssignments(assignments: Assignment[]): void {
  window.localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function loadPermissions(): StaffPermission[] {
  return readList(PERMISSIONS_KEY, isPermission);
}

export function savePermissions(permissions: StaffPermission[]): void {
  window.localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
}

export function loadRecords(): WorkRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const record = normalizeWorkRecord(item);
      return record ? [record] : [];
    });
  } catch {
    return [];
  }
}

export function saveRecords(records: WorkRecord[]): void {
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function saveSession(session: Session | null): void {
  if (!session) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      account: session.account,
      name: session.name,
      role: session.role,
    }),
  );
}
