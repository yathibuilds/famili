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
  const [memberName, setMemberName] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    void loadTasks();
    void loadMembers();
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

    return data?.id;
  }

  async function loadMembers() {
    const familyId = await getFamilyId();
    if (!familyId) return;

    const { data } = await supabase
      .from("family_members")
      .select("id,name")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    setMembers(data || []);
  }

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function addTask() {
    if (!title.trim()) return;

    await supabase.from("tasks").insert({
      title,
      category,
      current_deadline: deadline || null,
      original_deadline: deadline || null,
      assigned_to_member_id: selectedMemberId || null,
    });

    setTitle("");
    setDeadline("");
    setSelectedMemberId("");
    setCategory("Other");
    await loadTasks();
  }

  async function addMember() {
    if (!memberName.trim()) return;

    const familyId = await getFamilyId();
    if (!familyId) return;

    await supabase.from("family_members").insert({
      name: memberName,
      family_id: familyId,
    });

    setMemberName("");
    await loadMembers();
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

      <div className="grid gap-6 xl:grid-cols-2">
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
          <h3 className="text-lg font-semibold text-white">Add member</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Add family members here so they can immediately be assigned to tasks.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Member name</label>
              <input
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                placeholder="Enter family member name"
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
              />
            </div>

            <button
              className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
              onClick={() => void addMember()}
            >
              Add Member
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <h3 className="text-lg font-semibold text-white">Task Board</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Filter and scan all tasks from one combined view.
        </p>

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

          {visibleTasks.map((task) => (
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
                  </div>
                </div>

                <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${timingClasses(task)}`}>
                  {timingLabel(task)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
