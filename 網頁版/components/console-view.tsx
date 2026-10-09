"use client";

import { useState } from "react";
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
import { DEVELOPER_ACCOUNT } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

export function ConsoleView() {
  const {
    ready,
    developer,
    developerLogin,
    developerLogout,
    openCompany,
    disableCompanyByName,
    listCompanies,
    companyLogs,
  } = useOffice();
  const [loginError, setLoginError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createOk, setCreateOk] = useState("");
  const [createPath, setCreatePath] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disableOk, setDisableOk] = useState("");
  const [logCompanyId, setLogCompanyId] = useState("");
  const [logTick, setLogTick] = useState(0);

  if (!ready) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        正在確認登入狀態
      </main>
    );
  }

  if (!developer) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f4f5f7] px-6">
        <section className="w-full max-w-[440px] rounded-2xl border border-[#e6e8ee] bg-white px-7 py-7">
          <h1 className="text-[22px] font-bold">開發者後台</h1>
          <p className="mt-1 mb-4 text-[13px] leading-relaxed text-muted-foreground">
            請使用開發人員帳戶登入。公司帳戶不能登入後台。預設帳戶與密碼均為 {DEVELOPER_ACCOUNT}。
          </p>
          {loginError ? (
            <p role="alert" data-testid="developer-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
              {loginError}
            </p>
          ) : null}
          <form
            data-testid="developer-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const message = developerLogin(String(data.get("account") ?? ""), String(data.get("password") ?? ""));
              if (message) {
                setLoginError(message);
                return;
              }
              setLoginError("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="dev-account">帳戶</Label>
              <Input id="dev-account" name="account" autoComplete="username" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-password">密碼</Label>
              <Input id="dev-password" name="password" type="password" autoComplete="current-password" className="h-10" />
            </div>
            <Button type="submit" className="h-10 w-full">
              登入後台
            </Button>
          </form>
        </section>
      </main>
    );
  }

  const companies = listCompanies();
  const logItems = companies.map((item) => ({
    value: item.id,
    label: item.disabled ? `${item.name}（已停用）` : item.name,
  }));
  const logs = logCompanyId ? companyLogs(logCompanyId) : [];
  void logTick;

  return (
    <main className="min-h-svh bg-[#f4f5f7] px-6 py-10">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">開發者後台</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              建立公司時會同時建立只屬於該公司的初始 CEO。停用後立即生效，已登入的下次操作不能繼續，資料仍保留。
            </p>
          </div>
          <Button type="button" variant="outline" data-testid="developer-logout" onClick={() => developerLogout()}>
            登出後台
          </Button>
        </div>
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
                    在此伺服器開啟 <span data-testid="company-path">{createPath}</span>。
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
                  ceoName: String(data.get("ceoName") ?? ""),
                  account: String(data.get("account") ?? ""),
                  password: String(data.get("password") ?? ""),
                });
                if (result.error) {
                  setCreateOk("");
                  setCreatePath("");
                  setCreateError(result.error);
                  return;
                }
                setCreateError("");
                setCreatePath(result.path);
                setCreateOk(
                  `已建立公司「${String(data.get("name") ?? "").trim()}」，初始 CEO 帳戶為 ${String(data.get("account") ?? "").trim()}。`,
                );
                setLogTick((value) => value + 1);
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="company-name">公司名稱</Label>
                <Input id="company-name" name="name" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-website">網站</Label>
                <Input id="company-website" name="website" placeholder="/acme" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ceo-name">初始 CEO 顯示名稱</Label>
                <Input id="ceo-name" name="ceoName" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ceo-account">初始 CEO 帳戶</Label>
                <Input id="ceo-account" name="account" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ceo-password">初始密碼</Label>
                <Input id="ceo-password" name="password" type="password" className="h-10" />
              </div>
              <Button type="submit">建立公司</Button>
            </form>
          </section>
          <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-semibold">停用公司</h2>
            <p className="mb-3 text-xs leading-relaxed text-[#667085]">填寫公司名稱。停用後該公司已登入的下次操作不能繼續，資料仍保留。</p>
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
                setDisableOk(`已停用「${name.trim()}」。`);
                setLogTick((value) => value + 1);
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
          <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-semibold">公司日誌</h2>
            <p className="mb-3 text-xs leading-relaxed text-[#667085]">只可查看所選公司的日誌，不能修改或刪除。公司網站不顯示日誌。</p>
            <Label htmlFor="log-company">公司</Label>
            <Select items={logItems} value={logCompanyId} onValueChange={(value) => setLogCompanyId(value ?? "")}>
              <SelectTrigger id="log-company" data-testid="log-company" className="mt-1.5 h-10 w-full">
                <SelectValue placeholder="選擇公司" />
              </SelectTrigger>
              <SelectContent>
                {logItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ul className="mt-3 space-y-2" data-testid="log-list">
              {!logCompanyId ? (
                <li className="text-[13px] text-muted-foreground">選擇公司後只可查看。</li>
              ) : logs.length === 0 ? (
                <li className="text-[13px] text-muted-foreground">此公司尚未有日誌。</li>
              ) : (
                logs.map((item) => (
                  <li key={`${item.at}-${item.action}-${item.actor}`} className="text-[13px]">
                    {item.at} · {item.actor} · {item.action}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
