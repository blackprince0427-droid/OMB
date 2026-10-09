import {
  DEFAULT_COMPANY_ID,
  defaultCompany,
  emptyBundle,
  isRole,
  seedUsers,
  type Assignment,
  type Company,
  type CompanyBundle,
  type Department,
  type OfficeUser,
  type OperationLog,
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
export const COMPANIES_KEY = "osp-dev-v4-companies";
export const BUNDLES_KEY = "osp-dev-v4-bundles";
export const LOGS_KEY = "osp-dev-v4-logs";

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

function readRawSession(): Partial<Session> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<Session>;
  } catch {
    return null;
  }
}

export function loadSession(users: OfficeUser[], companyId = DEFAULT_COMPANY_ID): Session | null {
  const session = readRawSession();
  if (!session || typeof session.account !== "string") return null;
  const sessionCompany = typeof session.companyId === "string" ? session.companyId : DEFAULT_COMPANY_ID;
  if (sessionCompany !== companyId) return null;
  const user = users.find((item) => item.account === session.account);
  if (!user) return null;
  return { account: user.account, name: user.name, role: user.role, companyId };
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
      companyId: session.companyId,
    }),
  );
}

function isCompany(value: unknown): value is Company {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Company>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.website === "string" &&
    typeof item.disabled === "boolean" &&
    typeof item.createdAt === "string"
  );
}

function isLog(value: unknown): value is OperationLog {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OperationLog>;
  return (
    typeof item.id === "string" &&
    typeof item.companyId === "string" &&
    typeof item.actor === "string" &&
    typeof item.action === "string" &&
    typeof item.at === "string"
  );
}

function bundleFromUnknown(companyId: string, value: unknown): CompanyBundle {
  const source = value && typeof value === "object" ? (value as Partial<CompanyBundle>) : {};
  const users = Array.isArray(source.users) ? source.users.filter(isUser) : [];
  return {
    users: companyId === DEFAULT_COMPANY_ID && users.length === 0 ? seedUsers() : users,
    departments: Array.isArray(source.departments) ? source.departments.filter(isDepartment) : [],
    positions: Array.isArray(source.positions) ? source.positions.filter(isPosition) : [],
    assignments: Array.isArray(source.assignments) ? source.assignments.filter(isAssignment) : [],
    permissions: Array.isArray(source.permissions) ? source.permissions.filter(isPermission) : [],
    records: Array.isArray(source.records)
      ? source.records.flatMap((item) => {
          const record = normalizeWorkRecord(item);
          return record ? [record] : [];
        })
      : [],
  };
}

function readCompanies(): Company[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COMPANIES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const companies = parsed.filter(isCompany);
    return companies.length > 0 ? companies : null;
  } catch {
    return null;
  }
}

function readBundles(): Record<string, CompanyBundle> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BUNDLES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([companyId, value]) => [companyId, bundleFromUnknown(companyId, value)]),
    );
  } catch {
    return {};
  }
}

export type OfficeStore = {
  companies: Company[];
  bundles: Record<string, CompanyBundle>;
};

export function ensureOfficeStore(): OfficeStore {
  const existing = readCompanies();
  if (existing) {
    const bundles = readBundles();
    for (const company of existing) {
      if (!bundles[company.id]) bundles[company.id] = bundleFromUnknown(company.id, emptyBundle());
    }
    return { companies: existing, bundles };
  }
  const company = defaultCompany();
  const bundle = bundleFromUnknown(company.id, {
    users: loadUsers(),
    departments: loadDepartments(),
    positions: loadPositions(),
    assignments: loadAssignments(),
    permissions: loadPermissions(),
    records: loadRecords(),
  });
  const store = { companies: [company], bundles: { [company.id]: bundle } };
  saveCompanies(store.companies);
  window.localStorage.setItem(BUNDLES_KEY, JSON.stringify(store.bundles));
  return store;
}

export function saveCompanies(companies: Company[]): void {
  window.localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function saveCompanyBundle(companyId: string, bundle: CompanyBundle): void {
  const bundles = readBundles();
  bundles[companyId] = bundle;
  window.localStorage.setItem(BUNDLES_KEY, JSON.stringify(bundles));
}

export function loadLogs(): OperationLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLog);
  } catch {
    return [];
  }
}

export function saveLogs(logs: OperationLog[]): void {
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function peekSession(store: OfficeStore): { session: Session; companyDisabled: boolean } | null {
  const raw = readRawSession();
  if (!raw || typeof raw.account !== "string") return null;
  const companyId = typeof raw.companyId === "string" ? raw.companyId : DEFAULT_COMPANY_ID;
  const company = store.companies.find((item) => item.id === companyId);
  if (!company) return null;
  const user = store.bundles[companyId]?.users.find((item) => item.account === raw.account);
  if (!user) return null;
  return {
    session: { account: user.account, name: user.name, role: user.role, companyId },
    companyDisabled: company.disabled,
  };
}
