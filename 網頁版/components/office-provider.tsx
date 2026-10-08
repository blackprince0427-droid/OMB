"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDepartment,
  addPosition,
  addUser,
  addWorkRecord,
  assignMember,
  authenticate,
  setStaffPermission,
  stamp,
  updateWorkRecord,
  type Assignment,
  type Department,
  type OfficeUser,
  type Position,
  type Role,
  type Session,
  type StaffPermission,
  type WorkRecord,
} from "@/lib/office";
import {
  loadAssignments,
  loadDepartments,
  loadPermissions,
  loadPositions,
  loadRecords,
  loadSession,
  loadUsers,
  saveAssignments,
  saveDepartments,
  savePermissions,
  savePositions,
  saveRecords,
  saveSession,
  saveUsers,
} from "@/lib/storage";

export type Activity = {
  name: string;
  action: string;
  time: string;
  tag: string;
};

type OfficeContextValue = {
  ready: boolean;
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
  createRecord: (input: { title: string; content: string }) => string | null;
  editRecord: (id: string, input: { title: string; content: string }) => string | null;
};

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<OfficeUser[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [records, setRecords] = useState<WorkRecord[]>([]);

  useEffect(() => {
    const storedUsers = loadUsers();
    // 登入狀態在瀏覽器裡。首屏要和伺服器一致，所以等掛載後才讀取。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage and sessionStorage are not available during SSR
    setUsers(storedUsers);
    setSession(loadSession(storedUsers));
    setDepartments(loadDepartments());
    setPositions(loadPositions());
    setAssignments(loadAssignments());
    setPermissions(loadPermissions());
    setRecords(loadRecords());
    setReady(true);
  }, []);

  const value = useMemo<OfficeContextValue>(
    () => ({
      ready,
      users,
      session,
      activity,
      departments,
      positions,
      assignments,
      permissions,
      records,
      login(account, password) {
        const user = authenticate(users, account, password);
        if (!user) return "帳戶或密碼不正確，未能進入主框架。";
        const next = { account: user.account, name: user.name, role: user.role };
        saveSession(next);
        setSession(next);
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
        saveUsers(nextUsers);
        setUsers(nextUsers);
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
        saveDepartments(next);
        setDepartments(next);
        return null;
      },
      createPosition(input) {
        const result = addPosition(departments, positions, input, new Date());
        if (!result.ok) return result.error;
        const next = [...positions, result.value];
        savePositions(next);
        setPositions(next);
        return null;
      },
      assignToDepartment(input) {
        const result = assignMember(users, departments, positions, assignments, input);
        if (!result.ok) return result.error;
        saveAssignments(result.value);
        setAssignments(result.value);
        return null;
      },
      saveStaffPermission(account, note) {
        const result = setStaffPermission(users, permissions, account, note);
        if (!result.ok) return result.error;
        savePermissions(result.value);
        setPermissions(result.value);
        return null;
      },
      createRecord(input) {
        if (!session) return "未登入不得處理工作紀錄。";
        const result = addWorkRecord(records, session.account, input, new Date());
        if (!result.ok) return result.error;
        const next = [result.value, ...records];
        saveRecords(next);
        setRecords(next);
        return null;
      },
      editRecord(id, input) {
        if (!session) return "未登入不得處理工作紀錄。";
        const result = updateWorkRecord(records, session.account, id, input, new Date());
        if (!result.ok) return result.error;
        saveRecords(result.value);
        setRecords(result.value);
        return null;
      },
    }),
    [activity, assignments, departments, permissions, positions, ready, records, session, users],
  );

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export function useOffice(): OfficeContextValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("OfficeProvider 尚未掛載");
  return value;
}
