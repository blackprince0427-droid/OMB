"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  linkLabel,
  listDenseRows,
  taskNoteSummary,
  type KanbanLaneMode,
  type TaskTreeViewMode,
} from "@/lib/task-tree-view";
import {
  TASK_STATUSES,
  childNodes,
  type TaskNode,
  type TaskStatus,
  type VisibilityMode,
} from "@/lib/tasks";

const VISIBILITY_LABEL: Record<VisibilityMode, string> = {
  all: "全專案",
  partial: "部分可見",
  self: "只限自己",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  未開始: "bg-[#f0f1f4] text-[#667085]",
  進行中: "bg-[#e8f0fe] text-[#2f6fed]",
  已完成: "bg-[#e7f6ee] text-[#178a4a]",
  暫停: "bg-[#fef3e2] text-[#9a6b2f]",
};

const VISIBILITY_CLASS: Record<VisibilityMode, string> = {
  all: "bg-[#e7f6ee] text-[#17693a]",
  partial: "bg-[#fef3e2] text-[#9a6b2f]",
  self: "bg-[#efe8f8] text-[#6b4e9a]",
};

const AVATAR_COLORS = ["#178a4a", "#2f6fed", "#0f766e", "#9a6b2f", "#6b4e9a", "#1e3a5f"];

function avatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function peopleLabel(accounts: string[], names: Map<string, string>): string {
  return accounts.map((account) => names.get(account) ?? account).join("、");
}

function StatusChip({ status, dense = false }: { status: TaskStatus; dense?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center font-medium",
        dense ? "border border-black/5 px-1 py-px text-[10px]" : "rounded-full px-2.5 py-0.5 text-[11px]",
        STATUS_CLASS[status],
      )}
    >
      {status}
    </span>
  );
}

function VisibilityChip({ mode, dense = false, prefix = "" }: { mode: VisibilityMode; dense?: boolean; prefix?: string }) {
  return (
    <span
      title="專案可見範圍"
      className={cn(
        "inline-flex shrink-0 items-center font-medium",
        dense ? "border border-black/5 px-1 py-px text-[10px]" : "rounded-full px-2.5 py-0.5 text-[11px]",
        VISIBILITY_CLASS[mode],
      )}
    >
      {prefix}
      {VISIBILITY_LABEL[mode]}
    </span>
  );
}

function MetaChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-full bg-[#f4f5f7] px-2.5 py-0.5 text-[11px] font-medium text-[#667085]", className)}>
      {children}
    </span>
  );
}

function NoteText({ node, dense = false }: { node: TaskNode; dense?: boolean }) {
  if (node.notes.length === 0) {
    return <span className="text-[#c0c4c8]">—</span>;
  }
  const summary = taskNoteSummary(node.notes);
  return (
    <span className={cn("block min-w-0 truncate", dense ? "" : "text-[#3c4250]")} title={summary}>
      {node.notes.map((note, index) => (
        <span key={note.id} className={note.done ? "text-[#8b919d] line-through" : ""}>
          {index > 0 ? "、" : ""}
          {note.title}
        </span>
      ))}
    </span>
  );
}

function LinkText({ node }: { node: TaskNode }) {
  const link = node.links[0];
  if (!link) return <span className="text-[#c0c4c8]">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        title={link.url}
        className="truncate text-[#2f6fed] hover:underline"
      >
        {linkLabel(link.url)}
      </a>
      {node.links.length > 1 ? <span className="shrink-0 text-[#8b919d]">+{node.links.length - 1}</span> : null}
    </span>
  );
}

function Avatars({ accounts, names }: { accounts: string[]; names: Map<string, string> }) {
  if (accounts.length === 0) {
    return <span className="rounded-full border border-dashed border-[#e6e8ee] bg-[#f4f5f7] px-2 py-0.5 text-[11px] text-[#8b919d]">未指派</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {accounts.map((account) => {
        const name = names.get(account) ?? account;
        return (
          <span
            key={account}
            title={name}
            className="grid size-[22px] place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ background: avatarColor(name) }}
          >
            {name.slice(0, 1)}
          </span>
        );
      })}
    </span>
  );
}

