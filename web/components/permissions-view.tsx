"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
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
import { canManageDepartments, ROLES, sharesDepartment, type Role } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

function Notice({ error, ok, errorId, okId }: { error: string; ok: string; errorId: string; okId: string }) {
  if (error) {
    return (
      <p role="alert" data-testid={errorId} className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p data-testid={okId} className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
        {ok}
      </p>
    );
  }
  return null;
}

export function PermissionsView() {
  const { session, users, assignments, permissions, assignAccountRole, saveAccountAccess } = useOffice();
  const [account, setAccount] = useState("");
  const [role, setRole] = useState<Role>("員工");
  const [note, setNote] = useState("");
  const [override, setOverride] = useState(false);
  const [visibleAccounts, setVisibleAccounts] = useState<string[]>([]);
  const [roleError, setRoleError] = useState("");
  const [roleOk, setRoleOk] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessOk, setAccessOk] = useState("");

  if (!session) return null;

  if (!canManageDepartments(session.role)) {
    return (
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-5">
        <h1 className="text-xl font-bold">沒有權限</h1>
        <p className="mt-2 text-sm text-muted-foreground">權限指派只限 CEO 與 HR。</p>
      </section>
    );
  }

  const userItems = users.map((user) => ({ value: user.account, label: `${user.name}（${user.account}）` }));
  const selected = users.find((user) => user.account === account);

  function loadAccount(nextAccount: string) {
    setAccount(nextAccount);
    const user = users.find((item) => item.account === nextAccount);
    const permission = permissions.find((item) => item.account === nextAccount);
    setRole(user?.role ?? "員工");
    setNote(permission?.note ?? "");
    setOverride(permission?.override === true);
    setVisibleAccounts(permission?.visibleAccounts ?? []);
    setRoleError("");
    setRoleOk("");
    setAccessError("");
    setAccessOk("");
  }

  function toggleVisible(target: string) {
    setVisibleAccounts((current) => (current.includes(target) ? current.filter((item) => item !== target) : [...current, target]));
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">權限指派</h1>
          <p className="text-[13px] text-muted-foreground">
            CEO 與 HR 可為帳戶調整角色，或記錄個別權限。設定存在這個瀏覽器，登出再登入後仍會看到。
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">調整帳戶</h2>
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="access-user">帳戶</Label>
            <Select items={userItems} value={account} onValueChange={(value) => loadAccount(value ?? "")}>
              <SelectTrigger id="access-user" data-testid="access-user" className="h-10 w-full">
                <SelectValue placeholder="選擇帳戶" />
              </SelectTrigger>
              <SelectContent>
                {userItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected ? (
            <>
              <form
                data-testid="role-form"
                className="space-y-3 border-t border-[#f0f1f4] pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const message = assignAccountRole(account, role);
                  if (message) {
                    setRoleOk("");
                    setRoleError(message);
                    return;
                  }
                  setRoleError("");
                  setRoleOk("已儲存角色。此帳戶登出再登入後，仍會看到這個角色。");
                }}
              >
                <h3 className="text-sm font-semibold">角色</h3>
                <Notice error={roleError} ok={roleOk} errorId="role-error" okId="role-ok" />
                <div className="space-y-1.5">
                  <Label htmlFor="access-role">角色</Label>
                  <Select
                    items={ROLES.map((item) => ({ value: item, label: item }))}
                    value={role}
                    onValueChange={(value) => {
                      if (value === "員工" || value === "HR" || value === "會計" || value === "CEO") setRole(value);
                    }}
                  >
                    <SelectTrigger id="access-role" data-testid="access-role" className="h-10 w-full">
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
                <Button type="submit">儲存角色</Button>
              </form>

              <form
                data-testid="access-form"
                className="mt-4 space-y-3 border-t border-[#f0f1f4] pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const sameDepartment = visibleAccounts.filter((item) => sharesDepartment(assignments, account, item));
                  const message = saveAccountAccess({ account, note, override, visibleAccounts: sameDepartment });
                  if (message) {
                    setAccessOk("");
                    setAccessError(message);
                    return;
                  }
                  setAccessError("");
                  setAccessOk("已儲存個別權限。登出再登入後，仍會看到這項設定。");
                }}
              >
                <h3 className="text-sm font-semibold">個別權限</h3>
                <Notice error={accessError} ok={accessOk} errorId="access-error" okId="access-ok" />
                <div className="space-y-1.5">
                  <Label htmlFor="access-note">備註</Label>
                  <Input id="access-note" value={note} onChange={(event) => setNote(event.target.value)} className="h-10" />
                </div>
                <label className="flex items-start gap-2 text-[13px] leading-relaxed text-[#3c4250]">
                  <input
                    type="checkbox"
                    data-testid="access-override"
                    className="mt-0.5"
                    checked={override}
                    onChange={(event) => setOverride(event.target.checked)}
                  />
                  <span>以個別權限覆蓋職位順序。開啟後，同一部門的可見範圍以下面勾選的帳戶為準，不以職位順序為唯一依據。不會因此看到其他部門。</span>
                </label>
                <fieldset className="space-y-2" data-testid="visible-accounts">
                  <legend className="text-[13px] font-semibold">可見帳戶</legend>
                  <p className="text-xs leading-relaxed text-[#667085]">
                    只列出與這個帳戶同一部門的人。覆蓋關閉時，勾選先記下來，查詢仍只看職位順序。覆蓋開啟後，只可查詢勾選且同部門的帳戶；沒勾選的同部門帳戶，即使職位較低也不可查詢。其他部門維持不可查。
                  </p>
                  {users.filter((user) => sharesDepartment(assignments, account, user.account)).length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">此帳戶還沒有同一部門的其他帳戶。覆蓋開啟後也不會跨部門查詢。</p>
                  ) : (
                    users
                      .filter((user) => sharesDepartment(assignments, account, user.account))
                      .map((user) => (
                        <label key={user.account} className="flex items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={visibleAccounts.includes(user.account)}
                            onChange={() => toggleVisible(user.account)}
                          />
                          {user.name}（{user.account}）
                        </label>
                      ))
                  )}
                </fieldset>
                <Button type="submit">儲存個別權限</Button>
              </form>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">選擇帳戶後可以調整角色或個別權限。</p>
          )}
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">已儲存的設定</h2>
          <ul className="space-y-2" data-testid="permission-settings">
            {users.map((user) => {
              const permission = permissions.find((item) => item.account === user.account);
              const names = (permission?.visibleAccounts ?? [])
                .filter((item) => sharesDepartment(assignments, user.account, item))
                .map((item) => users.find((candidate) => candidate.account === item)?.name ?? item)
                .join("、");
              return (
                <li key={user.account} data-testid={`access-${user.account}`} className="rounded-xl border border-[#f0f1f4] px-3 py-2 text-[13px]">
                  <p className="font-semibold">
                    {user.name}（{user.account}）
                    <span className="ml-2 rounded-full bg-[#e7f6ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#178a4a]">
                      {user.role}
                    </span>
                  </p>
                  {permission?.override ? (
                    <p className="mt-1 text-[#3c4250]" data-testid={`override-${user.account}`}>
                      覆蓋職位順序。同一部門可見：{names || "沒有帳戶"}
                    </p>
                  ) : (
                    <p className="mt-1 text-[#667085]">未覆蓋職位順序。查詢仍按同一部門的職位順序。</p>
                  )}
                  {permission?.note ? <p className="mt-1 text-[#667085]">備註：{permission.note}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
