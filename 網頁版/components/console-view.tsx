"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOffice } from "@/components/office-provider";

export function ConsoleView() {
  const { ready, session, openCompany, disableCompanyByName } = useOffice();
  const [createError, setCreateError] = useState("");
  const [createOk, setCreateOk] = useState("");
  const [createPath, setCreatePath] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disableOk, setDisableOk] = useState("");

  if (!ready) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        正在確認登入狀態
      </main>
    );
  }

  if (session) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f4f5f7] px-6">
        <section className="w-full max-w-[480px] rounded-2xl border border-[#e6e8ee] bg-white px-7 py-7">
          <h1 className="text-[22px] font-bold">開發者後台</h1>
          <p data-testid="console-blocked" className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            公司帳戶不得登入後台。請先在公司網站登出。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#f4f5f7] px-6 py-10">
      <div className="mx-auto max-w-[720px]">
        <h1 className="text-[22px] font-bold">開發者後台</h1>
        <p className="mt-1 mb-4 text-[13px] leading-relaxed text-muted-foreground">
          此後台連接各公司網站。公司網站沒有進入這裡的入口。建立公司時填寫公司名稱與網站。停用後該公司帳戶不得登入，資料仍保留。
        </p>
        <div className="grid gap-3">
          <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-semibold">建立公司</h2>
            {createError ? (
              <p role="alert" data-testid="company-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
                {createError}
              </p>
            ) : null}
            {createOk ? (
              <p data-testid="company-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
                {createOk}
                {createPath ? (
                  <>
                    {" "}
                    此伺服器上的公司網站是 <span data-testid="company-path">{createPath}</span>。
                  </>
                ) : null}
              </p>
            ) : null}
            <form
              data-testid="company-form"
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const result = openCompany({
                  name: String(data.get("name") ?? ""),
                  website: String(data.get("website") ?? ""),
                });
                if (result.error) {
                  setCreateOk("");
                  setCreatePath("");
                  setCreateError(result.error);
                  return;
                }
                setCreateError("");
                setCreatePath(result.path);
                setCreateOk(`已建立公司「${String(data.get("name") ?? "").trim()}」。網站為 ${String(data.get("website") ?? "").trim()}。`);
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="company-name">公司名稱</Label>
                <Input id="company-name" name="name" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-website">網站</Label>
                <Input id="company-website" name="website" className="h-10" />
              </div>
              <Button type="submit">建立公司</Button>
            </form>
          </section>
          <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-semibold">停用公司</h2>
            <p className="mb-3 text-xs leading-relaxed text-[#667085]">填寫公司名稱。停用後該公司的帳戶不得登入，已儲存的資料仍保留。</p>
            {disableError ? (
              <p role="alert" data-testid="disable-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
                {disableError}
              </p>
            ) : null}
            {disableOk ? (
              <p data-testid="disable-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
                {disableOk}
              </p>
            ) : null}
            <form
              data-testid="disable-form"
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("name") ?? "");
                const message = disableCompanyByName(name);
                if (message) {
                  setDisableOk("");
                  setDisableError(message);
                  return;
                }
                setDisableError("");
                setDisableOk(`已停用「${name.trim()}」。該公司帳戶不得登入，資料仍保留。`);
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="disable-name">公司名稱</Label>
                <Input id="disable-name" name="name" className="h-10" />
              </div>
              <Button type="submit">停用</Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
