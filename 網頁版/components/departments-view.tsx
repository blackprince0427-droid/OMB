"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FrameLink } from "@/components/frame-nav";
import { canManageDepartments } from "@/lib/office";
import { cn } from "@/lib/utils";
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
    companyBase,
    createDepartment,
    createPosition,
    assignToDepartment,
    changeMemberPosition,
  } = useOffice();
  const [departmentId, setDepartmentId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [account, setAccount] = useState("");
  const [positionId, setPositionId] = useState("");
  const [deptError, setDeptError] = useState("");
  const [deptOk, setDeptOk] = useState("");
  const [posError, setPosError] = useState("");
  const [posOk, setPosOk] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignOk, setAssignOk] = useState("");
  const [moveAccount, setMoveAccount] = useState("");
  const [moveDepartmentId, setMoveDepartmentId] = useState("");
  const [movePositionId, setMovePositionId] = useState("");
  const [moveError, setMoveError] = useState("");
  const [moveOk, setMoveOk] = useState("");

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
  const memberDepartments = departments.filter((department) =>
    assignments.some((item) => item.account === moveAccount && item.departmentId === department.id),
  );
  const memberDepartmentItems = memberDepartments.map((item) => ({ value: item.id, label: item.name }));
  const movePositions = positions.filter((item) => item.departmentId === moveDepartmentId);
  const movePositionItems = movePositions.map((item) => ({
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
            CEO 與 HR 可新增部門、在部門內新增職位，並為帳戶指定部門與職位。一人可屬多個部門，每個部門一個職位。更改職位須指定該帳戶已屬的部門，查詢範圍在儲存後立即按新職位計算。
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
          <h2 className="mb-3 text-[15px] font-semibold">更改職位</h2>
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">
            指定此帳戶已經所屬的部門，並改為該部門的另一個職位。儲存後，查詢範圍按新職位立即計算。要把帳戶加進新部門，請用「指派部門與職位」。
          </p>
          <Notice error={moveError} ok={moveOk} errorId="move-error" okId="move-ok" />
          <form
            data-testid="move-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const message = changeMemberPosition({
                account: moveAccount,
                departmentId: moveDepartmentId,
                positionId: movePositionId,
              });
              if (message) {
                setMoveOk("");
                setMoveError(message);
                return;
              }
              setMoveError("");
              setMoveOk("已更改該部門的職位。查詢範圍已按新職位計算。");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="move-user">帳戶</Label>
              <Select
                items={userItems}
                value={moveAccount}
                onValueChange={(value) => {
                  setMoveAccount(value ?? "");
                  setMoveDepartmentId("");
                  setMovePositionId("");
                }}
              >
                <SelectTrigger id="move-user" data-testid="move-user" className="h-10 w-full">
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
            {moveAccount && memberDepartmentItems.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">此帳戶尚未指派部門。請先用指派加入部門。</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="move-dept">已屬部門</Label>
                  <Select
                    items={memberDepartmentItems}
                    value={moveDepartmentId}
                    onValueChange={(value) => {
                      setMoveDepartmentId(value ?? "");
                      setMovePositionId("");
                    }}
                  >
                    <SelectTrigger id="move-dept" data-testid="move-dept" className="h-10 w-full">
                      <SelectValue placeholder="選擇已屬部門" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberDepartmentItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="move-pos">職位</Label>
                  <Select
                    items={movePositionItems}
                    value={movePositionId}
                    onValueChange={(value) => setMovePositionId(value ?? "")}
                  >
                    <SelectTrigger id="move-pos" data-testid="move-pos" className="h-10 w-full">
                      <SelectValue placeholder="選擇職位" />
                    </SelectTrigger>
                    <SelectContent>
                      {movePositionItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button type="submit">更改職位</Button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">個別權限</h2>
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">
            角色與個別權限改在「權限指派」儲存。覆蓋開啟後，查詢範圍以個別權限為準，不再只看職位順序。
          </p>
          <FrameLink
            href={`${companyBase}/permissions`}
            data-testid="open-permissions"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            前往權限指派
          </FrameLink>
        </section>
      </div>
    </div>
  );
}
