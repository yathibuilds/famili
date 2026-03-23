"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { busyOptions, visibilityOptions, visibilityLabel } from "@/components/privacy-options";
import {
  formatDateTime,
  formatDayTitle,
  formatMonthTitle,
  formatTime,
  fromDateKey,
  monthGrid,
  toDateInputValue,
  toDateKey,
  toDateTimeLocalValue,
} from "@/components/calendar/calendar-utils";

type ProfileState = {
  display_name: string | null;
  email: string | null;
};

type CalendarRecord = {
  id: string;
  name: string;
  owner_user_id: string;
  family_id: string | null;
  visibility: "only_me" | "family" | "circle";
  busy_mode: "busy" | "free";
  color: string | null;
  is_default: boolean;
};

type EventRecord = {
  id: string;
  calendar_id: string;
  owner_user_id: string;
  family_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  visibility: "only_me" | "family" | "circle";
  busy_mode: "busy" | "free";
  start_at: string;
  end_at: string;
  source_timezone: string | null;
  all_day: boolean;
};

type TaskRecord = {
  id: string;
  title: string;
  family_id: string | null;
  owner_user_id: string;
  current_deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "done" | "cancelled";
  visibility: "only_me" | "family" | "circle";
  calendar_block_enabled: boolean;
};

type ReminderDraft = {
  offsetValue: string;
  offsetUnit: "minutes" | "hours" | "days";
};

type MessageState =
  | { type: "success" | "error" | "warning"; text: string }
  | null;

