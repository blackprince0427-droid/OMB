"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  completeWorkRecord,
  emptyBundle,
  isConsolePath,
  officeRouteKey,
  parseWebsite,
  reassignWorkRecord,
  stamp,
  updateWorkRecord,
  type Assignment,
  type Company,
  type CompanyBundle,
  type Department,
  type OfficeUser,
  type OperationLog,
  type Position,
  type ProjectTag,
  type Role,
  type Session,
  type StaffPermission,
  type WorkRecord,
} from "@/lib/office";
import {
  addLink,
  addNote,
  completionRecord,
  createChild,
  createInvite,
  createProject,
  deleteLeaf,
  deleteProject,
  moveLink,
  respondInvite,
  restoreProject,
  setNodeStatus,
  setProjectVisibility,
  toggleNote,
  withdrawInvite,
  type TaskInvite,
  type TaskNode,
  type VisibilityMode,
} from "@/lib/tasks";
import { OverwritePrompt } from "@/components/overwrite-prompt";
import { legacyEligible, loadOfficeCache, markMigrated, saveOfficeCache } from "@/lib/office-cache";
import { createCompanyRemote, disableCompanyRemote, fetchBundle, putBundle } from "@/lib/office-api";
import { loadOfficeScreen, type LoadConflict } from "@/lib/office-load";
import {
  COMPANIES_KEY,
  isCompanyDisabled,
  loadDeveloperSession,
  loadLogs,
  loadSession,
  readLegacyOfficeStore,
  saveDeveloperSession,
  saveSession,
} from "@/lib/storage";

export type Activity = {
  name: string;
  action: string;
  time: string;
  tag: string;
};

