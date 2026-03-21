"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="space-y-4" id="tasks">
      <h2>Tasks</h2>

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

      {message && <p>{message}</p>}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="border p-2 space-y-1">
            <p>{task.title}</p>

            {task.category && <p>Category: {task.category}</p>}

            {task.assigned_to_label && <p>Assigned to: {task.assigned_to_label}</p>}

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
            ) : (
              <button onClick={() => startEdit(task)}>Edit Deadline</button>
            )}

            {task.status !== "done" && (
              <button onClick={() => void markDone(task.id)}>Mark Done</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
