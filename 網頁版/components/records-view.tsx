"use client";

import { useMemo, useState } from "react";
import { NotebookPen } from "lucide-react";
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
import { canQueryAccount } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

export function RecordsView() {
  const { session, users, assignments, positions, records, createRecord, editRecord } = useOffice();
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [queryAccount, setQueryAccount] = useState("");

  const ownRecords = useMemo(
    () => records.filter((item) => item.account === session?.account),
    [records, session?.account],
  );
  const queryable = useMemo(() => {
    if (!session) return [];
    return users.filter((user) =>
      canQueryAccount(assignments, positions, session.account, user.account),
    );
  }, [assignments, positions, session, users]);
  const queryItems = queryable.map((user) => ({
    value: user.account,
    label: `${user.name}（${user.account}）`,
  }));
  const queried = records.filter((item) => item.account === queryAccount);

  if (!session) return null;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e8f0fe] text-[#2f6fed]">
          <NotebookPen className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">工作紀錄</h1>
          <p className="text-[13px] text-muted-foreground">
            每個帳戶只能處理自己的工作紀錄。同一部門內，順序數字較大的職位可以查詢較低職位的紀錄，不能修改，也不能跨部門查詢。
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">{editingId ? "修改自己的工作紀錄" : "新增自己的工作紀錄"}</h2>
          {error ? (
            <p role="alert" data-testid="record-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p data-testid="record-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
              {ok}
            </p>
          ) : null}
          <form
            data-testid="record-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const message = editingId
                ? editRecord(editingId, { title, content })
                : createRecord({ title, content });
              if (message) {
                setOk("");
                setError(message);
                return;
              }
              setError("");
              setOk(editingId ? "已修改自己的工作紀錄。" : "已新增自己的工作紀錄。");
              setEditingId("");
              setTitle("");
              setContent("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="record-title">標題</Label>
              <Input
                id="record-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-content">內容</Label>
              <textarea
                id="record-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-24 w-full rounded-lg border border-input px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "儲存修改" : "新增"}</Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId("");
                    setTitle("");
                    setContent("");
                    setError("");
                  }}
                >
                  取消
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">我的工作紀錄</h2>
          <ul className="space-y-2" data-testid="record-list">
            {ownRecords.length === 0 ? (
              <li className="text-[13px] text-muted-foreground">尚未有自己的工作紀錄。</li>
            ) : (
              ownRecords.map((item) => (
                <li key={item.id} className="rounded-xl border border-[#f0f1f4] px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
                      <p className="mt-1 text-xs text-[#8b919d]">{item.updatedAt}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(item.id);
                        setTitle(item.title);
                        setContent(item.content);
                        setError("");
                        setOk("");
                      }}
                    >
                      修改
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-1 text-[15px] font-semibold">查詢較低職位的工作紀錄</h2>
        <p className="mb-3 text-xs leading-relaxed text-[#667085]">
          只在同一部門、而且自己的順序數字較大時可以查看。不能修改，也不能用來查看其他部門。工作紀錄不從月視圖進入。
        </p>
        {queryable.length === 0 ? (
          <p data-testid="query-empty" className="text-[13px] text-muted-foreground">
            目前沒有可查詢的較低職位帳戶。
          </p>
        ) : (
          <>
            <Label htmlFor="query-user">帳戶</Label>
            <Select
              items={queryItems}
              value={queryAccount}
              onValueChange={(value) => setQueryAccount(value ?? "")}
            >
              <SelectTrigger id="query-user" data-testid="query-user" className="mt-1.5 h-10 w-full max-w-md">
                <SelectValue placeholder="選擇可查詢的帳戶" />
              </SelectTrigger>
              <SelectContent>
                {queryItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ul className="mt-3 space-y-2" data-testid="query-list">
              {!queryAccount ? (
                <li className="text-[13px] text-muted-foreground">選擇帳戶後只可查看，不可修改。</li>
              ) : queried.length === 0 ? (
                <li className="text-[13px] text-muted-foreground">此帳戶尚未有工作紀錄。</li>
              ) : (
                queried.map((item) => (
                  <li key={item.id} className="rounded-xl border border-[#f0f1f4] px-3 py-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.content ? <p className="mt-1 text-[13px]">{item.content}</p> : null}
                    <p className="mt-1 text-xs text-[#8b919d]">{item.updatedAt} · 只可查詢</p>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
