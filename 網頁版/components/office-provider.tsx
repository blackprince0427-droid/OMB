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
  addUser,
  addWorkRecord,
  appendOperationLog,
  assignMember,
  authenticate,
  canManageDepartments,
  changePassword,
  changePosition,
  companyBaseFromPath,
  companyIdFromPath,
  completeWorkRecord,
  createCompany,
  disableCompany,
  emptyBundle,
  setStaffPermission,
  stamp,
  updateWorkRecord,
  type Assignment,
  type Company,
  type CompanyBundle,
  type Department,
  type OfficeUser,
  type Position,
  type Role,
  type Session,
  type StaffPermission,
  type WorkRecord,
} from "@/lib/office";
import {
  ensureOfficeStore,
  loadLogs,
  loadSession,
  peekSession,
  saveCompanies,
  saveCompanyBundle,
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
  changeOwnPassword: (oldPassword: string, newPassword: string) => string | null;
  logout: () => void;
  changeMemberPosition: (input: { account: string; departmentId: string; positionId: string }) => string | null;
  createRecord: (input: { title: string; content: string; workDate?: string }) => string | null;
  editRecord: (id: string, input: { title: string; content: string }) => string | null;
  completeRecord: (id: string) => string | null;
  openCompany: (input: { name: string; website: string }) => { error: string | null; path: string };
  disableCompanyByName: (name: string) => string | null;
};

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeKey = companyIdFromPath(pathname) ?? "backend";
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
  const ready = loadedFor === routeKey;

  useEffect(() => {
    const store = ensureOfficeStore();
    const activeId = companyIdFromPath(pathname);
    // 登入狀態在瀏覽器裡。首屏要和伺服器一致，所以等掛載後才讀取。
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage and sessionStorage are not available during SSR */
    if (activeId === null) {
      const peeked = peekSession(store);
      if (peeked?.companyDisabled) saveSession(null);
      setCompany(null);
      setCompanyState("backend");
      setSession(peeked && !peeked.companyDisabled ? peeked.session : null);
      setUsers([]);
      setDepartments([]);
      setPositions([]);
      setAssignments([]);
      setPermissions([]);
      setRecords([]);
      setLoadedFor("backend");
      return;
    }
    const found = store.companies.find((item) => item.id === activeId) ?? null;
    if (!found) {
      setCompany(null);
      setCompanyState("missing");
      setSession(null);
      setUsers([]);
      setDepartments([]);
      setPositions([]);
      setAssignments([]);
      setPermissions([]);
      setRecords([]);
      setLoadedFor(activeId);
      return;
    }
    const bundle = store.bundles[found.id] ?? emptyBundle();
    setCompany(found);
    setCompanyState(found.disabled ? "disabled" : "ready");
    setUsers(bundle.users);
    setDepartments(bundle.departments);
    setPositions(bundle.positions);
    setAssignments(bundle.assignments);
    setPermissions(bundle.permissions);
    setRecords(bundle.records);
    if (found.disabled) {
      const peeked = peekSession(store);
      if (peeked?.session.companyId === found.id) saveSession(null);
      setSession(null);
    } else {
      setSession(loadSession(bundle.users, found.id));
    }
    setLoadedFor(activeId);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  const value = useMemo<OfficeContextValue>(() => {
    function currentBundle(): CompanyBundle {
      return { users, departments, positions, assignments, permissions, records };
    }
    function writeBundle(next: CompanyBundle) {
      if (!company) return;
      saveCompanyBundle(company.id, next);
    }
    function note(actor: string, action: string) {
      if (!company) return;
      saveLogs(appendOperationLog(loadLogs(), { companyId: company.id, actor, action }, new Date()));
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
      login(account, password) {
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
        const result = addDepartment(departments, name, new Date());
        if (!result.ok) return result.error;
        const next = [...departments, result.value];
        writeBundle({ ...currentBundle(), departments: next });
        setDepartments(next);
        note(session?.name ?? "CEO", `新增部門 ${result.value.name}`);
        return null;
      },
      createPosition(input) {
        const result = addPosition(departments, positions, input, new Date());
        if (!result.ok) return result.error;
        const next = [...positions, result.value];
        writeBundle({ ...currentBundle(), positions: next });
        setPositions(next);
        note(session?.name ?? "CEO", `新增職位 ${result.value.name}`);
        return null;
      },
      assignToDepartment(input) {
        const result = assignMember(users, departments, positions, assignments, input);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), assignments: result.value });
        setAssignments(result.value);
        note(session?.name ?? "CEO", "指派部門與職位");
        return null;
      },
      saveStaffPermission(account, noteText) {
        const result = setStaffPermission(users, permissions, account, noteText);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), permissions: result.value });
        setPermissions(result.value);
        note(session?.name ?? "CEO", "記錄個別權限");
        return null;
      },
      changeOwnPassword(oldPassword, newPassword) {
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
        if (!session || !canManageDepartments(session.role)) return "沒有權限更改職位。";
        const result = changePosition(positions, assignments, input);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), assignments: result.value });
        setAssignments(result.value);
        note(session.name, "更改職位");
        return null;
      },
      createRecord(input) {
        if (!session) return "未登入不得處理工作紀錄。";
        const result = addWorkRecord(records, session.account, input, new Date());
        if (!result.ok) return result.error;
        const next = [result.value, ...records];
        writeBundle({ ...currentBundle(), records: next });
        setRecords(next);
        note(session.name, "新增工作紀錄");
        return null;
      },
      editRecord(id, input) {
        if (!session) return "未登入不得處理工作紀錄。";
        const result = updateWorkRecord(records, session.account, id, input, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), records: result.value });
        setRecords(result.value);
        note(session.name, "修改工作紀錄");
        return null;
      },
      completeRecord(id) {
        if (!session) return "未登入不得處理工作紀錄。";
        const result = completeWorkRecord(records, session.account, id, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), records: result.value });
        setRecords(result.value);
        note(session.name, "標為已完成");
        return null;
      },
      openCompany(input) {
        const store = ensureOfficeStore();
        const result = createCompany(store.companies, input, new Date());
        if (!result.ok) return { error: result.error, path: "" };
        saveCompanies([...store.companies, result.value]);
        saveCompanyBundle(result.value.id, emptyBundle());
        saveLogs(
          appendOperationLog(
            loadLogs(),
            { companyId: result.value.id, actor: "開發者後台", action: "建立公司" },
            new Date(),
          ),
        );
        return { error: null, path: `/s/${result.value.id}` };
      },
      disableCompanyByName(name) {
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
    };
  }, [
    activity,
    assignments,
    company,
    companyBase,
    companyState,
    departments,
    permissions,
    positions,
    ready,
    records,
    session,
    users,
  ]);

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export function useOffice(): OfficeContextValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("OfficeProvider 尚未掛載");
  return value;
}
