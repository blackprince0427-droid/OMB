import {
  isRole,
  seedUsers,
  type OfficeUser,
  type Session,
} from "@/lib/office";

export const USERS_KEY = "osp-dev-v1-users";
export const SESSION_KEY = "osp-dev-v1-session";

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
