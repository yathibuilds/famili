"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toDateTimeLocalValue } from "@/components/calendar/calendar-utils";

type ProfileState = {
  display_name: string | null;
  email: string | null;
};

type TaskRecord = {
  id: string;
  title: string;
  family_id: string | null;
  owner_user_id: string;
  current_deadline: string | null;
  status: "pending" | "done" | "cancelled";
  calendar_block_enabled: boolean;
  calendar_block_start_at: string | null;
  calendar_block_end_at: string | null;
};

type CalendarRecord = {
  id: string;
  owner_user_id: string;
  family_id: string | null;
  name: string;
};

type MessageState =
  | { type: "success" | "error" | "warning"; text: string }
  | null;

function messageClasses(type: "success" | "error" | "warning") {
  if (type === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (type === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export function TaskCalendarPanel({
  session,
}: {
  session: Session;
  profile: ProfileState | null;
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [message, setMessage] = useState<MessageState>(null);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { start: string; end: string; calendarId: string }>>({});

  useEffect(() => {
    void refreshData();
  }, [session.user.id]);

  async function refreshData() {
    setLoading(true);
    setMessage(null);

    const userId = session.user.id;
    const [tasksResult, calendarsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("owner_user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("calendars")
        .select("id,owner_user_id,family_id,name")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: true }),
    ]);

    if (tasksResult.error || calendarsResult.error) {
      setMessage({ type: "error", text: tasksResult.error?.message || calendarsResult.error?.message || "Unable to load task blocking." });
      setLoading(false);
      return;
    }

    const nextTasks = (tasksResult.data ?? []) as TaskRecord[];
    const nextCalendars = (calendarsResult.data ?? []) as CalendarRecord[];

    const nextDrafts: Record<string, { start: string; end: string; calendarId: string }> = {};
    for (const task of nextTasks) {
      const start = task.calendar_block_start_at
        ? toDateTimeLocalValue(new Date(task.calendar_block_start_at))
        : toDateTimeLocalValue(new Date());
      const end = task.calendar_block_end_at
        ? toDateTimeLocalValue(new Date(task.calendar_block_end_at))
        : toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));
      nextDrafts[task.id] = {
        start,
        end,
        calendarId: nextCalendars[0]?.id ?? "",
      };
    }

    setTasks(nextTasks);
    setCalendars(nextCalendars);
    setDrafts(nextDrafts);
    setLoading(false);
  }

  async function saveTaskBlock(task: TaskRecord) {
    const draft = drafts[task.id];
    if (!draft?.calendarId) {
      setMessage({ type: "warning", text: "Create a personal calendar first." });
      return;
    }

    const start = new Date(draft.start);
    const end = new Date(draft.end);

    if (end <= start) {
      setMessage({ type: "warning", text: "Task block end time must be after start time." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        calendar_block_enabled: true,
        calendar_block_start_at: start.toISOString(),
        calendar_block_end_at: end.toISOString(),
        calendar_block_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .eq("id", task.id);

    if (taskError) {
      setMessage({ type: "error", text: taskError.message });
      setLoading(false);
      return;
    }

    const { data: existingEvent, error: existingError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("source_type", "task_block")
      .eq("source_task_id", task.id)
      .maybeSingle();

    if (existingError) {
      setMessage({ type: "error", text: existingError.message });
      setLoading(false);
      return;
    }

    if (existingEvent?.id) {
      const { error: updateError } = await supabase
        .from("calendar_events")
        .update({
          calendar_id: draft.calendarId,
          title: task.title,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          busy_mode: "busy",
          visibility: "only_me",
        })
        .eq("id", existingEvent.id);

      if (updateError) {
        setMessage({ type: "error", text: updateError.message });
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("calendar_events").insert({
        calendar_id: draft.calendarId,
        owner_user_id: session.user.id,
        family_id: task.family_id,
        source_type: "task_block",
        source_task_id: task.id,
        title: task.title,
        description: "Blocked from task",
        visibility: "only_me",
        busy_mode: "busy",
        scope_level: task.family_id ? "family" : "individual",
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        source_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        all_day: false,
      });

      if (insertError) {
        setMessage({ type: "error", text: insertError.message });
        setLoading(false);
        return;
      }
    }

    setMessage({ type: "success", text: "Task block saved to calendar." });
    await refreshData();
  }

  return (
    <section id="task-blocking" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Task blocking
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Reserve time for important tasks</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Tasks stay deadline-first, but you can optionally block calendar time for execution and reminders.
        </p>
      </div>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClasses(message.type)}`}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="grid gap-4">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
              No pending tasks available for blocking yet.
            </div>
          ) : null}

          {tasks.map((task) => {
            const draft = drafts[task.id];
            return (
              <article key={task.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    <p className="mt-1 text-xs text-neutral-400">
                      {task.current_deadline ? `Deadline: ${task.current_deadline}` : "No deadline"} •
                      {task.calendar_block_enabled ? " calendar block active" : " no calendar block yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Calendar</label>
                    <select
                      value={draft?.calendarId ?? ""}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [task.id]: { ...(prev[task.id] || { start: "", end: "", calendarId: "" }), calendarId: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    >
                      <option value="">Select calendar</option>
                      {calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>
                          {calendar.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Start</label>
                    <input
                      type="datetime-local"
                      value={draft?.start ?? ""}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [task.id]: { ...(prev[task.id] || { start: "", end: "", calendarId: "" }), start: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">End</label>
                    <input
                      type="datetime-local"
                      value={draft?.end ?? ""}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [task.id]: { ...(prev[task.id] || { start: "", end: "", calendarId: "" }), end: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </div>
                </div>

                <button
                  onClick={() => void saveTaskBlock(task)}
                  disabled={loading}
                  className="mt-4 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save task block"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
