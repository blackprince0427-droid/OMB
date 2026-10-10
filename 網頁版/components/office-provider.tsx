"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  addDepartment,
  addPosition,
  addProjectTag,
  addUser,
  addWorkRecord,
  appendOperationLog,
  assignMember,
  assignRole,
  assignStaffAccess,
  authenticate,
  authenticateDeveloper,
  canManageDepartments,
  changePassword,
  changePosition,
  companyBaseFromPath,
  companyForLocation,
  completeWorkRecord,
  createCompanyWithInitialCeo,
  disableCompany,
  emptyBundle,
  isConsolePath,
  logsForCompany,
  parseWebsite,
  reassignWorkRecord,
  stamp,
  updateWorkRecord,
  type Assignment,
  type Company,
  type CompanyBundle,
  type Department,
  type OfficeUser,
  type Position,
  type ProjectTag,
  type Role,
  type Session,
  type StaffPermission,
  type WorkRecord,
} from "@/lib/office";
import {
  COMPANIES_KEY,
  ensureOfficeStore,
  isCompanyDisabled,
  loadDeveloperSession,
  loadLogs,
  loadSession,
  saveCompanies,
  saveCompanyBundle,
  saveDeveloperSession,
  saveLogs,
  saveSession,
} from "@/lib/storage";

export type Activity = {
  name: string;
  action: string;
  time: string;
  tag: string;
};

export type CompanyState = "ready" | "missing" | "disabled" | "backend";