function messageClasses(type: "success" | "error" | "warning") {
  if (type === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (type === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function isTaskActiveOnDate(task: TaskRecord, dateKey: string) {
  if (task.status !== "pending") return false;

  if (task.start_date && task.end_date) {
    return task.start_date <= dateKey && task.end_date >= dateKey;
  }

  if (task.current_deadline) {
    return task.current_deadline === dateKey;
  }

  return false;
}

export function CalendarOverview({
  session,
  profile,
}: {
  session: Session;
  profile: ProfileState | null;
}) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [familyIds, setFamilyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [tab, setTab] = useState<"agenda" | "month">("agenda");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [visibility, setVisibility] = useState<"only_me" | "family" | "circle">("only_me");
  const [busyMode, setBusyMode] = useState<"busy" | "free">("busy");
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [endAt, setEndAt] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 1);
    return toDateTimeLocalValue(end);
  });
  const [reminders, setReminders] = useState<ReminderDraft[]>([
    { offsetValue: "15", offsetUnit: "minutes" },
  ]);

  const selectedDate = useMemo(() => fromDateKey(selectedDateKey), [selectedDateKey]);
  const monthDays = useMemo(() => monthGrid(monthDate), [monthDate]);

  useEffect(() => {
    void refreshCalendar();
  }, [monthDate, session.user.id]);

  useEffect(() => {
    if (!selectedCalendarId && calendars[0]) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  async function refreshCalendar() {
    setLoading(true);
    setMessage(null);

    const userId = session.user.id;
    const monthStart = monthDays[0] ?? new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = monthDays[monthDays.length - 1] ?? new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const [membershipResult, personalCalendarsResult, familyCalendarsResult, personalEventsResult, familyEventsResult, personalTasksResult, familyTasksResult] =
      await Promise.all([
        supabase.from("family_memberships").select("family_id").eq("user_id", userId),
        supabase.from("calendars").select("*").eq("owner_user_id", userId).order("created_at", { ascending: true }),
        supabase.from("calendars").select("*").not("family_id", "is", null).order("created_at", { ascending: true }),
        supabase
          .from("calendar_events")
          .select("*")
          .eq("owner_user_id", userId)
          .gte("start_at", monthStart.toISOString())
          .lte("start_at", monthEnd.toISOString())
          .order("start_at", { ascending: true }),
        supabase
          .from("calendar_events")
          .select("*")
          .not("family_id", "is", null)
          .gte("start_at", monthStart.toISOString())
          .lte("start_at", monthEnd.toISOString())
          .order("start_at", { ascending: true }),
        supabase
          .from("tasks")
          .select("*")
          .eq("owner_user_id", userId)
          .or(`current_deadline.gte.${toDateInputValue(monthStart)},start_date.gte.${toDateInputValue(monthStart)}`)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("*")
          .not("family_id", "is", null)
          .or(`current_deadline.gte.${toDateInputValue(monthStart)},start_date.gte.${toDateInputValue(monthStart)}`)
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      membershipResult.error ||
      personalCalendarsResult.error ||
      familyCalendarsResult.error ||
      personalEventsResult.error ||
      familyEventsResult.error ||
      personalTasksResult.error ||
      familyTasksResult.error;

    if (firstError) {
      setMessage({ type: "error", text: firstError.message });
      setLoading(false);
      return;
    }

    const nextFamilyIds = (membershipResult.data ?? []).map((item) => item.family_id);
    setFamilyIds(nextFamilyIds);

    const nextCalendars = [
      ...(personalCalendarsResult.data ?? []),
      ...((familyCalendarsResult.data ?? []).filter((calendar) =>
        calendar.family_id ? nextFamilyIds.includes(calendar.family_id) : false
      ) as CalendarRecord[]),
    ] as CalendarRecord[];

    const nextEvents = [
      ...(personalEventsResult.data ?? []),
      ...((familyEventsResult.data ?? []).filter((event) =>
        event.family_id ? nextFamilyIds.includes(event.family_id) : false
      ) as EventRecord[]),
    ] as EventRecord[];

    const nextTasks = [
      ...(personalTasksResult.data ?? []),
      ...((familyTasksResult.data ?? []).filter((task) =>
        task.family_id ? nextFamilyIds.includes(task.family_id) : false
      ) as TaskRecord[]),
    ] as TaskRecord[];

    setCalendars(nextCalendars);
    setEvents(nextEvents);
    setTasks(nextTasks);
    setLoading(false);
  }

  async function createDefaultCalendar() {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from("calendars").insert({
      owner_user_id: session.user.id,
      family_id: null,
      name: `${profile?.display_name || "My"} Calendar`,
      source_type: "native",
      visibility: "only_me",
      busy_mode: "busy",
      is_default: true,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({ type: "success", text: "Personal calendar created." });
    await refreshCalendar();
  }

  async function createEvent() {
    if (!eventTitle.trim()) {
      setMessage({ type: "warning", text: "Please enter an event title." });
      return;
    }
    if (!selectedCalendarId) {
      setMessage({ type: "warning", text: "Please choose a calendar first." });
      return;
    }

    const calendar = calendars.find((item) => item.id === selectedCalendarId);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const startDate = allDay
      ? new Date(`${selectedDateKey}T00:00:00`)
      : new Date(startAt);
    const endDate = allDay
      ? new Date(`${selectedDateKey}T23:59:00`)
      : new Date(endAt);

    if (endDate < startDate) {
      setMessage({ type: "warning", text: "End time must be after start time." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data: insertedEvent, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        calendar_id: selectedCalendarId,
        owner_user_id: session.user.id,
        family_id: calendar?.family_id ?? null,
        source_type: "native_event",
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        location: eventLocation.trim() || null,
        visibility,
        busy_mode: busyMode,
        scope_level: calendar?.family_id ? "family" : "individual",
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        source_timezone: timezone,
        all_day: allDay,
      })
      .select("id")
      .single();

    if (eventError || !insertedEvent) {
      setMessage({ type: "error", text: eventError?.message ?? "Could not create event." });
      setLoading(false);
      return;
    }

    const validReminders = reminders
      .filter((item) => Number(item.offsetValue) > 0)
      .map((item) => ({
        event_id: insertedEvent.id,
        offset_value: Number(item.offsetValue),
        offset_unit: item.offsetUnit,
      }));

    if (validReminders.length > 0) {
      const { error: reminderError } = await supabase
        .from("calendar_event_reminders")
        .insert(validReminders);

      if (reminderError) {
        setMessage({ type: "error", text: reminderError.message });
        setLoading(false);
        return;
      }
    }

    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setVisibility("only_me");
    setBusyMode("busy");
    setAllDay(false);
    setReminders([{ offsetValue: "15", offsetUnit: "minutes" }]);
    setMessage({ type: "success", text: "Event created." });
    await refreshCalendar();
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const event of events) {
      const key = toDateKey(new Date(event.start_at));
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const task of tasks) {
      for (const day of monthDays) {
        const key = toDateKey(day);
        if (isTaskActiveOnDate(task, key)) {
          const existing = map.get(key) ?? [];
          existing.push(task);
          map.set(key, existing);
        }
      }
    }
    return map;
  }, [monthDays, tasks]);

  const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? [];
  const selectedDayTasks = tasksByDate.get(selectedDateKey) ?? [];

  return (
    <section id="calendar" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Calendar
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Unified planning view</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Personal calendars, shared family calendars, and due tasks now appear in one place.
          Tasks stay deadline-first and show as compact due indicators instead of all-day blocks.
        </p>
      </div>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClasses(message.type)}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Mini month</h3>
                <p className="mt-1 text-sm text-neutral-400">{formatMonthTitle(monthDate)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
                  className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
                >
                  Prev
                </button>
                <button
                  onClick={() => setMonthDate(new Date())}
                  className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
                >
                  Today
                </button>
                <button
                  onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
                  className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const dayKey = toDateKey(day);
                const isSelected = dayKey === selectedDateKey;
                const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                const dayEvents = eventsByDate.get(dayKey) ?? [];
                const dayTasks = tasksByDate.get(dayKey) ?? [];

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDateKey(dayKey)}
                    className={`min-h-20 rounded-2xl border p-2 text-left transition ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10"
                        : "border-neutral-800 bg-neutral-950/70 hover:bg-neutral-900"
                    }`}
                  >
                    <div className={`text-sm font-medium ${isCurrentMonth ? "text-white" : "text-neutral-600"}`}>
                      {day.getDate()}
                    </div>
                    <div className="mt-2 space-y-1 text-[11px]">
                      {dayTasks.length > 0 ? (
                        <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                          Tasks due: {dayTasks.length}
                        </div>
                      ) : null}
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="truncate rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-200"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 ? (
                        <div className="text-neutral-500">+{dayEvents.length - 2} more</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <h3 className="text-lg font-semibold text-white">Create event</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Create native events now. Shared scheduling and email sync can build on this.
            </p>

            <div className="mt-5 space-y-4">
              {calendars.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
                  You do not have a calendar yet.
                  <button
                    onClick={() => void createDefaultCalendar()}
                    className="mt-3 block rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
                  >
                    Create my calendar
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Calendar</label>
                    <select
                      value={selectedCalendarId}
                      onChange={(event) => setSelectedCalendarId(event.target.value)}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    >
                      {calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>
                          {calendar.name} · {visibilityLabel(calendar.visibility)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Title</label>
                    <input
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      placeholder="Family dinner"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Visibility</label>
                      <select
                        value={visibility}
                        onChange={(event) => setVisibility(event.target.value as "only_me" | "family" | "circle")}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      >
                        {visibilityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Busy mode</label>
                      <select
                        value={busyMode}
                        onChange={(event) => setBusyMode(event.target.value as "busy" | "free")}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      >
                        {busyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(event) => setAllDay(event.target.checked)}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-cyan-400 focus:ring-cyan-400"
                    />
                    All-day event
                  </label>

                  {allDay ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-200">Date</label>
                      <input
                        type="date"
                        value={selectedDateKey}
                        onChange={(event) => setSelectedDateKey(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Start</label>
                        <input
                          type="datetime-local"
                          value={startAt}
                          onChange={(event) => setStartAt(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">End</label>
                        <input
                          type="datetime-local"
                          value={endAt}
                          onChange={(event) => setEndAt(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Description</label>
                    <textarea
                      value={eventDescription}
                      onChange={(event) => setEventDescription(event.target.value)}
                      placeholder="Add details"
                      className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Location</label>
                    <input
                      value={eventLocation}
                      onChange={(event) => setEventLocation(event.target.value)}
                      placeholder="Optional location"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-200">Reminders</label>
                      <button
                        type="button"
                        onClick={() =>
                          setReminders((prev) => [...prev, { offsetValue: "10", offsetUnit: "minutes" }])
                        }
                        className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
                      >
                        + Add reminder
                      </button>
                    </div>

                    {reminders.map((reminder, index) => (
                      <div key={`${index}-${reminder.offsetUnit}`} className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_120px]">
                        <input
                          type="number"
                          min="1"
                          value={reminder.offsetValue}
                          onChange={(event) =>
                            setReminders((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, offsetValue: event.target.value } : item
                              )
                            )
                          }
                          className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                        <select
                          value={reminder.offsetUnit}
                          onChange={(event) =>
                            setReminders((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, offsetUnit: event.target.value as "minutes" | "hours" | "days" }
                                  : item
                              )
                            )
                          }
                          className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          <option value="minutes">minutes before</option>
                          <option value="hours">hours before</option>
                          <option value="days">days before</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setReminders((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                          className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white transition hover:bg-neutral-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => void createEvent()}
                    disabled={loading || !eventTitle.trim() || !selectedCalendarId}
                    className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Create event"}
                  </button>
                </>
              )}
            </div>
          </section>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Detailed view</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {formatDayTitle(selectedDate)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTab("agenda")}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    tab === "agenda"
                      ? "bg-cyan-400 text-neutral-950"
                      : "border border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800"
                  }`}
                >
                  Agenda
                </button>
                <button
                  onClick={() => setTab("month")}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    tab === "month"
                      ? "bg-cyan-400 text-neutral-950"
                      : "border border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {tab === "agenda" ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-100">Tasks due</p>
                  {selectedDayTasks.length === 0 ? (
                    <p className="mt-2 text-sm text-amber-200/80">No due tasks for this day.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedDayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-amber-500/20 bg-neutral-950/40 px-4 py-3 text-sm text-amber-100"
                        >
                          <p className="font-medium">{task.title}</p>
                          <p className="mt-1 text-xs text-amber-200/80">
                            Deadline-first task • shown as a compact due item
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
                  <p className="text-sm font-medium text-white">Events</p>
                  {selectedDayEvents.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-400">No events scheduled yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedDayEvents.map((event) => (
                        <article
                          key={event.id}
                          className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white">{event.title}</h4>
                              <p className="mt-1 text-xs text-neutral-400">
                                {event.all_day
                                  ? "All day"
                                  : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`}
                              </p>
                              {event.description ? (
                                <p className="mt-2 text-sm leading-6 text-neutral-300">
                                  {event.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300">
                                {visibilityLabel(event.visibility)}
                              </span>
                              <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300">
                                {event.busy_mode === "busy" ? "Busy" : "Free"}
                              </span>
                            </div>
                          </div>

                          {event.location ? (
                            <p className="mt-3 text-sm text-neutral-400">Location: {event.location}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {monthDays
                  .filter((day) => day.getMonth() === monthDate.getMonth())
                  .map((day) => {
                    const dayKey = toDateKey(day);
                    const dayEvents = eventsByDate.get(dayKey) ?? [];
                    const dayTasks = tasksByDate.get(dayKey) ?? [];

                    return (
                      <article
                        key={dayKey}
                        className={`rounded-2xl border p-4 ${
                          dayKey === selectedDateKey
                            ? "border-cyan-400/40 bg-cyan-500/10"
                            : "border-neutral-800 bg-neutral-950/70"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedDateKey(dayKey)}
                          className="text-left"
                        >
                          <p className="text-sm font-semibold text-white">{formatDayTitle(day)}</p>
                        </button>

                        <div className="mt-3 space-y-2">
                          {dayTasks.length > 0 ? (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                              Tasks due: {dayTasks.length}
                            </div>
                          ) : null}

                          {dayEvents.length === 0 && dayTasks.length === 0 ? (
                            <p className="text-sm text-neutral-500">Nothing planned yet.</p>
                          ) : null}

                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200"
                            >
                              <p className="font-medium">{event.title}</p>
                              <p className="mt-1 opacity-80">
                                {event.all_day ? "All day" : formatDateTime(event.start_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
              </div>
            )}
          </section>
        </section>
      </div>
    </section>
  );
}