function OpenName({
  node,
  onOpen,
  className,
}: {
  node: TaskNode;
  onOpen: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={`open-node-${node.id}`}
      title={`打開${node.name}`}
      className={cn("min-w-0 max-w-full truncate text-left hover:text-[#178a4a] hover:underline", className)}
      onClick={() => onOpen(node.id)}
    >
      {node.name}
    </button>
  );
}

export function TaskTreeToolbar({
  mode,
  laneMode,
  onMode,
  onLaneMode,
  onExpandAll,
  onCollapse,
}: {
  mode: TaskTreeViewMode;
  laneMode: KanbanLaneMode;
  onMode: (mode: TaskTreeViewMode) => void;
  onLaneMode: (mode: KanbanLaneMode) => void;
  onExpandAll: () => void;
  onCollapse: () => void;
}) {
  const dense = mode === "dense";
  return (
    <div className="mb-3 space-y-2" data-testid="task-tree-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="顯示方式" className="inline-flex overflow-hidden rounded-full border border-[#e6e8ee] bg-white">
          <button
            type="button"
            role="tab"
            id="task-tree-tab-dense"
            aria-selected={dense}
            aria-controls="task-tree-panel"
            data-testid="view-mode-dense"
            className={cn(
              "px-4 py-1.5 text-xs font-semibold",
              dense ? "bg-[#178a4a] text-white" : "text-[#667085] hover:bg-[#f4f5f7]",
            )}
            onClick={() => onMode("dense")}
          >
            密集表
          </button>
          <button
            type="button"
            role="tab"
            id="task-tree-tab-kanban"
            aria-selected={!dense}
            aria-controls="task-tree-panel"
            data-testid="view-mode-kanban"
            className={cn(
              "border-l border-[#e6e8ee] px-4 py-1.5 text-xs font-semibold",
              dense ? "text-[#667085] hover:bg-[#f4f5f7]" : "border-l-transparent bg-[#178a4a] text-white",
            )}
            onClick={() => onMode("kanban")}
          >
            卡片看板
          </button>
        </div>
        <Button type="button" size="sm" variant="outline" className="rounded-full" data-testid="expand-all" onClick={onExpandAll}>
          {dense ? "全部展開" : "全部展開 L2／L3"}
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" data-testid="collapse-tree" onClick={onCollapse}>
          {dense ? "收合至 L1" : "收合至 L2"}
        </Button>
        <p className="text-xs text-[#8b919d] md:ml-auto" data-testid="task-tree-mode-hint">
          {dense ? "預設展開至 L1｜點 [+]／[−] 展開子層" : "L1 為泳道｜點卡片 ▶ 展開 L3"}
        </p>
      </div>
      {dense ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="看板分組" className="inline-flex gap-1.5">
            <button
              type="button"
              role="tab"
              aria-selected={laneMode === "l1"}
              data-testid="kanban-by-l1"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                laneMode === "l1" ? "border-[#178a4a] bg-[#178a4a] text-white" : "border-[#e6e8ee] bg-white text-[#667085] hover:bg-[#f4f5f7]",
              )}
              onClick={() => onLaneMode("l1")}
            >
              依 L1 主任務
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={laneMode === "status"}
              data-testid="kanban-by-status"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                laneMode === "status" ? "border-[#178a4a] bg-[#178a4a] text-white" : "border-[#e6e8ee] bg-white text-[#667085] hover:bg-[#f4f5f7]",
              )}
              onClick={() => onLaneMode("status")}
            >
              依狀態泳道
            </button>
          </div>
          <p className="text-xs text-[#8b919d]">預設顯示 L1 泳道內之 L2；點卡片 ▶ 展開 L3</p>
        </div>
      )}
    </div>
  );
}

