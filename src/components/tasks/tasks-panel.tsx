"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  assigned_to_label?: string | null;
  assigned_to_member_id?: string | null;
  status?: string | null;
  current_deadline?: string | null;
  original_deadline?: string | null;
  deadline_revision_count?: number | null;
  category?: string | null;
  completed_at?: string | null;
  completed_count?: number | null;
  reopened_count?: number | null;
  last_reopened_reason?: string | null;
  last_reopened_at?: string | null;
  last_reopened_by?: string | null;
};

type Member = {
  id: string;
  name: string;
};

type FilterType = "all" | "pending" | "done";

const categories = [
  "Groceries",
  "Bills",
  "Travel",
  "School",
  "Health",
  "Home",
  "Purchase",
  "Service",
  "Admin",
  "Personal",
  "Family",
  "Other",
];

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [filter, setFilter] = useState<FilterType>("pending");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const [reopenTaskId, setReopenTaskId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenNewDeadline, setReopenNewDeadline] = useState("");

  const [manageTaskId, setManageTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("Other");
  const [editMemberId, setEditMemberId] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  useEffect(() => {
    void loadTasks();
    void loadMembers();
  }, []);

  async function getUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function getCurrentUserAsMember(): Promise<Member | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("family_members")
    .select("id,name")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data;

  return {
    id: user.id,
    name: "You",
  };
}
  
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

  async function loadMembers() {
    const familyId = await getFamilyId();
    if (!familyId) return;

    const { data, error } = await supabase
      .from("family_members")
      .select("id,name")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTasks(data || []);
  }

  async function addTask() {
    if (!title.trim()) return;

    setMessage(null);

    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      category,
      current_deadline: deadline || null,
      original_deadline: deadline || null,
      assigned_to_member_id: selectedMemberId || userId,
      status: "pending",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setDeadline("");
    setSelectedMemberId("");
    setCategory("Other");
    setMessage("Task added.");
    await loadTasks();
  }

  async function logTaskEvent(taskId: string, payload: {
    eventType: string;
    reason?: string | null;
    oldStatus?: string | null;
    newStatus?: string | null;
  }) {
    const userId = await getUserId();
    const familyId = await getFamilyId();

    await supabase.from("task_events").insert({
      task_id: taskId,
      family_id: familyId,
      event_type: payload.eventType,
      event_reason: payload.reason ?? null,
      old_status: payload.oldStatus ?? null,
      new_status: payload.newStatus ?? null,
      changed_by: userId,
    });
  }

  function getAssignedName(task: Task) {
    if (task.assigned_to_member_id) {
      const member = members.find((memberItem) => memberItem.id === task.assigned_to_member_id);
      if (member?.name) return member.name;
    }
    if (task.assigned_to_label) return task.assigned_to_label;
    return "Unassigned";
  }

  function formatDate(dateValue?: string | null) {
    if (!dateValue) return "";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}/${month}/${year}`;
  }

  function getTodayString() {
    return new Date().toISOString().split("T")[0];
  }

  function getTiming(task: Task) {
    if (!task.current_deadline) return "upcoming";
    const today = getTodayString();
    if (task.current_deadline < today) return "overdue";
    if (task.current_deadline === today) return "today";
    return "upcoming";
  }

  function timingClasses(task: Task) {
    if (task.status === "done") {
      return "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20";
    }
    const timing = getTiming(task);
    if (timing === "overdue") {
      return "bg-red-500/10 text-red-200 border border-red-500/20";
    }
    if (timing === "today") {
      return "bg-amber-500/10 text-amber-200 border border-amber-500/20";
    }
    return "bg-cyan-500/10 text-cyan-200 border border-cyan-500/20";
  }

  function timingLabel(task: Task) {
    if (task.status === "done") return "Done";
    const timing = getTiming(task);
    if (timing === "overdue") return "Overdue";
    if (timing === "today") return "Due today";
    return "Upcoming";
  }

  async function markDone(task: Task) {
    setLoadingTaskId(task.id);
    setMessage(null);

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        completed_count: (task.completed_count || 0) + 1,
      })
      .eq("id", task.id);

    if (error) {
      setLoadingTaskId(null);
      setMessage(error.message);
      return;
    }

    await logTaskEvent(task.id, {
      eventType: "completed",
      oldStatus: task.status || "pending",
      newStatus: "done",
    });

    setLoadingTaskId(null);
    setMessage("Task marked done.");
    await loadTasks();
  }

  function startReopen(task: Task) {
    setReopenTaskId(task.id);
    setReopenReason("");
    setReopenNewDeadline(task.current_deadline || "");
    setMessage(null);
  }

  function cancelReopen() {
    setReopenTaskId(null);
    setReopenReason("");
    setReopenNewDeadline("");
  }

  async function confirmReopen(task: Task) {
    if (!reopenReason.trim()) {
      setMessage("Please provide a reason for reopening.");
      return;
    }

    setLoadingTaskId(task.id);
    setMessage(null);

    const nextDeadline = reopenNewDeadline || null;
    const deadlineChanged = (task.current_deadline || null) !== nextDeadline;

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "pending",
        completed_at: null,
        current_deadline: nextDeadline,
        reopened_count: (task.reopened_count || 0) + 1,
        last_reopened_reason: reopenReason.trim(),
        last_reopened_at: new Date().toISOString(),
        last_reopened_by: await getUserId(),
        deadline_revision_count: deadlineChanged
          ? (task.deadline_revision_count || 0) + 1
          : task.deadline_revision_count || 0,
      })
      .eq("id", task.id);

    if (error) {
      setLoadingTaskId(null);
      setMessage(error.message);
      return;
    }

    await logTaskEvent(task.id, {
      eventType: "reopened",
      reason: reopenReason.trim(),
      oldStatus: "done",
      newStatus: "pending",
    });

    if (deadlineChanged) {
      await logTaskEvent(task.id, {
        eventType: "deadline_changed",
        reason: `Deadline changed during reopen from ${task.current_deadline || "none"} to ${nextDeadline || "none"}`,
        oldStatus: "done",
        newStatus: "pending",
      });
    }

    setLoadingTaskId(null);
    cancelReopen();
    setMessage("Task reopened.");
    await loadTasks();
  }

  function startManageTask(task: Task) {
    setManageTaskId(task.id);
    setEditTitle(task.title || "");
    setEditCategory(task.category || "Other");
    setEditMemberId(task.assigned_to_member_id || "");
    setEditDeadline(task.current_deadline || "");
    setMessage(null);
  }

  function cancelManageTask() {
    setManageTaskId(null);
    setEditTitle("");
    setEditCategory("Other");
    setEditMemberId("");
    setEditDeadline("");
  }

  async function saveTaskChanges(task: Task) {
    if (!editTitle.trim()) {
      setMessage("Task title cannot be empty.");
      return;
    }

    setLoadingTaskId(task.id);
    setMessage(null);

    const nextDeadline = editDeadline || null;
    const deadlineChanged = (task.current_deadline || null) !== nextDeadline;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        category: editCategory,
        assigned_to_member_id: editMemberId || null,
        current_deadline: nextDeadline,
        deadline_revision_count: deadlineChanged
          ? (task.deadline_revision_count || 0) + 1
          : task.deadline_revision_count || 0,
      })
      .eq("id", task.id);

    if (error) {
      setLoadingTaskId(null);
      setMessage(error.message);
      return;
    }

    if (deadlineChanged) {
      await logTaskEvent(task.id, {
        eventType: "deadline_changed",
        reason: `Deadline changed from ${task.current_deadline || "none"} to ${nextDeadline || "none"}`,
        oldStatus: task.status || "pending",
        newStatus: task.status || "pending",
      });
    }

    setLoadingTaskId(null);
    cancelManageTask();
    setMessage("Task updated.");
    await loadTasks();
  }

  async function deleteTask(taskId: string, taskTitle: string) {
    const confirmed = confirm(`Delete task "${taskTitle}"?`);
    if (!confirmed) return;

    setLoadingTaskId(taskId);
    setMessage(null);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      setLoadingTaskId(null);
      setMessage(error.message);
      return;
    }

    if (manageTaskId === taskId) {
      cancelManageTask();
    }

    setLoadingTaskId(null);
    setMessage("Task deleted.");
    await loadTasks();
  }

  const summary = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let pending = 0;
    let done = 0;

    for (const task of tasks) {
      if (task.status === "done") {
        done += 1;
      } else {
        pending += 1;
        const timing = getTiming(task);
        if (timing === "overdue") overdue += 1;
        if (timing === "today") dueToday += 1;
      }
    }

    return { overdue, dueToday, pending, done };
  }, [tasks]);

  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of tasks) {
      const nextCategory = task.category || "Other";
      map[nextCategory] = (map[nextCategory] || 0) + 1;
    }
    return map;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    let filtered = tasks;
    if (filter === "pending") filtered = filtered.filter((task) => task.status !== "done");
    if (filter === "done") filtered = filtered.filter((task) => task.status === "done");
    if (selectedCategory) {
      filtered = filtered.filter((task) => (task.category || "Other") === selectedCategory);
    }
    return filtered;
  }, [tasks, filter, selectedCategory]);

  return (
    <section id="tasks" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Tasks</p>
        <h2 className="mt-3 text-2xl font-semibold">House task management</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Keep deadlines, ownership, and status easy to scan without clutter.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Overdue", summary.overdue, "text-red-200 bg-red-500/10 border-red-500/20"],
            ["Due today", summary.dueToday, "text-amber-200 bg-amber-500/10 border-amber-500/20"],
            ["Pending", summary.pending, "text-cyan-200 bg-cyan-500/10 border-cyan-500/20"],
            ["Done", summary.done, "text-emerald-200 bg-emerald-500/10 border-emerald-500/20"],
          ].map(([label, value, className]) => (
            <div key={String(label)} className={`rounded-3xl border p-5 ${className}`}>
              <p className="text-sm">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <h3 className="text-lg font-semibold text-white">Add task</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Create a task with owner, category, and deadline in one clean flow.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-200">Task title</label>
            <input
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              placeholder="Enter task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200">Assign to</label>
            <select
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
            >
              <option value="">Assign member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200">Category</label>
            <select
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-200">Deadline</label>
            <input
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
        </div>

        {selectedMemberId ? (
          <p className="mt-4 text-sm text-neutral-400">
            Assigned to: {members.find((member) => member.id === selectedMemberId)?.name}
          </p>
        ) : null}

        <button
          className="mt-5 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
          onClick={() => void addTask()}
        >
          Add Task
        </button>
      </section>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Task Board</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Filter, manage, complete, and reopen tasks from one combined view.
            </p>
          </div>

          {message ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
              {message}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["all", "pending", "done"] as FilterType[]).map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400 text-neutral-950"
                    : "border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800"
                }`}
              >
                {item === "all" ? "All" : item === "pending" ? "Pending" : "Done"}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              selectedCategory === null
                ? "border-cyan-400 bg-cyan-400 text-neutral-950"
                : "border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800"
            }`}
          >
            All Categories
          </button>

          {Object.entries(categorySummary).map(([item, count]) => {
            const active = selectedCategory === item;
            return (
              <button
                key={item}
                onClick={() => setSelectedCategory(item)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400 text-neutral-950"
                    : "border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800"
                }`}
              >
                {item} ({count})
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4">
          {visibleTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
              No tasks in this view.
            </div>
          ) : null}

          {visibleTasks.map((task) => {
            const isReopening = reopenTaskId === task.id;
            const isManaging = manageTaskId === task.id;
            const isBusy = loadingTaskId === task.id;

            return (
              <article key={task.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-white">{task.title}</h4>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                        {task.category || "Other"}
                      </span>
                      <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                        Assigned to: {getAssignedName(task)}
                      </span>
                      {task.current_deadline ? (
                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                          Due: {formatDate(task.current_deadline)}
                        </span>
                      ) : null}
                      {!!task.deadline_revision_count && task.deadline_revision_count > 0 ? (
                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                          Revised {task.deadline_revision_count} times
                        </span>
                      ) : null}
                      {!!task.completed_count && task.completed_count > 0 ? (
                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                          Completed {task.completed_count} times
                        </span>
                      ) : null}
                      {!!task.reopened_count && task.reopened_count > 0 ? (
                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                          Reopened {task.reopened_count} times
                        </span>
                      ) : null}
                    </div>

                    {task.last_reopened_reason ? (
                      <p className="mt-3 text-sm leading-6 text-amber-200">
                        Last reopen reason: {task.last_reopened_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${timingClasses(task)}`}>
                      {timingLabel(task)}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {task.status !== "done" ? (
                        <button
                          onClick={() => void markDone(task)}
                          disabled={isBusy}
                          className="rounded-2xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={() => startReopen(task)}
                          disabled={isBusy}
                          className="rounded-2xl bg-amber-400 px-3 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        onClick={() => startManageTask(task)}
                        disabled={isBusy}
                        className="rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

                {isReopening ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Reason for reopening</label>
                      <textarea
                        value={reopenReason}
                        onChange={(event) => setReopenReason(event.target.value)}
                        placeholder="Explain why this task is being reopened"
                        className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">New deadline (optional)</label>
                      <input
                        type="date"
                        value={reopenNewDeadline}
                        onChange={(event) => setReopenNewDeadline(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void confirmReopen(task)}
                        disabled={isBusy || !reopenReason.trim()}
                        className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Confirm Reopen
                      </button>

                      <button
                        onClick={cancelReopen}
                        className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {isManaging ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Task title</label>
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Assign to</label>
                        <select
                          value={editMemberId}
                          onChange={(event) => setEditMemberId(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          <option value="">Assign member</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Category</label>
                        <select
                          value={editCategory}
                          onChange={(event) => setEditCategory(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          {categories.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Deadline</label>
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(event) => setEditDeadline(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void saveTaskChanges(task)}
                        disabled={isBusy || !editTitle.trim()}
                        className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>

                      <button
                        onClick={cancelManageTask}
                        className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => void deleteTask(task.id, task.title)}
                        disabled={isBusy}
                        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete Task
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
