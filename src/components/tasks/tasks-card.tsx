"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  assigned_to_label: string | null;
  assigned_to_member_id: string | null;
  status: string;
  current_deadline: string | null;
  original_deadline: string | null;
  deadline_revision_count: number;
  category: string | null;
  completed_at: string | null;
};

type Member = {
  id: string;
  name: string;
};

type FilterType = "all" | "pending" | "done";

const categories = [
  "Groceries","Bills","Travel","School","Health","Home",
  "Purchase","Service","Admin","Personal","Family","Other"
];

export function TasksCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  useEffect(() => {
    loadTasks();
    loadMembers();
  }, []);

  async function loadMembers() {
    const { data } = await supabase.from("family_members").select("id,name");
    setMembers(data || []);
  }

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  async function addTask() {
    if (!title) return;

    await supabase.from("tasks").insert({
      title,
      category,
      current_deadline: deadline || null,
      original_deadline: deadline || null,
      assigned_to_member_id: selectedMemberId || null
    });

    setTitle("");
    setDeadline("");
    setSelectedMemberId("");
    loadTasks();
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: "bold" }}>Tasks</h2>

      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        >
          <option value="">Assign member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <button onClick={addTask} style={{ padding: 12, width: "100%" }}>
          Add Task
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10 }}>
            <strong>{t.title}</strong>
            <p>{t.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