export type CompanyState = "ready" | "missing" | "disabled" | "backend" | "offline";

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
  tasks: TaskNode[];
  invites: TaskInvite[];
  pendingUpload: boolean;
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
  createProject: (name: string) => string | null;
  createChildTask: (parentId: string, name: string) => string | null;
  setTaskStatus: (nodeId: string, status: string) => string | null;
  setTaskVisibility: (projectId: string, mode: VisibilityMode, visibleAccounts: string[]) => string | null;
  removeLeafTask: (nodeId: string) => string | null;
  removeProject: (projectId: string) => string | null;
  restoreRemovedProject: (projectId: string) => string | null;
  inviteToTask: (nodeId: string, target: string, kind: "add" | "transfer") => string | null;
  withdrawTaskInvite: (inviteId: string) => string | null;
  answerTaskInvite: (inviteId: string, accept: boolean) => string | null;
  addTaskNote: (nodeId: string, title: string) => string | null;
  toggleTaskNote: (nodeId: string, noteId: string) => string | null;
  addTaskLink: (nodeId: string, url: string) => string | null;
  moveTaskLink: (nodeId: string, linkId: string, direction: -1 | 1) => string | null;
  developer: boolean;
  developerLogin: (account: string, password: string) => string | null;
  developerLogout: () => void;
  openCompany: (input: {
    name: string;
    website: string;
    ceoName: string;
    account: string;
    password: string;
  }) => Promise<{ error: string | null; path: string }>;
  disableCompanyByName: (name: string) => Promise<string | null>;
  listCompanies: () => Company[];
  companyLogs: (companyId: string) => { at: string; actor: string; action: string }[];
};

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeKey = officeRouteKey(pathname);
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
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [invites, setInvites] = useState<TaskInvite[]>([]);
  const [developer, setDeveloper] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [logsByCompany, setLogsByCompany] = useState<Record<string, { at: string; actor: string; action: string }[]>>({});
  const [pendingUpload, setPendingUpload] = useState(false);
  const [conflict, setConflict] = useState<LoadConflict | null>(null);
  const [conflictError, setConflictError] = useState("");
  const [conflictPending, setConflictPending] = useState(false);
  const ready = loadedFor === routeKey;
  const companyIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const bundleRef = useRef<CompanyBundle>(emptyBundle());
  const logsRef = useRef<OperationLog[]>([]);
  const flushing = useRef(false);
  const conflictRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // 登入狀態在瀏覽器裡。公司資料以伺服器為準，掛載後才讀。
    // 工作分頁共用同一個 routeKey，切換時不重讀，避免整頁閃回「正在確認登入狀態」。
    (async () => {
      const path = window.location.pathname;
      const outcome = await loadOfficeScreen({
        path,
        origin: window.location.origin,
        cache: loadOfficeCache(),
        legacy: legacyEligible() ? readLegacyOfficeStore() : null,
        legacyLogs: loadLogs(),
        legacyEligible: legacyEligible(),
      });
      if (cancelled) return;
      if (outcome.markMigrated) {
        saveOfficeCache(outcome.cache);
        markMigrated();
      }
      companyIdRef.current = outcome.company?.id ?? null;
      revisionRef.current = outcome.revision;
      dirtyRef.current = outcome.dirty;
      bundleRef.current = outcome.bundle;
      logsRef.current = outcome.logs;
      setCompanies(outcome.companies);
      setPendingUpload(outcome.dirty);
      const dev = isConsolePath(path) && loadDeveloperSession();
      setDeveloper(dev);
      if (dev) {
        const pairs = await Promise.all(
          outcome.companies.map(async (item) => {
            const remote = await fetchBundle(item.id);
            const logs = remote.ok && remote.found ? remote.logs : outcome.cache.entries[item.id]?.logs ?? [];
            return [item.id, logs.map((log) => ({ at: log.at, actor: log.actor, action: log.action }))] as const;
          }),
        );
        if (cancelled) return;
        setLogsByCompany(Object.fromEntries(pairs));
      }
      if (outcome.conflict) {
        conflictRef.current = true;
        setConflict(outcome.conflict);
        setConflictError("");
      } else {
        conflictRef.current = false;
        setConflict(null);
      }
      if (isConsolePath(path)) {
        setCompany(null);
        setCompanyState("backend");
        setSession(null);
        setUsers([]);
        setDepartments([]);
        setPositions([]);
        setAssignments([]);
        setPermissions([]);
        setRecords([]);
        setTags([]);
        setTasks([]);
        setInvites([]);
        setLoadedFor(routeKey);
        return;
      }
      setCompany(outcome.company);
      setCompanyState(outcome.companyState === "backend" ? "missing" : outcome.companyState);
      setUsers(outcome.bundle.users);
      setDepartments(outcome.bundle.departments);
      setPositions(outcome.bundle.positions);
      setAssignments(outcome.bundle.assignments);
      setPermissions(outcome.bundle.permissions);
      setRecords(outcome.bundle.records);
      setTags(outcome.bundle.tags);
      setTasks(outcome.bundle.tasks);
      setInvites(outcome.bundle.invites);
      if (outcome.companyState === "disabled") {
        saveSession(null);
        setSession(null);
      } else if (outcome.company && outcome.companyState === "ready") {
        setSession(loadSession(outcome.bundle.users, outcome.company.id));
      } else {
        setSession(null);
      }
      setLoadedFor(routeKey);
    })();
    return () => {
      cancelled = true;
    };
  }, [routeKey]);

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

  useEffect(() => {
    if (!developer || companies.length === 0) return;
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        companies.map(async (item) => {
          const remote = await fetchBundle(item.id);
          const logs = remote.ok && remote.found ? remote.logs : [];
          return [item.id, logs.map((log) => ({ at: log.at, actor: log.actor, action: log.action }))] as const;
        }),
      );
      if (!cancelled) setLogsByCompany(Object.fromEntries(pairs));
    })();
    return () => {
      cancelled = true;
    };
  }, [companies, developer]);

  const value = useMemo<OfficeContextValue>(() => {
    function currentBundle(): CompanyBundle {
      return { users, departments, positions, assignments, permissions, records, tags, tasks, invites };
    }
    function remember(nextBundle: CompanyBundle, nextLogs: OperationLog[], dirty: boolean) {
      if (!company) return;
      companyIdRef.current = company.id;
      bundleRef.current = nextBundle;
      logsRef.current = nextLogs;
      dirtyRef.current = dirty;
      const cache = loadOfficeCache();
      cache.entries[company.id] = { baseRevision: revisionRef.current, dirty, bundle: nextBundle, logs: nextLogs };
      if (!cache.companies.some((item) => item.id === company.id)) cache.companies = [...cache.companies, company];
      saveOfficeCache(cache);
      setPendingUpload(dirty);
    }
    async function flush() {
      if (flushing.current || conflictRef.current) return;
      flushing.current = true;
      try {
        while (dirtyRef.current && !conflictRef.current) {
          await Promise.resolve();
          const id = companyIdRef.current;
          if (!id || !dirtyRef.current || conflictRef.current) break;
          const sentBundle = bundleRef.current;
          const sentLogs = logsRef.current;
          const result = await putBundle({
            companyId: id,
            baseRevision: revisionRef.current,
            bundle: sentBundle,
            logs: sentLogs,
          });
          if (!result.ok && result.conflict) {
            conflictRef.current = true;
            setConflictError("");
            setConflict({
              companyId: id,
              localBundle: bundleRef.current,
              localLogs: logsRef.current,
              remote: result,
            });
            break;
          }
          if (!result.ok) {
            setPendingUpload(true);
            break;
          }
          revisionRef.current = result.revision;
          if (sentBundle === bundleRef.current && sentLogs === logsRef.current) {
            bundleRef.current = result.bundle;
            logsRef.current = result.logs;
            dirtyRef.current = false;
            const cache = loadOfficeCache();
            cache.entries[id] = { baseRevision: result.revision, dirty: false, bundle: result.bundle, logs: result.logs };
            saveOfficeCache(cache);
            setPendingUpload(false);
            break;
          }
          const cache = loadOfficeCache();
          cache.entries[id] = {
            baseRevision: result.revision,
            dirty: true,
            bundle: bundleRef.current,
            logs: logsRef.current,
          };
          saveOfficeCache(cache);
        }
      } finally {
        flushing.current = false;
      }
    }
    function writeBundle(next: CompanyBundle) {
      if (!company || conflictRef.current) return;
      remember(next, logsRef.current, true);
      void flush();
    }
    function note(actor: string, action: string) {
      if (!company || conflictRef.current) return;
      const nextLogs = appendOperationLog(logsRef.current, { companyId: company.id, actor, action }, new Date());
      remember(bundleRef.current, nextLogs, true);
      void flush();
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
      tasks,
      invites,
      pendingUpload,
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
        if (conflictRef.current) return "請先處理公司資料覆蓋提示。";
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
      createProject(name) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得建立專案。";
        const result = createProject(tasks, users, session.account, name, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "建立專案");
        return null;
      },
      createChildTask(parentId, name) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得建立節點。";
        const result = createChild(tasks, users, session.account, parentId, name, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "建立下一層");
        return null;
      },
      setTaskStatus(nodeId, status) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得修改節點。";
        const result = setNodeStatus(tasks, session.account, nodeId, status);
        if (!result.ok) return result.error;
        const nextRecords = result.value.completed
          ? [completionRecord(result.value.completed, session.account, new Date()), ...records]
          : records;
        writeBundle({ ...currentBundle(), tasks: result.value.nodes, records: nextRecords });
        setTasks(result.value.nodes);
        if (result.value.completed) setRecords(nextRecords);
        note(session.name, "更新節點狀態");
        return null;
      },
      setTaskVisibility(projectId, mode, visibleAccounts) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得設定可見範圍。";
        const result = setProjectVisibility(tasks, users, session.account, projectId, mode, visibleAccounts);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "設定專案可見範圍");
        return null;
      },
      removeLeafTask(nodeId) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得刪除節點。";
        const result = deleteLeaf(tasks, session.account, nodeId);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "刪除節點");
        return null;
      },
      removeProject(projectId) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得刪除專案。";
        const result = deleteProject(tasks, session.account, projectId);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "刪除專案");
        return null;
      },
      restoreRemovedProject(projectId) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得還原專案。";
        const result = restoreProject(tasks, session.account, projectId);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        note(session.name, "還原專案");
        return null;
      },
      inviteToTask(nodeId, target, kind) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得邀請。";
        const result = createInvite(tasks, invites, users, session.account, nodeId, target, kind, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), invites: result.value });
        setInvites(result.value);
        note(session.name, kind === "transfer" ? "送出轉交" : "送出添加負責人");
        return null;
      },
      withdrawTaskInvite(inviteId) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得撤回邀請。";
        const result = withdrawInvite(invites, session.account, inviteId);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), invites: result.value });
        setInvites(result.value);
        note(session.name, "撤回邀請");
        return null;
      },
      answerTaskInvite(inviteId, accept) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得回覆邀請。";
        const result = respondInvite(tasks, invites, session.account, inviteId, accept);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value.nodes, invites: result.value.invites });
        setTasks(result.value.nodes);
        setInvites(result.value.invites);
        note(session.name, accept ? "同意邀請" : "拒絕邀請");
        return null;
      },
      addTaskNote(nodeId, title) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得加備註。";
        const result = addNote(tasks, session.account, nodeId, title, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        return null;
      },
      toggleTaskNote(nodeId, noteId) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得改備註。";
        const result = toggleNote(tasks, session.account, nodeId, noteId);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        return null;
      },
      addTaskLink(nodeId, url) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得加連結。";
        const result = addLink(tasks, session.account, nodeId, url, new Date());
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        return null;
      },
      moveTaskLink(nodeId, linkId, direction) {
        const halt = stopped();
        if (halt) return halt;
        if (!session) return "未登入不得調整連結。";
        const result = moveLink(tasks, session.account, nodeId, linkId, direction);
        if (!result.ok) return result.error;
        writeBundle({ ...currentBundle(), tasks: result.value });
        setTasks(result.value);
        return null;
      },
      async openCompany(input) {
        if (!developer) return { error: "請先以開發人員登入。", path: "" };
        const result = await createCompanyRemote(input);
        if (!result.ok) return { error: result.error, path: "" };
        const cache = loadOfficeCache();
        cache.companies = result.companies;
        cache.entries[result.company.id] = {
          baseRevision: result.revision,
          dirty: false,
          bundle: result.bundle,
          logs: result.logs,
        };
        saveOfficeCache(cache);
        setCompanies(result.companies);
        setLogsByCompany((current) => ({
          ...current,
          [result.company.id]: result.logs.map((item) => ({ at: item.at, actor: item.actor, action: item.action })),
        }));
        const parsed = parseWebsite(result.company.website);
        const path = !parsed || (parsed.host !== null && parsed.host !== window.location.host) ? "" : parsed.path;
        return { error: null, path };
      },
      async disableCompanyByName(name) {
        if (!developer) return "請先以開發人員登入。";
        const result = await disableCompanyRemote(name);
        if (!result.ok) return result.error;
        const cache = loadOfficeCache();
        cache.companies = result.companies;
        const entry = cache.entries[result.companyId];
        if (entry && !entry.dirty) {
          entry.baseRevision = result.revision;
          entry.logs = result.logs;
        }
        saveOfficeCache(cache);
        setCompanies(result.companies);
        setLogsByCompany((current) => ({
          ...current,
          [result.companyId]: result.logs.map((item) => ({ at: item.at, actor: item.actor, action: item.action })),
        }));
        return null;
      },
      listCompanies() {
        if (!developer) return [];
        return companies;
      },
      companyLogs(companyId) {
        if (!developer) return [];
        return logsByCompany[companyId] ?? [];
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
    tasks,
    invites,
    pendingUpload,
    users,
    companies,
    logsByCompany,
  ]);

  async function confirmOverwrite() {
    if (!conflict) return;
    setConflictPending(true);
    setConflictError("");
    const result = await putBundle({
      companyId: conflict.companyId,
      baseRevision: conflict.remote.revision,
      bundle: conflict.localBundle,
      logs: conflict.localLogs,
      force: true,
    });
    setConflictPending(false);
    if (!result.ok) {
      if (result.conflict) {
        setConflict({ ...conflict, remote: result });
        setConflictError("伺服器上的公司資料又更新了，請再選一次。");
      } else {
        setConflictError(result.error);
      }
      return;
    }
    applyResolved(conflict.companyId, result.revision, result.bundle, result.logs);
  }

  function cancelOverwrite() {
    if (!conflict) return;
    applyResolved(conflict.companyId, conflict.remote.revision, conflict.remote.bundle, conflict.remote.logs);
  }

  function applyResolved(companyId: string, revision: number, bundle: CompanyBundle, logs: OperationLog[]) {
    const cache = loadOfficeCache();
    cache.entries[companyId] = { baseRevision: revision, dirty: false, bundle, logs };
    saveOfficeCache(cache);
    conflictRef.current = false;
    setConflict(null);
    setConflictError("");
    setLogsByCompany((current) => ({
      ...current,
      [companyId]: logs.map((item) => ({ at: item.at, actor: item.actor, action: item.action })),
    }));
    if (companyIdRef.current !== companyId) return;
    revisionRef.current = revision;
    dirtyRef.current = false;
    bundleRef.current = bundle;
    logsRef.current = logs;
    setUsers(bundle.users);
    setDepartments(bundle.departments);
    setPositions(bundle.positions);
    setAssignments(bundle.assignments);
    setPermissions(bundle.permissions);
    setRecords(bundle.records);
    setTags(bundle.tags);
    setTasks(bundle.tasks);
    setInvites(bundle.invites);
    setPendingUpload(false);
    setSession((current) => {
      if (current && !bundle.users.some((user) => user.account === current.account)) {
        saveSession(null);
        return null;
      }
      return current;
    });
  }

  return (
    <OfficeContext.Provider value={value}>
      {children}
      {conflict ? (
        <OverwritePrompt
          error={conflictError}
          pending={conflictPending}
          onConfirm={() => void confirmOverwrite()}
          onCancel={cancelOverwrite}
        />
      ) : null}
    </OfficeContext.Provider>
  );
}

export function useOffice(): OfficeContextValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("OfficeProvider 尚未掛載");
  return value;
}
