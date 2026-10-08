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

export function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
