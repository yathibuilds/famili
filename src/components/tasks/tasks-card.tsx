"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  assigned_to_label: string | null;
  status: string;
  current_deadline: string | null;
};

export function TasksCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setTasks(data || []);
  }

  async function addTask() {
    if (!title) return;

    const user = (await supabase.auth.getUser()).data.user;

    await supabase.from("tasks").insert({
      title,
      assigned_to_label: assignee,
      original_deadline: deadline || null,
      current_deadline: deadline || null,
      created_by: user?.id,
    });

    setTitle("");
    setAssignee("");
    setDeadline("");

    loadTasks();
  }

  async function markDone(id: string) {
    await supabase
      .from("tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    loadTasks();
  }

  return (
    <div className="space-y-4">
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

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <button onClick={addTask}>Add Task</button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="border p-2">
            <p>{task.title}</p>

            {task.assigned_to_label && (
              <p>Assigned to: {task.assigned_to_label}</p>
            )}

            {task.current_deadline && (
              <p>Due: {task.current_deadline}</p>
            )}

            {task.status !== "done" && (
              <button onClick={() => markDone(task.id)}>
                Mark Done
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
