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
  addUser,
  authenticate,
  stamp,
  type OfficeUser,
  type Role,
  type Session,
} from "@/lib/office";
import { loadSession, loadUsers, saveSession, saveUsers } from "@/lib/storage";

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
  login: (account: string, password: string) => string | null;
  createUser: (input: {
    name: string;
    account: string;
    password: string;
    role: Role;
  }) => string | null;
};

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<OfficeUser[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const storedUsers = loadUsers();
    // 登入狀態在瀏覽器裡。首屏要和伺服器一致，所以等掛載後才讀取。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage and sessionStorage are not available during SSR
    setUsers(storedUsers);
    setSession(loadSession(storedUsers));
    setReady(true);
  }, []);

  const value = useMemo<OfficeContextValue>(
    () => ({
      ready,
      users,
      session,
      activity,
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
    }),
    [activity, ready, session, users],
  );

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export function useOffice(): OfficeContextValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("OfficeProvider 尚未掛載");
  return value;
}