type OfficeContextValue = {
  ready: boolean;
  company: Company | null;
  companyState: CompanyState;
  companyBase: string;
  users: OfficeUser[];
  session: Session | null;
  activity: Activity[];
  departments: Department[];
  positions: Position[];
  assignments: Assignment[];
  permissions: StaffPermission[];
  records: WorkRecord[];
  tags: ProjectTag[];
  login: (account: string, password: string) => string | null;
  createUser: (input: {
    name: string;
    account: string;
    password: string;
    role: Role;
  }) => string | null;
  createDepartment: (name: string) => string | null;
  createPosition: (input: { departmentId: string; name: string; rank: string }) => string | null;
  assignToDepartment: (input: { account: string; departmentId: string; positionId: string }) => string | null;
  saveStaffPermission: (account: string, note: string) => string | null;
  assignAccountRole: (account: string, role: Role) => string | null;
  saveAccountAccess: (input: { account: string; note: string; override: boolean; visibleAccounts: string[] }) => string | null;
  changeOwnPassword: (oldPassword: string, newPassword: string) => string | null;
  logout: () => void;
  changeMemberPosition: (input: { account: string; departmentId: string; positionId: string }) => string | null;
  createRecord: (input: { title: string; content: string; workDate?: string; assignee?: string; tagId?: string }) => string | null;
  editRecord: (id: string, input: { title: string; content: string; tagId?: string }) => string | null;
  reassignRecord: (id: string, assignee: string) => string | null;
  createTag: (name: string) => string | null;
  completeRecord: (id: string) => string | null;
  developer: boolean;
  developerLogin: (account: string, password: string) => string | null;
  developerLogout: () => void;
  openCompany: (input: {
    name: string;
    website: string;
    ceoName: string;
    account: string;
    password: string;
  }) => { error: string | null; path: string };
  disableCompanyByName: (name: string) => string | null;
  listCompanies: () => Company[];
  companyLogs: (companyId: string) => { at: string; actor: string; action: string }[];
};

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeKey = isConsolePath(pathname) ? "backend" : pathname;
  const companyBase = companyBaseFromPath(pathname);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyState, setCompanyState] = useState<CompanyState>("ready");
  const [users, setUsers] = useState<OfficeUser[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [developer, setDeveloper] = useState(false);
  const ready = loadedFor === routeKey;

  useEffect(() => {
    const store = ensureOfficeStore();
    // 登入狀態在瀏覽器裡。首屏要和伺服器一致，所以等掛載後才讀取。
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage and sessionStorage are not available during SSR */
    if (isConsolePath(pathname)) {
      setCompany(null);
      setCompanyState("backend");
      setDeveloper(loadDeveloperSession());
      setSession(null);
      setUsers([]);
      setDepartments([]);
      setPositions([]);
      setAssignments([]);
      setPermissions([]);
      setRecords([]);
      setTags([]);
      setLoadedFor("backend");
      return;
    }
    const found = companyForLocation(store.companies, window.location.origin, pathname);
    if (!found) {
      setCompany(null);
      setCompanyState("missing");
      setDeveloper(false);
      setSession(null);
      setUsers([]);
      setDepartments([]);
      setPositions([]);
      setAssignments([]);
      setPermissions([]);
      setRecords([]);
      setTags([]);
      setLoadedFor(pathname);
      return;
    }
    const bundle = store.bundles[found.id] ?? emptyBundle();
    setDeveloper(false);
    setCompany(found);
    setCompanyState(found.disabled ? "disabled" : "ready");
    setUsers(bundle.users);
    setDepartments(bundle.departments);
    setPositions(bundle.positions);
    setAssignments(bundle.assignments);
    setPermissions(bundle.permissions);
    setRecords(bundle.records);
    setTags(bundle.tags);
    if (found.disabled) {
      const current = loadSession(bundle.users, found.id);
      if (current) saveSession(null);
      setSession(null);
    } else {
      setSession(loadSession(bundle.users, found.id));
    }
    setLoadedFor(pathname);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  useEffect(() => {
    if (!company) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COMPANIES_KEY && event.key !== null) return;
      if (!isCompanyDisabled(company.id)) return;
      saveSession(null);
      setSession(null);
      setCompanyState("disabled");
      setCompany({ ...company, disabled: true });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [company]);

  const value = useMemo<OfficeContextValue>(() => {
    function currentBundle(): CompanyBundle {
      return { users, departments, positions, assignments, permissions, records, tags };
    }
    function writeBundle(next: CompanyBundle) {
      if (!company) return;
      saveCompanyBundle(company.id, next);
    }
    function note(actor: string, action: string) {
      if (!company) return;
      saveLogs(appendOperationLog(loadLogs(), { companyId: company.id, actor, action }, new Date()));
    }
    function stopped(): string | null {
      if (!company || !isCompanyDisabled(company.id)) return null;
      saveSession(null);
      setSession(null);
      setCompanyState("disabled");
      setCompany({ ...company, disabled: true });
      return "此公司已停用，不得繼續操作。";
    }
    return {
      ready,
      company,
      companyState,
      companyBase,
      users,
      session,
      activity,
      departments,
      positions,
      assignments,
      permissions,
      records,
      tags,
      developer,
      developerLogin(account, password) {
        if (!authenticateDeveloper(account, password)) return "開發人員帳戶或密碼不正確。";
        saveDeveloperSession(true);
        setDeveloper(true);
        return null;
      },
      developerLogout() {
        saveDeveloperSession(false);
        setDeveloper(false);
      },
      login(account, password) {
        const halt = stopped();
        if (halt) return halt;
        if (!company || company.disabled) return "此公司已停用，帳戶不得登入。";
        const user = authenticate(users, account, password);
        if (!user) return "帳戶或密碼不正確，未能進入主框架。";
        const next = { account: user.account, name: user.name, role: user.role, companyId: company.id };
        saveSession(next);
        setSession(next);
        note(user.name, "登入主框架");
        setActivity((current) => [
          {
            name: user.name,
            action: "登入主框架",
            time: stamp(new Date()),
            tag: "已驗證",
          },
          ...current,
        ]);
        return null;
      },
      createUser(input) {
        const halt = stopped();
        if (halt) return halt;
        const result = addUser(users, input, new Date());
        if (!result.ok) return result.error;
        const nextUsers = [...users, result.user];
        writeBundle({ ...currentBundle(), users: nextUsers });
        setUsers(nextUsers);
        note(session?.name ?? "CEO", `新增使用者 ${result.user.account}`);
        setActivity((current) => [
          {
            name: session?.name ?? "CEO",
            action: `新增使用者 ${result.user.account}`,
            time: result.user.createdAt,
            tag: "使用者",
          },
          ...current,
        ]);
        return null;
      },
      createDepartment(name) {
        const halt = stopped();
        if (halt) return halt;
        const result = addDepartment(departments, name, new Date());
        if (!result.ok) return result.error;
        const next = [...departments, result.value];
        writeBundle({ ...currentBundle(), departments: next });
        setDepartments(next);
        note(session?.name ?? "CEO", `新增部門 ${result.value.name}`);
        return null;
      },
      createPosition(input) {
        const halt = stopped();
        if (halt) return halt;
        const result = addPosition(departments, positions, input, new Date());
        if (!result.ok) return result.error;
        const next = [...positions, result.value];
        writeBundle({ ...currentBundle(), positions: next });
        setPositions(next);
        note(session?.name ?? "CEO", `新增職位 ${result.value.name}`);
        return null;
      },
      assignToDepartment(input) {
        const halt = stopped();
        if (halt) return halt;
        const result = assignMember(users, departments, positions, assignments, input);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), assignments: result.value });
        setAssignments(result.value);
        note(session?.name ?? "CEO", "指派部門與職位");
        return null;
      },
      saveStaffPermission(account, noteText) {
        const halt = stopped();
        if (halt) return halt;
        if (!session || !canManageDepartments(session.role)) return "沒有權限指派個別權限。";
        const existing = permissions.find((item) => item.account === account.trim());
        const result = assignStaffAccess(users, permissions, session.role, {
          account,
          note: noteText,
          override: existing?.override === true,
          visibleAccounts: existing?.visibleAccounts ?? [],
        });
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), permissions: result.value });
        setPermissions(result.value);
        note(session.name, "記錄個別權限");
        return null;
      },
      assignAccountRole(account, role) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得指派角色。";
        const result = assignRole(users, session.role, account, role);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), users: result.value });
        setUsers(result.value);
        const updated = result.value.find((user) => user.account === account.trim());
        if (updated && session.account === updated.account) {
          const next = { ...session, role: updated.role };
          saveSession(next);
          setSession(next);
        }
        note(session.name, `指派角色 ${account.trim()}`);
        return null;
      },
      saveAccountAccess(input) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得指派個別權限。";
        const result = assignStaffAccess(users, permissions, session.role, input);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), permissions: result.value });
        setPermissions(result.value);
        note(session.name, "指派個別權限");
        return null;
      },
      changeOwnPassword(oldPassword, newPassword) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得更改密碼。";
        const result = changePassword(users, session.account, oldPassword, newPassword);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), users: result.value });
        setUsers(result.value);
        note(session.name, "更改密碼");
        return null;
      },
      logout() {
        note(session?.name ?? "", "登出");
        saveSession(null);
        setSession(null);
      },
      changeMemberPosition(input) {
        const halt = stopped();
        if (halt) return halt;
        if (!session || !canManageDepartments(session.role)) return "沒有權限更改職位。";
        const result = changePosition(positions, assignments, input);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), assignments: result.value });
        setAssignments(result.value);
        note(session.name, "更改職位");
        return null;
      },
      createRecord(input) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得處理工作紀錄。";
        const result = addWorkRecord(records, session.account, input, new Date(), { users, tags });
        if (!result.ok) return result.error;
        const next = [result.value, ...records];
        writeBundle({ ...currentBundle(), records: next });
        setRecords(next);
        note(session.name, "新增工作紀錄");
        return null;
      },
      editRecord(id, input) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得處理工作紀錄。";
        const result = updateWorkRecord(records, session.account, id, input, new Date(), tags);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), records: result.value });
        setRecords(result.value);
        note(session.name, "修改工作紀錄");
        return null;
      },
      reassignRecord(id, assignee) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得處理工作紀錄。";
        const result = reassignWorkRecord(records, session.account, id, assignee, users, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), records: result.value });
        setRecords(result.value);
        note(session.name, "分交工作紀錄");
        return null;
      },
      createTag(name) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得建立標籤。";
        const result = addProjectTag(tags, name, new Date());
        if (!result.ok) return result.error;
        const next = [...tags, result.value];
        writeBundle({ ...currentBundle(), tags: next });
        setTags(next);
        note(session.name, `新增標籤 ${result.value.name}`);
        return null;
      },
      completeRecord(id) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得處理工作紀錄。";
        const result = completeWorkRecord(records, session.account, id, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), records: result.value });
        setRecords(result.value);
        note(session.name, "標為已完成");
        return null;
      },
      openCompany(input) {
        if (!developer) return { error: "請先以開發人員登入。", path: "" };
        const store = ensureOfficeStore();
        const result = createCompanyWithInitialCeo(store.companies, input, new Date());
        if (!result.ok) return { error: result.error, path: "" };
        saveCompanies([...store.companies, result.value.company]);
        saveCompanyBundle(result.value.company.id, { ...emptyBundle(), users: [result.value.user] });
        saveLogs(
          appendOperationLog(
            loadLogs(),
            { companyId: result.value.company.id, actor: "開發者後台", action: "建立公司與初始 CEO" },
            new Date(),
          ),
        );
        const parsed = parseWebsite(result.value.company.website);
        const path = !parsed || (parsed.host !== null && parsed.host !== window.location.host) ? "" : parsed.path;
        return { error: null, path };
      },
      disableCompanyByName(name) {
        if (!developer) return "請先以開發人員登入。";
        const store = ensureOfficeStore();
        const result = disableCompany(store.companies, name);
        if (!result.ok) return result.error;
        saveCompanies(result.value);
        const current = result.value.find((item) => item.name === name.trim());
        if (current) {
          saveLogs(
            appendOperationLog(
              loadLogs(),
              { companyId: current.id, actor: "開發者後台", action: "停用公司" },
              new Date(),
            ),
          );
        }
        return null;
      },
      listCompanies() {
        if (!developer) return [];
        return ensureOfficeStore().companies;
      },
      companyLogs(companyId) {
        if (!developer) return [];
        return logsForCompany(loadLogs(), companyId).map((item) => ({
          at: item.at,
          actor: item.actor,
          action: item.action,
        }));
      },
    };
  }, [
    activity,
    assignments,
    company,
    developer,
    companyBase,
    companyState,
    departments,
    permissions,
    positions,
    ready,
    records,
    session,
    tags,
    users,
  ]);

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export function useOffice(): OfficeContextValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("OfficeProvider 尚未掛載");
  return value;
}
