"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
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
import { canManageDepartments } from "@/lib/office";
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

export function DepartmentsView() {
  const {
    session,
    users,
    departments,
    positions,
    assignments,
    permissions,
    createDepartment,
    createPosition,
    assignToDepartment,
    saveStaffPermission,
  } = useOffice();
  const [departmentId, setDepartmentId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [account, setAccount] = useState("");
  const [positionId, setPositionId] = useState("");
  const [permissionAccount, setPermissionAccount] = useState("");
  const [deptError, setDeptError] = useState("");
  const [deptOk, setDeptOk] = useState("");
  const [posError, setPosError] = useState("");
  const [posOk, setPosOk] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignOk, setAssignOk] = useState("");
  const [permError, setPermError] = useState("");
  const [permOk, setPermOk] = useState("");

  const departmentItems = useMemo(
    () => departments.map((item) => ({ value: item.id, label: item.name })),
    [departments],
  );
  const userItems = useMemo(
    () => users.map((user) => ({ value: user.account, label: `${user.name}（${user.account}）` })),
    [users],
  );
  const positionsInAssign = positions.filter((item) => item.departmentId === assignDepartmentId);
  const positionItems = positionsInAssign.map((item) => ({
    value: item.id,
    label: `${item.name} · 順序 ${item.rank}`,
  }));

  if (!session) return null;

  if (!canManageDepartments(session.role)) {
    return (
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-5">
        <h1 className="text-xl font-bold">沒有權限</h1>
        <p className="mt-2 text-sm text-muted-foreground">添加部門、職位與員工權限只限 CEO 與 HR。</p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <Building2 className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">部門</h1>
          <p className="text-[13px] text-muted-foreground">
            CEO 與 HR 可新增部門、在部門內新增職位，並為帳戶指定部門與職位。一人可屬多個部門，每個部門一個職位。
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">新增部門</h2>
          <Notice error={deptError} ok={deptOk} errorId="dept-error" okId="dept-ok" />
          <form
            data-testid="dept-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const message = createDepartment(String(data.get("name") ?? ""));
              if (message) {
                setDeptOk("");
                setDeptError(message);
                return;
              }
              setDeptError("");
              setDeptOk(`已新增部門「${String(data.get("name") ?? "").trim()}」。`);
              event.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">部門名稱</Label>
              <Input id="dept-name" name="name" className="h-10" />
            </div>
            <Button type="submit">新增部門</Button>
          </form>
          <ul className="mt-4 space-y-2" data-testid="dept-list">
            {departments.length === 0 ? (
              <li className="text-[13px] text-muted-foreground">尚未新增部門。</li>
            ) : (
              departments.map((department) => (
                <li key={department.id} className="rounded-xl border border-[#f0f1f4] px-3 py-2 text-sm">
                  <p className="font-semibold">{department.name}</p>
                  <ul className="mt-1 text-[13px] text-[#667085]">
                    {positions.filter((item) => item.departmentId === department.id).length === 0 ? (
                      <li>尚未新增職位。</li>
                    ) : (
                      positions
                        .filter((item) => item.departmentId === department.id)
                        .slice()
                        .sort((a, b) => b.rank - a.rank)
                        .map((item) => (
                          <li key={item.id}>
                            {item.name} · 順序 {item.rank}
                          </li>
                        ))
                    )}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">新增職位</h2>
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">在指定部門內填寫職位名稱與順序數字。數字較大者為較高職位。</p>
          <Notice error={posError} ok={posOk} errorId="position-error" okId="position-ok" />
          <form
            data-testid="position-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const message = createPosition({
                departmentId,
                name: String(data.get("name") ?? ""),
                rank: String(data.get("rank") ?? ""),
              });
              if (message) {
                setPosOk("");
                setPosError(message);
                return;
              }
              setPosError("");
              setPosOk(`已新增職位「${String(data.get("name") ?? "").trim()}」。`);
              event.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="pos-dept">部門</Label>
              <Select
                items={departmentItems}
                value={departmentId}
                onValueChange={(value) => setDepartmentId(value ?? "")}
              >
                <SelectTrigger id="pos-dept" className="h-10 w-full">
                  <SelectValue placeholder="選擇部門" />
                </SelectTrigger>
                <SelectContent>
                  {departmentItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-name">職位名稱</Label>
              <Input id="pos-name" name="name" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-rank">順序數字</Label>
              <Input id="pos-rank" name="rank" inputMode="numeric" className="h-10" />
            </div>
            <Button type="submit">新增職位</Button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">指派部門與職位</h2>
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">
            為帳戶指定所屬部門，並指定該部門的一個職位。再次指派同一部門會改為新的職位。可再指派到其他部門。
          </p>
          <Notice error={assignError} ok={assignOk} errorId="assign-error" okId="assign-ok" />
          <form
            data-testid="assign-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const message = assignToDepartment({
                account,
                departmentId: assignDepartmentId,
                positionId,
              });
              if (message) {
                setAssignOk("");
                setAssignError(message);
                return;
              }
              setAssignError("");
              setAssignOk("已寫入該帳戶在此部門的職位。");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="assign-user">帳戶</Label>
              <Select items={userItems} value={account} onValueChange={(value) => setAccount(value ?? "")}>
                <SelectTrigger id="assign-user" className="h-10 w-full">
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
            <div className="space-y-1.5">
              <Label htmlFor="assign-dept">部門</Label>
              <Select
                items={departmentItems}
                value={assignDepartmentId}
                onValueChange={(value) => {
                  setAssignDepartmentId(value ?? "");
                  setPositionId("");
                }}
              >
                <SelectTrigger id="assign-dept" className="h-10 w-full">
                  <SelectValue placeholder="選擇部門" />
                </SelectTrigger>
                <SelectContent>
                  {departmentItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-pos">職位</Label>
              <Select items={positionItems} value={positionId} onValueChange={(value) => setPositionId(value ?? "")}>
                <SelectTrigger id="assign-pos" className="h-10 w-full">
                  <SelectValue placeholder="選擇職位" />
                </SelectTrigger>
                <SelectContent>
                  {positionItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">指派</Button>
          </form>
          <ul className="mt-4 space-y-2" data-testid="assign-list">
            {assignments.length === 0 ? (
              <li className="text-[13px] text-muted-foreground">尚未指派。</li>
            ) : (
              assignments.map((item) => {
                const user = users.find((entry) => entry.account === item.account);
                const department = departments.find((entry) => entry.id === item.departmentId);
                const position = positions.find((entry) => entry.id === item.positionId);
                return (
                  <li key={`${item.account}-${item.departmentId}`} className="text-[13px]">
                    {user?.name ?? item.account} · {department?.name ?? "部門"} · {position?.name ?? "職位"} · 順序 {position?.rank ?? "—"}
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">個別權限</h2>
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">
            可以為帳戶記錄個別權限。本版不讓這項設定覆蓋職位順序。查詢工作紀錄仍只看同一部門內誰的順序數字較大。
          </p>
          <Notice error={permError} ok={permOk} errorId="perm-error" okId="perm-ok" />
          <form
            data-testid="perm-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const message = saveStaffPermission(permissionAccount, String(data.get("note") ?? ""));
              if (message) {
                setPermOk("");
                setPermError(message);
                return;
              }
              setPermError("");
              setPermOk("已記錄個別權限。此設定不覆蓋職位順序。");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="perm-user">帳戶</Label>
              <Select
                items={userItems}
                value={permissionAccount}
                onValueChange={(value) => setPermissionAccount(value ?? "")}
              >
                <SelectTrigger id="perm-user" className="h-10 w-full">
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
            <div className="space-y-1.5">
              <Label htmlFor="perm-note">個別權限</Label>
              <Input id="perm-note" name="note" className="h-10" />
            </div>
            <Button type="submit">記錄</Button>
          </form>
          <ul className="mt-4 space-y-2" data-testid="perm-list">
            {permissions.length === 0 ? (
              <li className="text-[13px] text-muted-foreground">尚未記錄個別權限。</li>
            ) : (
              permissions.map((item) => (
                <li key={item.account} className="text-[13px]">
                  {users.find((user) => user.account === item.account)?.name ?? item.account}：{item.note}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
