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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Could not find signed-in user.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      assigned_to_label: assignee || null,
      original_deadline: deadline || null,
      current_deadline: deadline || null,
      category,
      created_by: user.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setAssignee("");
    setDeadline("");
    setCategory("Other");
    setMessage("Task added.");

    await loadTasks();
  }

  async function markDone(id: string) {
    setMessage("");

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

    setMessage("Task marked done.");
    await loadTasks();
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setNewDeadline(task.current_deadline || "");
    setMessage("");
  }

  async function saveNewDeadline(task: Task) {
    if (!newDeadline) {
      setMessage("Please choose a new deadline.");
      return;
    }

    setMessage("");

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
    setMessage("Deadline updated.");

    await loadTasks();
  }

  function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getTaskTiming(task: Task) {
    if (!task.current_deadline || task.status === "done") {
      return "none";
    }

    const today = getTodayString();

    if (task.current_deadline < today) {
      return "overdue";
    }

    if (task.current_deadline === today) {
      return "today";
    }

    return "upcoming";
  }

  function getTaskCardStyle(task: Task) {
    const timing = getTaskTiming(task);

    if (task.status === "done") {
      return {
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: "16px",
      };
    }

    if (timing === "overdue") {
      return {
        border: "1px solid rgba(255, 99, 132, 0.8)",
        background: "rgba(255, 99, 132, 0.08)",
        borderRadius: "16px",
      };
    }

    if (timing === "today") {
      return {
        border: "1px solid rgba(255, 205, 86, 0.8)",
        background: "rgba(255, 205, 86, 0.08)",
        borderRadius: "16px",
      };
    }

    return {
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "16px",
    };
  }

  function getTaskTimingLabel(task: Task) {
    const timing = getTaskTiming(task);

    if (task.status === "done") return "Completed";
    if (timing === "overdue") return "Overdue";
    if (timing === "today") return "Due today";
    if (timing === "upcoming") return "Upcoming";

    return "";
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
        done += 1;
        continue;
      }

      pending += 1;

      const timing = getTaskTiming(task);
      if (timing === "overdue") overdue += 1;
      if (timing === "today") dueToday += 1;
    }

    return { overdue, dueToday, pending, done };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === "pending") return task.status !== "done";
      if (filter === "done") return task.status === "done";
      return true;
    });

    return filtered.sort((a, b) => {
      const rankDifference = getSortRank(a) - getSortRank(b);
      if (rankDifference !== 0) return rankDifference;

      const aDeadline = a.current_deadline || "9999-12-31";
      const bDeadline = b.current_deadline || "9999-12-31";

      return aDeadline.localeCompare(bDeadline);
    });
  }, [tasks, filter]);

  return (
    <div className="space-y-4" id="tasks">
      <h2>Tasks</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255, 99, 132, 0.5)",
            background: "rgba(255, 99, 132, 0.08)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <p>Overdue</p>
          <h3>{summary.overdue}</h3>
        </div>

        <div
          style={{
            border: "1px solid rgba(255, 205, 86, 0.5)",
            background: "rgba(255, 205, 86, 0.08)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <p>Due today</p>
          <h3>{summary.dueToday}</h3>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <p>Pending</p>
          <h3>{summary.pending}</h3>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <p>Done</p>
          <h3>{summary.done}</h3>
        </div>
      </div>

      <div className="space-y-2">
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Assign to (optional)"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <button onClick={addTask}>Add Task</button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("pending")}>Pending</button>
        <button onClick={() => setFilter("done")}>Done</button>
      </div>

      {message && <p>{message}</p>}

      <div className="space-y-2">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="p-3 space-y-1"
            style={getTaskCardStyle(task)}
          >
            <p>{task.title}</p>

            {getTaskTimingLabel(task) && <p>{getTaskTimingLabel(task)}</p>}

            {task.category && <p>Category: {task.category}</p>}

            {task.assigned_to_label && (
              <p>Assigned to: {task.assigned_to_label}</p>
            )}

            {task.current_deadline && <p>Due: {task.current_deadline}</p>}

            {task.deadline_revision_count > 0 && (
              <p>Revised {task.deadline_revision_count} times</p>
            )}

            {editingTaskId === task.id ? (
              <div className="space-y-1">
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
                <button onClick={() => void saveNewDeadline(task)}>Save</button>
              </div>
            ) : task.status !== "done" ? (
              <button onClick={() => startEdit(task)}>Edit Deadline</button>
            ) : null}

            {task.status !== "done" && (
              <button onClick={() => void markDone(task.id)}>Mark Done</button>
            )}
          </div>
        ))}

        {visibleTasks.length === 0 && <p>No tasks in this view yet.</p>}
      </div>
    </div>
  );
}
