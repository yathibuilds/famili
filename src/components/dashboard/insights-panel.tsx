"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  status?: string | null;
  current_deadline?: string | null;
  deadline_revision_count?: number | null;
  completed_count?: number | null;
  reopened_count?: number | null;
  assigned_to_member_id?: string | null;
};

type Member = {
  id: string;
  name: string;
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function InsightsPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function getFamilyId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("families")
      .select("id")
      .eq("created_by", user?.id)
      .maybeSingle();

    return data?.id ?? null;
  }

  async function loadData() {
    const familyId = await getFamilyId();

    const [tasksResponse, membersResponse] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,status,current_deadline,deadline_revision_count,completed_count,reopened_count,assigned_to_member_id")
        .order("created_at", { ascending: false }),
      familyId
        ? supabase.from("family_members").select("id,name").eq("family_id", familyId).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null } as { data: Member[]; error: null }),
    ]);

    if (tasksResponse.error) {
      setMessage(tasksResponse.error.message);
      return;
    }

    if (membersResponse.error) {
      setMessage(membersResponse.error.message);
      return;
    }

    setTasks(tasksResponse.data || []);
    setMembers((membersResponse.data as Member[]) || []);
  }

  const metrics = useMemo(() => {
    const today = todayString();
    let done = 0;
    let pending = 0;
    let overdue = 0;
    let reopenedTotal = 0;
    let completedTotal = 0;

    let mostRevisedTask: Task | null = null;
    let mostReopenedTask: Task | null = null;

    const reopenByMember: Record<string, number> = {};

    for (const task of tasks) {
      const reopenedCount = task.reopened_count || 0;
      const completedCount = task.completed_count || 0;
      const revisedCount = task.deadline_revision_count || 0;

      reopenedTotal += reopenedCount;
      completedTotal += completedCount;

      if (task.status === "done") {
        done += 1;
      } else {
        pending += 1;
        if (task.current_deadline && task.current_deadline < today) {
          overdue += 1;
        }
      }

      if (!mostRevisedTask || revisedCount > (mostRevisedTask.deadline_revision_count || 0)) {
        mostRevisedTask = task;
      }

      if (!mostReopenedTask || reopenedCount > (mostReopenedTask.reopened_count || 0)) {
        mostReopenedTask = task;
      }

      if (task.assigned_to_member_id && reopenedCount > 0) {
        reopenByMember[task.assigned_to_member_id] = (reopenByMember[task.assigned_to_member_id] || 0) + reopenedCount;
      }
    }

    let mostAffectedMemberId: string | null = null;
    let mostAffectedMemberCount = 0;

    for (const [memberId, count] of Object.entries(reopenByMember)) {
      if (count > mostAffectedMemberCount) {
        mostAffectedMemberCount = count;
        mostAffectedMemberId = memberId;
      }
    }

    return {
      done,
      pending,
      overdue,
      reopenedTotal,
      completedTotal,
      mostRevisedTask,
      mostReopenedTask,
      mostAffectedMemberId,
      mostAffectedMemberCount,
    };
  }, [tasks]);

  function memberName(memberId: string | null) {
    if (!memberId) return "None";
    return members.find((member) => member.id === memberId)?.name || "Unknown member";
  }

  return (
    <section id="insights" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Insights</p>
        <h2 className="mt-3 text-2xl font-semibold">Task intelligence snapshot</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Use the data you already track to understand where work is stable, delayed, or frequently reopened.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Completed tasks", metrics.done, "Tasks currently closed"],
          ["Pending tasks", metrics.pending, "Tasks still in progress"],
          ["Overdue tasks", metrics.overdue, "Pending tasks past deadline"],
          ["Reopen events", metrics.reopenedTotal, "How many times work came back"],
        ].map(([label, value, note]) => (
          <article key={String(label)} className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl shadow-black/10">
            <p className="text-sm text-neutral-400">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold text-white">{value}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Most revised task</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Task with the highest deadline change count.</p>
          <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <p className="text-sm font-semibold text-white">{metrics.mostRevisedTask?.title || "No task yet"}</p>
            <p className="mt-2 text-sm text-neutral-400">
              Revisions: {metrics.mostRevisedTask?.deadline_revision_count || 0}
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Most reopened task</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Task that needed the most reopen cycles.</p>
          <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <p className="text-sm font-semibold text-white">{metrics.mostReopenedTask?.title || "No task yet"}</p>
            <p className="mt-2 text-sm text-neutral-400">
              Reopened: {metrics.mostReopenedTask?.reopened_count || 0} times
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Most affected member</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Member linked to the highest number of reopen events.</p>
          <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <p className="text-sm font-semibold text-white">{memberName(metrics.mostAffectedMemberId)}</p>
            <p className="mt-2 text-sm text-neutral-400">
              Reopen events: {metrics.mostAffectedMemberCount}
            </p>
          </div>
        </article>
      </section>
    </section>
  );
}
