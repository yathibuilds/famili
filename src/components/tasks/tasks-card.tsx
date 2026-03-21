"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  assigned_to_label: string | null;
  status: string;
  current_deadline: string | null;
  original_deadline: string | null;
  deadline_revision_count: number;
  category: string | null;
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

export function TasksCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Other");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    void loadTasks();
  }, []);

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
    if (!title.trim()) {
      setMessage("Please enter a task title.");
      return;
    }

    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("tasks").insert({
      title,
      assigned_to_label: assignee || null,
      original_deadline: deadline || null,
      current_deadline: deadline || null,
      category,
      created_by: user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setAssignee("");
    setDeadline("");
    setCategory("Other");

    await loadTasks();
  }

  async function markDone(id: string) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadTasks();
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setNewDeadline(task.current_deadline || "");
  }

  async function saveNewDeadline(task: Task) {
    if (!newDeadline) return;

    const updatedCount = (task.deadline_revision_count || 0) + 1;

    const { error } = await supabase
      .from("tasks")
      .update({
        current_deadline: newDeadline,
        deadline_revision_count: updatedCount,
      })
      .eq("id", task.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingTaskId(null);
    setNewDeadline("");
    await loadTasks();
  }

  function getTodayString() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  function getTaskTiming(task: Task) {
    if (!task.current_deadline || task.status === "done") return "none";

    const today = getTodayString();

    if (task.current_deadline < today) return "overdue";
    if (task.current_deadline === today) return "today";
    return "upcoming";
  }

  function getSortRank(task: Task) {
    const timing = getTaskTiming(task);

    if (task.status !== "done" && timing === "overdue") return 1;
    if (task.status !== "done" && timing === "today") return 2;
    if (task.status !== "done" && timing === "upcoming") return 3;
    if (task.status !== "done") return 4;
    return 5;
  }

  const summary = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let pending = 0;
    let done = 0;

    for (const task of tasks) {
      if (task.status === "done") {
        done++;
        continue;
      }

      pending++;

      const timing = getTaskTiming(task);
      if (timing === "overdue") overdue++;
      if (timing === "today") dueToday++;
    }

    return { overdue, dueToday, pending, done };
  }, [tasks]);

  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};

    for (const task of tasks) {
      const cat = task.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    }

    return map;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    let filtered = tasks;

    if (filter === "pending") {
      filtered = filtered.filter((t) => t.status !== "done");
    } else if (filter === "done") {
      filtered = filtered.filter((t) => t.status === "done");
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (t) => (t.category || "Other") === selectedCategory
      );
    }

    return filtered.sort((a, b) => {
      const rank = getSortRank(a) - getSortRank(b);
      if (rank !== 0) return rank;

      const aDeadline = a.current_deadline || "9999-12-31";
      const bDeadline = b.current_deadline || "9999-12-31";

      return aDeadline.localeCompare(bDeadline);
    });
  }, [tasks, filter, selectedCategory]);

  return (
    <div className="space-y-4" id="tasks">
      <h2>Tasks</h2>

      {/* Summary */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div>Overdue: {summary.overdue}</div>
        <div>Today: {summary.dueToday}</div>
        <div>Pending: {summary.pending}</div>
        <div>Done: {summary.done}</div>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => setSelectedCategory(null)}>All Categories</button>

        {Object.entries(categorySummary).map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat} ({count})
          </button>
        ))}
      </div>

      {/* Create */}
      <div className="space-y-2">
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Assign to"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <button onClick={addTask}>Add Task</button>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("pending")}>Pending</button>
        <button onClick={() => setFilter("done")}>Done</button>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {visibleTasks.map((task) => (
          <div key={task.id} className="border p-2 space-y-1">
            <p>{task.title}</p>
            <p>{task.category}</p>

            {task.current_deadline && <p>Due: {task.current_deadline}</p>}

            {task.deadline_revision_count > 0 && (
              <p>Revised {task.deadline_revision_count} times</p>
            )}

            {editingTaskId === task.id ? (
              <>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
                <button onClick={() => saveNewDeadline(task)}>Save</button>
              </>
            ) : (
              <button onClick={() => startEdit(task)}>Edit Deadline</button>
            )}

            {task.status !== "done" && (
              <button onClick={() => markDone(task.id)}>Done</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
