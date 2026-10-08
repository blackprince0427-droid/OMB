"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOffice } from "@/components/office-provider";

export function AccountView() {
  const { session, changeOwnPassword, logout } = useOffice();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!session) return null;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <KeyRound className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">帳戶</h1>
          <p className="text-[13px] text-muted-foreground">
            {session.name}（{session.account}）可更改自己的密碼，也可登出並返回登入頁。
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold">更改密碼</h2>
        {error ? (
          <p
            role="alert"
            data-testid="password-error"
            className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]"
          >
            {error}
          </p>
        ) : null}
        {ok ? (
          <p data-testid="password-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
            {ok}
          </p>
        ) : null}
        <form
          data-testid="password-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const message = changeOwnPassword(
              String(data.get("oldPassword") ?? ""),
              String(data.get("newPassword") ?? ""),
            );
            if (message) {
              setOk("");
              setError(message);
              return;
            }
            setError("");
            setOk("已更改密碼。目前仍保持登入。");
            event.currentTarget.reset();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="old-password">舊密碼</Label>
            <Input id="old-password" name="oldPassword" type="password" autoComplete="current-password" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">新密碼</Label>
            <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" className="h-10" />
          </div>
          <Button type="submit">更改密碼</Button>
        </form>
        <div className="mt-4 border-t border-[#f0f1f4] pt-4">
          <p className="mb-3 text-xs leading-relaxed text-[#667085]">登出後返回登入頁。更改密碼不會登出。</p>
          <Button type="button" variant="outline" data-testid="logout-button" onClick={() => logout()}>
            登出
          </Button>
        </div>
      </section>
    </div>
  );
}
