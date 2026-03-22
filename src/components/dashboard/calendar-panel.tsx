"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  current_deadline?: string | null;
  status?: string | null;
  category?: string | null;
  assigned_to_member_id?: string | null;
};

type Member = {
  id: string;
  name: string;
};

function toDateOnly(value: Date) {
  return value.toISOString().split("T")[0];
}

function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function endOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function statusDotClass(task: Task, today: string) {
  if (task.status === "done") return "bg-emerald-400";
  if (!task.current_deadline) return "bg-neutral-500";
  if (task.current_deadline < today) return "bg-red-400";
  if (task.current_deadline === today) return "bg-amber-400";
  return "bg-cyan-400";
}

export function CalendarPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateOnly(new Date()));
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
      supabase.from("tasks").select("id,title,current_deadline,status,category,assigned_to_member_id").order("current_deadline", { ascending: true }),
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

  const today = toDateOnly(new Date());
  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const last = endOfMonth(monthCursor);
    const gridStart = addDays(first, -first.getDay());
    const gridEnd = addDays(last, 6 - last.getDay());

    const days: Date[] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [monthCursor]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!task.current_deadline) continue;
      if (!map[task.current_deadline]) map[task.current_deadline] = [];
      map[task.current_deadline].push(task);
    }
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate[selectedDate] || [];

  function assignedName(memberId?: string | null) {
    if (!memberId) return "Unassigned";
    return members.find((member) => member.id === memberId)?.name || "Unassigned";
  }

  return (
    <section id="calendar" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Calendar</p>
        <h2 className="mt-3 text-2xl font-semibold">Deadline calendar</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          See how tasks are spread across the month and open any day to review what is due.
        </p>
      </div>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Monthly view</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Green means done, amber means due today, red means overdue, and cyan means upcoming.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Previous
            </button>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
            {message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 md:grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label} className="rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {label}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dateKey = toDateOnly(day);
            const dayTasks = tasksByDate[dateKey] || [];
            const inMonth = day.getMonth() === monthCursor.getMonth();
            const isToday = sameDay(day, new Date());
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`min-h-28 rounded-2xl border p-3 text-left transition ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-neutral-800 bg-neutral-950/70 hover:bg-neutral-900"
                } ${inMonth ? "text-white" : "text-neutral-600"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isToday ? "text-cyan-300" : ""}`}>{day.getDate()}</span>
                  {dayTasks.length > 0 ? (
                    <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-medium text-neutral-300">
                      {dayTasks.length}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dayTasks.slice(0, 4).map((task) => (
                    <span key={task.id} className={`h-2.5 w-2.5 rounded-full ${statusDotClass(task, today)}`} />
                  ))}
                  {dayTasks.length > 4 ? (
                    <span className="text-xs text-neutral-500">+{dayTasks.length - 4}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Tasks for {selectedDate}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Review every task due on the selected day without leaving the calendar.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
            {selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {selectedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
              No tasks due on this day.
            </div>
          ) : null}

          {selectedTasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white">{task.title}</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                      {task.category || "Other"}
                    </span>
                    <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                      Assigned to: {assignedName(task.assigned_to_member_id)}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                  task.status === "done"
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : task.current_deadline === today
                    ? "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                    : task.current_deadline && task.current_deadline < today
                    ? "border border-red-500/20 bg-red-500/10 text-red-200"
                    : "border border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
                }`}>
                  {task.status === "done"
                    ? "Done"
                    : task.current_deadline === today
                    ? "Due today"
                    : task.current_deadline && task.current_deadline < today
                    ? "Overdue"
                    : "Upcoming"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
