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
import { canQueryAccount, dateStamp, HANDOFF_COPY, pageOf, recordsForAccount, type ProjectTag, type WorkRecord } from "@/lib/office";
import { useOffice } from "@/components/office-provider";

function tagName(tags: ProjectTag[], tagId: string): string {
  if (!tagId) return "";
  return tags.find((tag) => tag.id === tagId)?.name ?? "";
}

function Pager({
  page,
  pageCount,
  total,
  onPage,
  testId,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
      <span>
        共 {total} 筆 · 第 {page} / {pageCount} 頁
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          上一頁
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          下一頁
        </Button>
      </div>
    </div>
  );
}

function RecordRows({ items, tags, readOnly = false }: { items: WorkRecord[]; tags: ProjectTag[]; readOnly?: boolean }) {
  return (
    <>
      {items.map((item) => {
        const label = tagName(tags, item.tagId);
        return (
          <li key={item.id} className="rounded-xl border border-[#f0f1f4] px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
                <p className="mt-1 text-xs text-[#8b919d]">
                  {item.workDate}
                  <span
                    data-testid="record-status"
                    className={
                      item.done
                        ? "ml-2 rounded-full bg-[#e7f6ee] px-1.5 py-0.5 font-semibold text-[#178a4a]"
                        : "ml-2 rounded-full bg-[#fff1e4] px-1.5 py-0.5 font-semibold text-[#b86112]"
                    }
                  >
                    {item.done ? "已完成" : "未完成"}
                  </span>
                  {label ? (
                    <span data-testid="record-tag" className="ml-2 rounded-full bg-[#e8f0fe] px-1.5 py-0.5 font-semibold text-[#2f6fed]">
                      {label}
                    </span>
                  ) : null}
                  {readOnly ? <span className="ml-2">只可查詢</span> : null}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </>
  );
}

export function RecordsView() {
  const { session, users, assignments, positions, permissions, records, tags, createRecord, editRecord, reassignRecord, createTag } = useOffice();
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [workDate, setWorkDate] = useState(() => dateStamp(new Date()));
  const [assignee, setAssignee] = useState(session?.account ?? "");
  const [tagId, setTagId] = useState("");
  const [handoffAccount, setHandoffAccount] = useState(session?.account ?? "");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const [handoffOk, setHandoffOk] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState("");
  const [tagOk, setTagOk] = useState("");
  const [queryAccount, setQueryAccount] = useState("");
  const [ownDate, setOwnDate] = useState("");
  const [queryDate, setQueryDate] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [ownPage, setOwnPage] = useState(1);
  const [queryPage, setQueryPage] = useState(1);

  const ownRecords = useMemo(() => {
    if (!session) return [];
    return recordsForAccount(records, session.account, ownDate).filter((item) => !tagFilter || item.tagId === tagFilter);
  }, [ownDate, records, session, tagFilter]);
  const ownSlice = pageOf(ownRecords, ownPage);
  const queryable = useMemo(() => {
    if (!session) return [];
    return users.filter((user) => canQueryAccount(assignments, positions, session.account, user.account, permissions));
  }, [assignments, permissions, positions, session, users]);
  const accountItems = users.map((user) => ({ value: user.account, label: `${user.name}（${user.account}）` }));
  const tagItems = tags.map((tag) => ({ value: tag.id, label: tag.name }));
  const queryItems = queryable.map((user) => ({
    value: user.account,
    label: `${user.name}（${user.account}）`,
  }));
  const queried = queryAccount ? recordsForAccount(records, queryAccount, queryDate) : [];
  const querySlice = pageOf(queried, queryPage);
  const editing = records.find((item) => item.id === editingId);

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
            可以指定歸屬帳戶，並掛上本機的專案標籤。歸屬自己的紀錄才可以修改。未開啟個別權限覆蓋時，同一部門內只可查詢較低職位；職位順序相同時不可互相查詢，也不能跨部門查詢。每次顯示 10 筆。
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">{editingId ? "修改歸屬自己的工作紀錄" : "新增工作紀錄"}</h2>
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
                ? editRecord(editingId, { title, content, tagId })
                : createRecord({ title, content, workDate, assignee, tagId });
              if (message) {
                setOk("");
                setError(message);
                return;
              }
              setError("");
              setOk(editingId ? "已修改歸屬自己的工作紀錄。" : assignee === session.account ? "已新增工作紀錄。" : "已新增工作紀錄並指定歸屬。同一瀏覽器輪流登入後，新歸屬者可以修改。沒有即時通知。");
              setEditingId("");
              setTitle("");
              setContent("");
              setTagId("");
              setAssignee(session.account);
              if (!editingId) setOwnPage(1);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="record-title">標題</Label>
              <Input id="record-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-10" />
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
            {editing ? (
              <p className="text-xs text-[#667085]">日期 {editing.workDate}。修改標題、內容或標籤不會改這一天，也不會改歸屬。</p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="record-date">日期</Label>
                <Input
                  id="record-date"
                  type="date"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                  className="h-10"
                />
              </div>
            )}
            {editing ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="record-assignee">歸屬帳戶</Label>
                <Select items={accountItems} value={assignee} onValueChange={(value) => setAssignee(value ?? session.account)}>
                  <SelectTrigger id="record-assignee" data-testid="record-assignee" className="h-10 w-full">
                    <SelectValue placeholder="選擇歸屬帳戶" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="record-tag">專案標籤</Label>
              <Select
                items={[{ value: "none", label: "不掛標籤" }, ...tagItems]}
                value={tagId || "none"}
                onValueChange={(value) => setTagId(!value || value === "none" ? "" : value)}
              >
                <SelectTrigger id="record-tag" data-testid="record-tag-select" className="h-10 w-full">
                  <SelectValue placeholder="不掛標籤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不掛標籤</SelectItem>
                  {tagItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    setTagId("");
                    setError("");
                    setHandoffError("");
                    setHandoffOk("");
                  }}
                >
                  取消
                </Button>
              ) : null}
            </div>
          </form>
          {editing ? (
            <form
              data-testid="handoff-form"
              className="mt-4 space-y-3 border-t border-[#f0f1f4] pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                const message = reassignRecord(editing.id, handoffAccount);
                if (message) {
                  setHandoffOk("");
                  setHandoffError(message);
                  return;
                }
                setHandoffError("");
                setHandoffOk("已改歸屬。新歸屬者可以修改，你不能再改這筆。沒有即時通知。");
                if (handoffAccount !== session.account) {
                  setEditingId("");
                  setTitle("");
                  setContent("");
                  setTagId("");
                }
              }}
            >
              <h3 className="text-sm font-semibold">分交</h3>
              <p className="text-xs leading-relaxed text-[#667085]">{HANDOFF_COPY}</p>
              {handoffError ? (
                <p role="alert" data-testid="handoff-error" className="rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
                  {handoffError}
                </p>
              ) : null}
              {handoffOk ? (
                <p data-testid="handoff-ok" className="rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
                  {handoffOk}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="handoff-user">新歸屬帳戶</Label>
                <Select items={accountItems} value={handoffAccount} onValueChange={(value) => setHandoffAccount(value ?? session.account)}>
                  <SelectTrigger id="handoff-user" data-testid="handoff-user" className="h-10 w-full">
                    <SelectValue placeholder="選擇帳戶" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">分交</Button>
            </form>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-3 text-[15px] font-semibold">歸屬我的工作紀錄</h2>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="record-search">按日期搜尋</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="record-search"
                  data-testid="record-search"
                  type="date"
                  value={ownDate}
                  onChange={(event) => {
                    setOwnDate(event.target.value);
                    setOwnPage(1);
                  }}
                  className="h-10 max-w-[220px]"
                />
                {ownDate ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOwnDate("");
                      setOwnPage(1);
                    }}
                  >
                    顯示全部
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-tag-filter">按標籤辨識</Label>
              <Select
                items={[{ value: "all", label: "全部標籤" }, ...tagItems]}
                value={tagFilter || "all"}
                onValueChange={(value) => {
                  setTagFilter(!value || value === "all" ? "" : value);
                  setOwnPage(1);
                }}
              >
                <SelectTrigger id="record-tag-filter" data-testid="record-tag-filter" className="h-10 w-full">
                  <SelectValue placeholder="全部標籤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部標籤</SelectItem>
                  {tagItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ul className="space-y-2" data-testid="record-list">
            {ownRecords.length === 0 ? (
              <li className="text-[13px] text-muted-foreground">
                {ownDate || tagFilter ? "沒有符合條件的工作紀錄。" : "尚未有歸屬自己的工作紀錄。"}
              </li>
            ) : (
              ownSlice.items.map((item) => {
                const label = tagName(tags, item.tagId);
                const creator = users.find((user) => user.account === item.account);
                return (
                  <li key={item.id} className="rounded-xl border border-[#f0f1f4] px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        {item.content ? <p className="mt-1 text-[13px] text-[#3c4250]">{item.content}</p> : null}
                        <p className="mt-1 text-xs text-[#8b919d]">
                          {item.workDate}
                          <span
                            data-testid="record-status"
                            className={
                              item.done
                                ? "ml-2 rounded-full bg-[#e7f6ee] px-1.5 py-0.5 font-semibold text-[#178a4a]"
                                : "ml-2 rounded-full bg-[#fff1e4] px-1.5 py-0.5 font-semibold text-[#b86112]"
                            }
                          >
                            {item.done ? "已完成" : "未完成"}
                          </span>
                          {label ? (
                            <span data-testid="record-tag" className="ml-2 rounded-full bg-[#e8f0fe] px-1.5 py-0.5 font-semibold text-[#2f6fed]">
                              {label}
                            </span>
                          ) : null}
                          {item.account !== session.account ? (
                            <span className="ml-2">由 {creator?.name ?? item.account} 建立</span>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(item.id);
                          setTitle(item.title);
                          setContent(item.content);
                          setTagId(item.tagId);
                          setHandoffAccount(item.assignee || session.account);
                          setError("");
                          setOk("");
                          setHandoffError("");
                          setHandoffOk("");
                        }}
                      >
                        修改
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          {ownRecords.length > 0 ? (
            <Pager page={ownSlice.page} pageCount={ownSlice.pageCount} total={ownRecords.length} onPage={setOwnPage} testId="record-page" />
          ) : null}
        </section>
      </div>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold">專案標籤</h2>
        <p className="mb-3 text-xs leading-relaxed text-[#667085]">標籤存在這個瀏覽器的本機字典。建立後可選用，並寫進工作紀錄；列表上會顯示標籤名稱。</p>
        {tagError ? (
          <p role="alert" data-testid="tag-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
            {tagError}
          </p>
        ) : null}
        {tagOk ? (
          <p data-testid="tag-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
            {tagOk}
          </p>
        ) : null}
        <form
          data-testid="tag-form"
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const message = createTag(tagDraft);
            if (message) {
              setTagOk("");
              setTagError(message);
              return;
            }
            setTagError("");
            setTagOk(`已建立標籤「${tagDraft.trim()}」。`);
            setTagDraft("");
          }}
        >
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="tag-name">標籤名稱</Label>
            <Input id="tag-name" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} className="h-10" />
          </div>
          <Button type="submit">建立標籤</Button>
        </form>
        <ul className="mt-3 space-y-1" data-testid="tag-list">
          {tags.length === 0 ? (
            <li className="text-[13px] text-muted-foreground">尚未建立專案標籤。</li>
          ) : (
            tags.map((tag) => (
              <li key={tag.id} className="text-[13px]">
                {tag.name}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-1 text-[15px] font-semibold">查詢可見的工作紀錄</h2>
        <p className="mb-3 text-xs leading-relaxed text-[#667085]">
          未開啟個別權限覆蓋時，只在同一部門、而且自己的順序數字較大時可以查看。順序相同不可互相查詢，也不能跨部門查看。覆蓋開啟後，同一部門的可見範圍以個別權限勾選的帳戶為準，不以職位順序為唯一依據，仍然不可跨部門。查詢不能修改。每次顯示 10 筆，可按日期只看當天。工作紀錄不從月視圖進入。
        </p>
        {queryable.length === 0 ? (
          <p data-testid="query-empty" className="text-[13px] text-muted-foreground">
            目前沒有可查詢的帳戶。
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="query-user">帳戶</Label>
                <Select
                  items={queryItems}
                  value={queryAccount}
                  onValueChange={(value) => {
                    setQueryAccount(value ?? "");
                    setQueryPage(1);
                  }}
                >
                  <SelectTrigger id="query-user" data-testid="query-user" className="mt-1.5 h-10 w-full">
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
              </div>
              <div>
                <Label htmlFor="query-search">按日期搜尋</Label>
                <Input
                  id="query-search"
                  data-testid="query-search"
                  type="date"
                  value={queryDate}
                  onChange={(event) => {
                    setQueryDate(event.target.value);
                    setQueryPage(1);
                  }}
                  className="mt-1.5 h-10"
                />
              </div>
            </div>
            <ul className="mt-3 space-y-2" data-testid="query-list">
              {!queryAccount ? (
                <li className="text-[13px] text-muted-foreground">選擇帳戶後只可查看，不可修改。</li>
              ) : queried.length === 0 ? (
                <li className="text-[13px] text-muted-foreground">
                  {queryDate ? "這一天沒有工作紀錄。" : "此帳戶尚未有工作紀錄。"}
                </li>
              ) : (
                <RecordRows items={querySlice.items} tags={tags} readOnly />
              )}
            </ul>
            {queryAccount && queried.length > 0 ? (
              <Pager
                page={querySlice.page}
                pageCount={querySlice.pageCount}
                total={queried.length}
                onPage={setQueryPage}
                testId="query-page"
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