export function ProjectSummaryBar({
  project,
  names,
  onOpen,
}: {
  project: TaskNode;
  names: Map<string, string>;
  onOpen: (id: string) => void;
}) {
  const owners = peopleLabel(project.assignees, names);
  const notes = taskNoteSummary(project.notes);
  return (
    <section className="rounded-2xl border border-[#e6e8ee] bg-white px-4 py-3.5" data-testid={`project-summary-${project.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold">
          <OpenName node={project} onOpen={onOpen} className="text-base font-semibold" />
          <span className="ml-2 text-xs font-medium text-[#8b919d]">L0 專案</span>
        </h2>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onOpen(project.id)}>
          打開
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", STATUS_CLASS[project.status])}>
          狀態：{project.status}
        </span>
        <VisibilityChip mode={project.visibility} prefix="可見：" />
        <MetaChip>專案負責人：{owners || "尚未指定負責人"}</MetaChip>
        <MetaChip className="max-w-[280px]">備註：{notes || "沒有備註"}</MetaChip>
        {project.links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={link.url}
            className="inline-flex max-w-[220px] items-center truncate rounded-full bg-[#f4f5f7] px-2.5 py-0.5 text-[11px] font-medium text-[#2f6fed] hover:underline"
          >
            {linkLabel(link.url)}
          </a>
        ))}
      </div>
    </section>
  );
}

export function DenseTaskTable({
  project,
  nodes,
  expanded,
  names,
  onOpen,
  onToggle,
}: {
  project: TaskNode;
  nodes: TaskNode[];
  expanded: Record<string, boolean>;
  names: Map<string, string>;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const rows = listDenseRows(nodes, project.id, expanded);
  return (
    <div className="overflow-x-auto rounded-md border border-[#d5d8de] bg-white" data-testid={`dense-table-${project.id}`}>
      <table className="w-full min-w-[760px] table-fixed border-collapse text-xs">
        <caption className="sr-only">{project.name}任務樹</caption>
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="bg-[#e8eaec] text-left text-[10px] font-semibold text-[#4a5056]">
            <th className="border-r border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">層級／名稱</th>
            <th className="border-r border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">狀態</th>
            <th className="border-r border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">可見範圍</th>
            <th className="border-r border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">負責人</th>
            <th className="border-r border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">備註待辦</th>
            <th className="border-b border-[#e2e5e7] px-1.5 py-1 font-semibold">超連結</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-[#8b919d]">
                尚無主任務。打開專案後可建立下一層。
              </td>
            </tr>
          ) : (
            rows.map((node) => {
              const kids = childNodes(nodes, node.id);
              const open = Boolean(expanded[node.id]);
              const owners = peopleLabel(node.assignees, names);
              return (
                <tr
                  key={node.id}
                  data-testid={`tree-row-${node.id}`}
                  className={cn(
                    "hover:bg-[#f5f7f8]",
                    node.level === 1 && "bg-[#fafafa] font-semibold",
                    node.level === 3 && "text-[#4a5056]",
                  )}
                >
                  <td className="border-r border-b border-[#eef0f1] px-1.5 py-0.5">
                    <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: (node.level - 1) * 14 }}>
                      {kids.length > 0 ? (
                        <button
                          type="button"
                          data-testid={`expand-${node.id}`}
                          aria-expanded={open}
                          aria-label={open ? `收合${node.name}` : `展開${node.name}`}
                          className={cn(
                            "grid size-3.5 shrink-0 place-items-center border border-[#cfd3d6] bg-[#f4f5f6] font-mono text-[10px] leading-none text-[#4a5056]",
                            open && "bg-[#dde1e4]",
                          )}
                          onClick={() => onToggle(node.id)}
                        >
                          {open ? "−" : "+"}
                        </button>
                      ) : (
                        <span className="inline-block size-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="shrink-0 bg-[#eef0f1] px-1 font-mono text-[9px] text-[#7a828a]">L{node.level}</span>
                      <OpenName node={node} onOpen={onOpen} />
                    </div>
                  </td>
                  <td className="border-r border-b border-[#eef0f1] px-1.5 py-0.5 whitespace-nowrap">
                    <StatusChip status={node.status} dense />
                  </td>
                  <td className="border-r border-b border-[#eef0f1] px-1.5 py-0.5 whitespace-nowrap">
                    <VisibilityChip mode={project.visibility} dense />
                  </td>
                  <td className={cn("truncate border-r border-b border-[#eef0f1] px-1.5 py-0.5", owners ? "text-[#4a5056]" : "text-[#8b919d] italic")} title={owners || undefined}>
                    {owners || "—"}
                  </td>
                  <td className="border-r border-b border-[#eef0f1] px-1.5 py-0.5 text-[#4a5056]">
                    <NoteText node={node} dense />
                  </td>
                  <td className="border-b border-[#eef0f1] px-1.5 py-0.5">
                    <LinkText node={node} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function TaskCard({
  node,
  visibility,
  names,
  nested,
  open,
  childTasks,
  parentName,
  onOpen,
  onToggle,
}: {
  node: TaskNode;
  visibility: VisibilityMode;
  names: Map<string, string>;
  nested: boolean;
  open: boolean;
  childTasks: TaskNode[];
  parentName?: string;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const notes = taskNoteSummary(node.notes);
  return (
    <article
      data-testid={`card-${node.id}`}
      className={cn(
        "mb-2 rounded-xl border border-[#e6e8ee] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(22,28,45,0.04)]",
        nested ? "ml-2.5 border-l-[3px] border-l-[#b7e4c8] bg-[#f7fbf8] shadow-none" : "border-l-[3px] border-l-[#178a4a]",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="rounded bg-[#eef1f4] px-1.5 py-px text-[10px] font-semibold text-[#667085]">L{node.level}</span>
        <StatusChip status={node.status} />
        <VisibilityChip mode={visibility} />
        {childTasks.length > 0 ? (
          <button
            type="button"
            data-testid={`expand-${node.id}`}
            aria-expanded={open}
            aria-label={open ? `收合${node.name}` : `展開${node.name}`}
            className="ml-auto grid size-6 place-items-center rounded-lg bg-[#f4f5f7] text-xs text-[#667085] hover:bg-[#e8eaef] hover:text-[#1c1f26]"
            onClick={() => onToggle(node.id)}
          >
            {open ? "▼" : "▶"}
          </button>
        ) : null}
      </div>
      {parentName ? <p className="mb-1 text-[11px] text-[#8b919d]">隸屬：{parentName}</p> : null}
      <OpenName node={node} onOpen={onOpen} className={cn("mb-2 block w-full font-semibold", nested ? "text-xs font-medium" : "text-[13.5px]")} />
      <div className="space-y-1.5 text-xs">
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 pt-px text-[11px] text-[#8b919d]">負責人</span>
          <Avatars accounts={node.assignees} names={names} />
        </div>
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 text-[11px] text-[#8b919d]">備註</span>
          <span className={cn("min-w-0", notes ? "text-[#3c4250]" : "text-[#8b919d]")}>
            <NoteText node={node} />
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 text-[11px] text-[#8b919d]">連結</span>
          <LinkText node={node} />
        </div>
      </div>
      {open
        ? childTasks.map((child) => (
            <div key={child.id} className="mt-2">
              <TaskCard
                node={child}
                visibility={visibility}
                names={names}
                nested
                open={false}
                childTasks={[]}
                onOpen={onOpen}
                onToggle={onToggle}
              />
            </div>
          ))
        : null}
    </article>
  );
}

function LaneFrame({
  testId,
  accent,
  head,
  children,
}: {
  testId: string;
  accent?: string;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="w-[300px] shrink-0 rounded-[14px] border border-[#e6e8ee] bg-white/80 p-3 shadow-[0_1px_2px_rgba(22,28,45,0.04)]">
      {accent ? <div className="mb-2.5 h-1 rounded" style={{ background: accent }} /> : null}
      <div className="mb-2.5 border-b border-dashed border-[#e6e8ee] pb-2.5">{head}</div>
      {children}
    </section>
  );
}

const STATUS_ACCENT: Record<TaskStatus, string> = {
  未開始: "#667085",
  進行中: "#2f6fed",
  已完成: "#178a4a",
  暫停: "#9a6b2f",
};

export function KanbanTaskBoard({
  project,
  nodes,
  laneMode,
  expanded,
  names,
  onOpen,
  onToggle,
}: {
  project: TaskNode;
  nodes: TaskNode[];
  laneMode: KanbanLaneMode;
  expanded: Record<string, boolean>;
  names: Map<string, string>;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const lanes = childNodes(nodes, project.id);
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[#e6e8ee] bg-[radial-gradient(ellipse_at_top_left,#e7f6ee_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,#e8f0fe_0%,transparent_45%),#f4f5f7] p-3.5"
      data-testid={`kanban-board-${project.id}`}
    >
      <div className="flex w-max items-start gap-3.5 pb-1">
        {laneMode === "l1" ? (
          lanes.length === 0 ? (
            <p className="px-2 py-6 text-xs text-[#8b919d]">尚無主任務。打開專案後可建立下一層。</p>
          ) : (
            lanes.map((lane) => {
              const tasks = childNodes(nodes, lane.id);
              const l3count = tasks.reduce((sum, task) => sum + childNodes(nodes, task.id).length, 0);
              const notes = taskNoteSummary(lane.notes);
              return (
                <LaneFrame
                  key={lane.id}
                  testId={`lane-${lane.id}`}
                  head={
                    <>
                      <h3>
                        <OpenName node={lane} onOpen={onOpen} className="text-sm font-semibold" />
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <StatusChip status={lane.status} />
                        <VisibilityChip mode={project.visibility} />
                        <span className="rounded-full bg-[#eef1f4] px-2 py-0.5 text-[11px] text-[#667085]">
                          L2 ×{tasks.length} · L3 ×{l3count}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Avatars accounts={lane.assignees} names={names} />
                        {lane.links[0] ? (
                          <a href={lane.links[0].url} target="_blank" rel="noreferrer" className="max-w-[140px] truncate text-xs text-[#2f6fed] hover:underline">
                            {linkLabel(lane.links[0].url)}
                          </a>
                        ) : null}
                      </div>
                      {notes ? <p className="mt-1.5 truncate text-xs text-[#3c4250]" title={notes}>{notes}</p> : null}
                    </>
                  }
                >
                  {tasks.length === 0 ? (
                    <p className="rounded-[10px] border border-dashed border-[#e6e8ee] px-2 py-6 text-center text-xs text-[#8b919d]">尚無子任務</p>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        node={task}
                        visibility={project.visibility}
                        names={names}
                        nested={false}
                        open={Boolean(expanded[task.id])}
                        childTasks={childNodes(nodes, task.id)}
                        onOpen={onOpen}
                        onToggle={onToggle}
                      />
                    ))
                  )}
                </LaneFrame>
              );
            })
          )
        ) : (
          TASK_STATUSES.map((status) => {
            const cards = lanes.flatMap((lane) =>
              childNodes(nodes, lane.id)
                .filter((task) => task.status === status)
                .map((task) => ({ task, parentName: lane.name })),
            );
            return (
              <LaneFrame
                key={status}
                testId={`status-lane-${project.id}-${status}`}
                accent={STATUS_ACCENT[status]}
                head={
                  <>
                    <h3 className="text-sm font-semibold">{status}</h3>
                    <div className="mt-1.5">
                      <span className="rounded-full bg-[#eef1f4] px-2 py-0.5 text-[11px] text-[#667085]">{cards.length} 張 L2 卡片</span>
                    </div>
                  </>
                }
              >
                {cards.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[#e6e8ee] px-2 py-6 text-center text-xs text-[#8b919d]">此狀態暫無項目</p>
                ) : (
                  cards.map(({ task, parentName }) => (
                    <TaskCard
                      key={task.id}
                      node={task}
                      visibility={project.visibility}
                      names={names}
                      nested={false}
                      open={Boolean(expanded[task.id])}
                      childTasks={childNodes(nodes, task.id)}
                      parentName={parentName}
                      onOpen={onOpen}
                      onToggle={onToggle}
                    />
                  ))
                )}
              </LaneFrame>
            );
          })
        )}
      </div>
    </div>
  );
}
