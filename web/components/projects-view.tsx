"use client";

import { useEffect, useState } from "react";
import { FolderTree } from "lucide-react";
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
import { CROSS_PERSON_COPY } from "@/lib/office";
import {
  LEVEL_LABEL,
  TASK_STATUSES,
  canEditNode,
  canViewNode,
  childNodes,
  type TaskLevel,
  type TaskNode,
  type VisibilityMode,
} from "@/lib/tasks";
import { useOffice } from "@/components/office-provider";

function Notice({ error, ok }: { error: string; ok: string }) {
  if (error) {
    return (
      <p role="alert" data-testid="task-error" className="mb-3 rounded-[10px] border border-[#f3c7c7] bg-[#fdecec] px-3 py-2 text-[13px] text-[#9f1d1d]">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p data-testid="task-ok" className="mb-3 rounded-xl border border-[#b7e4c8] bg-[#e7f6ee] px-3 py-2 text-[13px] text-[#17693a]">
        {ok}
      </p>
    );
  }
  return null;
}

function summary(node: TaskNode, names: Map<string, string>): string {
  if (node.assignees.length === 0) return "尚未指定負責人";
  return node.assignees.map((account) => names.get(account) ?? account).join("、");
}

export function ProjectsView() {
  const office = useOffice();
  const { session, users, tasks, invites, companyBase } = office;
  const [nodeId, setNodeId] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const read = () => setNodeId(new URLSearchParams(window.location.search).get("node") ?? "");
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("omb-nav", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("omb-nav", read);
    };
  }, []);

  if (!session) return null;
  const names = new Map(users.map((user) => [user.account, user.name]));
  const visible = tasks.filter((node) => canViewNode(tasks, node, session.account));
  const projects = visible.filter((node) => node.level === 0);
  const selected = nodeId ? tasks.find((node) => node.id === nodeId) : undefined;
  const selectedVisible = selected && canViewNode(tasks, selected, session.account) ? selected : undefined;

  function report(message: string | null, success: string) {
    if (message) {
      setOk("");
      setError(message);
      return;
    }
    setError("");
    setOk(success);
  }

  function openNode(id: string) {
    const href = id ? `${companyBase}/projects?node=${id}` : `${companyBase}/projects`;
    window.history.pushState(null, "", href);
    setNodeId(id);
    setError("");
    setOk("");
  }

  if (nodeId && !selectedVisible) {
    return (
      <section className="mx-auto max-w-[760px] rounded-2xl border border-[#e6e8ee] bg-white p-5">
        <h1 className="text-xl font-bold">無權限</h1>
        <p data-testid="task-denied" className="mt-2 text-sm text-muted-foreground">
          無權限。你看不到這個節點。相關工作紀錄仍會保留。
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => openNode("")}>
          返回專案
        </Button>
      </section>
    );
  }

  if (selectedVisible) {
    return (
      <NodePage
        key={selectedVisible.id}
        node={selectedVisible}
        names={names}
        childName={childName}
        setChildName={setChildName}
        noteTitle={noteTitle}
        setNoteTitle={setNoteTitle}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        target={target}
        setTarget={setTarget}
        error={error}
        ok={ok}
        report={report}
        back={() => {
          window.history.pushState(null, "", `${companyBase}/projects`);
          setNodeId("");
        }}
        openNode={openNode}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#e7f6ee] text-[#178a4a]">
          <FolderTree className="size-4" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold">專案</h1>
          <p className="text-[13px] text-muted-foreground">
            任務樹只到專案、主任務、子任務、工作項。{CROSS_PERSON_COPY}
          </p>
        </div>
      </div>
      <section className="mb-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold">新專案</h2>
        <Notice error={error} ok={ok} />
        <form
          data-testid="project-form"
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const message = office.createProject(name);
            report(message, "已建立專案。建立者是第一位負責人，也可以之後再邀請別人。");
            if (!message) setName("");
          }}
        >
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="project-name">專案名稱</Label>
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} className="h-10" />
          </div>
          <Button type="submit">建立專案</Button>
        </form>
      </section>
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4" data-testid="project-tree">
        {projects.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">目前沒有你可見的專案。</p>
        ) : (
          projects.map((project) => (
            <article key={project.id} className="border-b border-[#f0f1f4] py-3 last:border-b-0">
              <NodeLine node={project} names={names} onOpen={openNode} />
              {childNodes(visible, project.id).map((task) => (
                <div key={task.id} className="mt-2 ml-4 border-l border-[#e6e8ee] pl-3">
                  <NodeLine node={task} names={names} onOpen={openNode} />
                  {open[task.id] ? (
                    childNodes(visible, task.id).map((sub) => (
                      <div key={sub.id} className="mt-2 ml-4">
                        <NodeLine node={sub} names={names} onOpen={openNode} />
                        {open[sub.id]
                          ? childNodes(visible, sub.id).map((item) => (
                              <div key={item.id} className="mt-2 ml-4">
                                <NodeLine node={item} names={names} onOpen={openNode} />
                              </div>
                            ))
                          : null}
                        {childNodes(visible, sub.id).length > 0 ? (
                          <button type="button" className="mt-1 text-xs text-[#2f6fed]" onClick={() => setOpen((current) => ({ ...current, [sub.id]: !current[sub.id] }))}>
                            {open[sub.id] ? "收起工作項" : "展開工作項"}
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : null}
                  {childNodes(visible, task.id).length > 0 ? (
                    <button type="button" className="mt-1 text-xs text-[#2f6fed]" onClick={() => setOpen((current) => ({ ...current, [task.id]: !current[task.id] }))}>
                      {open[task.id] ? "收起子任務" : "展開子任務"}
                    </button>
                  ) : null}
                </div>
              ))}
            </article>
          ))
        )}
      </section>
      {invites.some((item) => item.from === session.account && item.status === "rejected") ? (
        <p className="mt-3 text-[13px] text-[#9f1d1d]">有邀請被拒絕。可在節點頁再邀請同一人或換人。</p>
      ) : null}
    </div>
  );
}

function NodeLine({ node, names, onOpen }: { node: TaskNode; names: Map<string, string>; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-semibold">
          {node.name}
          <span className="ml-2 text-xs font-normal text-[#8b919d]">{LEVEL_LABEL[node.level]}</span>
        </p>
        <p className="text-xs text-[#667085]">
          {node.status} · {summary(node, names)}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" data-testid={`open-node-${node.id}`} onClick={() => onOpen(node.id)}>
        打開
      </Button>
    </div>
  );
}

function NodePage({
  node,
  names,
  childName,
  setChildName,
  noteTitle,
  setNoteTitle,
  linkUrl,
  setLinkUrl,
  target,
  setTarget,
  error,
  ok,
  report,
  back,
  openNode,
}: {
  node: TaskNode;
  names: Map<string, string>;
  childName: string;
  setChildName: (value: string) => void;
  noteTitle: string;
  setNoteTitle: (value: string) => void;
  linkUrl: string;
  setLinkUrl: (value: string) => void;
  target: string;
  setTarget: (value: string) => void;
  error: string;
  ok: string;
  report: (message: string | null, success: string) => void;
  back: () => void;
  openNode: (id: string) => void;
}) {
  const office = useOffice();
  const { session, users, tasks, invites } = office;
  const [visiblePick, setVisiblePick] = useState<string[]>(() => {
    const current = tasks.find((item) => item.id === node.projectId && item.level === 0);
    return current?.visibleAccounts ?? [];
  });
  if (!session) return null;
  const editable = canEditNode(node, session.account);
  const project = tasks.find((item) => item.id === node.projectId && item.level === 0);
  const others = users.filter((user) => user.account !== session.account).map((user) => ({ value: user.account, label: `${user.name}（${user.account}）` }));
  const mine = invites.filter((item) => item.nodeId === node.id && item.from === session.account && (item.status === "pending" || item.status === "rejected"));
  const nextLevel = (node.level + 1) as TaskLevel;

  return (
    <div className="mx-auto max-w-[860px]" data-testid="node-page">
      <button type="button" className="mb-3 text-sm text-[#2f6fed]" onClick={back}>
        返回專案列表
      </button>
      <h1 className="text-[22px] font-bold">{node.name}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {LEVEL_LABEL[node.level]} · {summary(node, names)}
      </p>
      <div className="mt-4">
        <Notice error={error} ok={ok} />
      </div>
      <section className="rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-2 text-[15px] font-semibold">狀態</h2>
        <div className="flex flex-wrap gap-2">
          {TASK_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={node.status === status ? "default" : "outline"}
              disabled={!editable}
              data-testid={`status-${status}`}
              onClick={() => report(office.setTaskStatus(node.id, status), "已更新這個節點。其他層不會跟著改。")}
            >
              {status}
            </Button>
          ))}
        </div>
        {!editable ? <p className="mt-2 text-xs text-[#667085]">你只可查看。改狀態、建下一層與邀請都要負責人。</p> : null}
      </section>

      {editable && node.level < 3 ? (
        <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-2 text-[15px] font-semibold">建立下一層{LEVEL_LABEL[nextLevel]}</h2>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const message = office.createChildTask(node.id, childName);
              report(message, "已建立下一層。不能在這裡建立同層。");
              if (!message) setChildName("");
            }}
          >
            <Input data-testid="child-name" value={childName} onChange={(event) => setChildName(event.target.value)} placeholder="名稱" className="h-10 max-w-xs" />
            <Button data-testid="create-child" type="submit">建立</Button>
          </form>
          <ul className="mt-3 space-y-1">
            {childNodes(tasks.filter((item) => canViewNode(tasks, item, session.account)), node.id).map((child) => (
              <li key={child.id}>
                <button type="button" className="text-sm text-[#2f6fed]" onClick={() => openNode(child.id)}>
                  {child.name} · {child.status}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {editable ? (
        <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-2 text-[15px] font-semibold">邀請</h2>
          <p className="mb-2 text-xs text-[#667085]">對方要登出再登入後才看得到，同意前不會生效。轉交成功後你變成只可查看，狀態不變。</p>
          <div className="flex flex-wrap items-end gap-2">
            <Select items={others} value={target} onValueChange={(value) => setTarget(value ?? "")}>
              <SelectTrigger data-testid="invite-user" className="h-10 w-[220px]">
                <SelectValue placeholder="選擇帳戶" />
              </SelectTrigger>
              <SelectContent>
                {others.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => report(office.inviteToTask(node.id, target, "add"), "已送出添加邀請。")}>
              邀請加入
            </Button>
            <Button type="button" variant="outline" onClick={() => report(office.inviteToTask(node.id, target, "transfer"), "已送出轉交。對方同意前，負責人不變。")}>
              轉交
            </Button>
          </div>
          <ul className="mt-3 space-y-2" data-testid="sent-invites">
            {mine.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span>
                  {item.kind === "transfer" ? "轉交" : "添加"} {names.get(item.to) ?? item.to} · {item.status === "rejected" ? "已拒絕" : "等待回覆"}
                </span>
                {item.status === "pending" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => report(office.withdrawTaskInvite(item.id), "已撤回。")}>
                    撤回
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-2 text-[15px] font-semibold">待辦備註</h2>
        {editable ? (
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const message = office.addTaskNote(node.id, noteTitle);
              report(message, "已加上備註。勾完成不會改節點狀態。");
              if (!message) setNoteTitle("");
            }}
          >
            <Input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="標題" className="h-10 max-w-xs" />
            <Button type="submit" variant="outline">
              加入
            </Button>
          </form>
        ) : null}
        <ul className="space-y-2">
          {node.notes.length === 0 ? <li className="text-[13px] text-muted-foreground">沒有備註。</li> : null}
          {node.notes.map((note) => (
            <li key={note.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={note.done} disabled={!editable} onChange={() => report(office.toggleTaskNote(node.id, note.id), "已更新備註。")} />
              <span className={note.done ? "text-[#8b919d] line-through" : ""}>{note.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
        <h2 className="mb-2 text-[15px] font-semibold">連結</h2>
        {editable ? (
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const message = office.addTaskLink(node.id, linkUrl);
              report(message, "已加上連結。");
              if (!message) setLinkUrl("");
            }}
          >
            <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" className="h-10 max-w-sm" />
            <Button type="submit" variant="outline">
              加入
            </Button>
          </form>
        ) : null}
        <ul className="space-y-2">
          {node.links.map((link, index) => (
            <li key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
              <a href={link.url} target="_blank" rel="noreferrer" className="text-[#2f6fed] underline">
                {link.url}
              </a>
              {editable ? (
                <>
                  <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => report(office.moveTaskLink(node.id, link.id, -1), "已調整順序。")}>
                    上移
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={index === node.links.length - 1} onClick={() => report(office.moveTaskLink(node.id, link.id, 1), "已調整順序。")}>
                    下移
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {project && project.assignees.includes(session.account) && node.level === 0 ? (
        <section className="mt-3 rounded-2xl border border-[#e6e8ee] bg-white p-4">
          <h2 className="mb-2 text-[15px] font-semibold">可見範圍</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["all", "全專案可見"],
                ["partial", "部分可見"],
                ["self", "只限自己部分"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={project.visibility === mode ? "default" : "outline"}
                data-testid={`visibility-${mode}`}
                onClick={() => report(office.setTaskVisibility(project.id, mode as VisibilityMode, visiblePick), "已更新可見範圍。你仍然看得到整棵樹。")}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {users
              .filter((user) => user.account !== session.account)
              .map((user) => (
                <label key={user.account} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={visiblePick.includes(user.account)}
                    onChange={() =>
                      setVisiblePick((current) =>
                        current.includes(user.account) ? current.filter((item) => item !== user.account) : [...current, user.account],
                      )
                    }
                  />
                  {user.name}（部分可見名單）
                </label>
              ))}
          </div>
        </section>
      ) : null}

      {project && project.creator === session.account && node.level === 0 ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => {
            const message = office.removeProject(project.id);
            report(message, "整棵樹已移到刪除紀錄。");
            if (!message) back();
          }}
        >
          刪除整個專案
        </Button>
      ) : null}

      {editable && node.level > 0 && childNodes(tasks, node.id).length === 0 && node.creator === session.account ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => {
            const message = office.removeLeafTask(node.id);
            report(message, "已刪除這個沒有下層的節點。");
            if (!message) back();
          }}
        >
          刪除這個節點
        </Button>
      ) : null}
    </div>
  );
}
