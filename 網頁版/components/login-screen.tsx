"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOffice } from "@/components/office-provider";

export function LoginScreen() {
  const router = useRouter();
  const { ready, session, login } = useOffice();
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/overview");
  }, [ready, router, session]);

  if (!ready || session) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        正在確認登入狀態
      </main>
    );
  }

  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(900px_420px_at_15%_-10%,#e7f6ee_0%,transparent_60%),radial-gradient(700px_380px_at_100%_0%,#e8f0fe_0%,transparent_55%),#f4f5f7] px-6 py-10">
      <section className="w-full max-w-[440px] rounded-2xl border border-[#e6e8ee] bg-white px-7 py-7 shadow-[0_8px_24px_rgba(22,28,45,0.04)]">
        <div className="grid size-9 place-items-center rounded-[10px] bg-linear-to-br from-[#2fbe6a] to-[#178a4a] text-sm font-bold text-white">
          辦
        </div>
        <h1 className="mt-3.5 text-[22px] font-bold">小型辦公軟件</h1>
        <p className="mt-1 mb-4 text-[13px] leading-relaxed text-muted-foreground">
          網頁版。未通過驗證不得進入主框架。預設帳戶與密碼均為 CEO。
        </p>
        {error ? (
          <p
            role="alert"
            data-testid="login-error"
            className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]"
          >
            {error}
          </p>
        ) : null}
        <form
          data-testid="login-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const message = login(
              String(data.get("account") ?? ""),
              String(data.get("password") ?? ""),
            );
            if (message) {
              setError(message);
              return;
            }
            router.push("/overview");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="account">帳戶</Label>
            <Input
              id="account"
              name="account"
              autoComplete="username"
              defaultValue="CEO"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              defaultValue="CEO"
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10 w-full">
            登入
          </Button>
        </form>
        <p className="mt-3.5 text-xs leading-relaxed text-[#8b919d]">
          驗收對照：帳戶 CEO、密碼 CEO 可登入；錯誤密碼停留於此頁。更改密碼與登出方式未確認，本版不提供。
        </p>
      </section>
    </main>
  );
}
