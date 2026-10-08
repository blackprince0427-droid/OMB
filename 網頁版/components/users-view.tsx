"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canManageUsers, ROLES, type Role } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

export function UsersView() {
  const { session, users, createUser } = useOffice();
  const [role, setRole] = useState<Role>("員工");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!session) return null;

  if (!canManageUsers(session.role)) {
    return (
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-5">
        <h1 className="text-xl font-bold">沒有權限</h1>
        <p className="mt-2 text-sm text-muted-foreground">新增使用者只限 CEO。</p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#f3edff] text-[#7a4dd6]">
          <Users className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">使用者</h1>
          <p className="text-[13px] text-muted-foreground">
            CEO 可新增使用者。本頁不是角色指派畫面，角色只在建立時寫入。
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-2 text-[15px] font-semibold">已建立帳戶</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]" data-testid="users-table">
              <thead>
                <tr className="border-b border-[#e6e8ee] text-xs text-muted-foreground">
                  <th className="px-2.5 py-2 font-semibold">顯示名稱</th>
                  <th className="px-2.5 py-2 font-semibold">帳戶</th>
                  <th className="px-2.5 py-2 font-semibold">角色</th>
                  <th className="px-2.5 py-2 font-semibold">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.account} className="border-b border-[#f1f2f5]">
                    <td className="px-2.5 py-2.5">{user.name}</td>
                    <td className="px-2.5 py-2.5">{user.account}</td>
                    <td className="px-2.5 py-2.5">
                      <span className="rounded-full bg-[#e7f6ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#178a4a]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5">{user.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">新增使用者</h2>
          {error ? (
            <p role="alert" data-testid="user-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p data-testid="user-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
              {ok}
            </p>
          ) : null}
          <form
            data-testid="user-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const message = createUser({
                name: String(data.get("name") ?? ""),
                account: String(data.get("account") ?? ""),
                password: String(data.get("password") ?? ""),
                role,
              });
              if (message) {
                setOk("");
                setError(message);
                return;
              }
              const name = String(data.get("name") ?? "").trim();
              setError("");
              setOk(`已新增使用者「${name}」。角色於建立時寫入；本版不提供事後指派畫面。`);
              event.currentTarget.reset();
              setRole("員工");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="uname">顯示名稱</Label>
              <Input id="uname" name="name" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uacc">帳戶</Label>
              <Input id="uacc" name="account" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upw">密碼</Label>
              <Input id="upw" name="password" type="password" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="urole">角色</Label>
              <Select
                items={ROLES.map((item) => ({ value: item, label: item }))}
                value={role}
                onValueChange={(value) => {
                  if (value === "員工" || value === "HR" || value === "會計" || value === "CEO") {
                    setRole(value);
                  }
                }}
              >
                <SelectTrigger id="urole" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">新增</Button>
          </form>
          <p className="mt-3 rounded-xl border border-dashed border-[#d8dbe3] bg-[#f8fafc] px-3 py-2.5 text-xs leading-relaxed text-[#667085]">
            角色區分 CEO、HR、會計、員工。角色只在建立時寫入。更改自己的密碼在「帳戶」。
          </p>
        </section>
      </div>
    </div>
  );
}
