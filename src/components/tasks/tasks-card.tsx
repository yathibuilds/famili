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

const styles = {
  page: {
    display: "grid",
    gap: "16px",
    color: "#0f172a",
  } as React.CSSProperties,
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    color: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
  } as React.CSSProperties,
  heroTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
  } as React.CSSProperties,
  heroText: {
    margin: "8px 0 0 0",
    color: "#dbeafe",
    fontSize: "14px",
  } as React.CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    background: "#ffffff",
    padding: "18px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  } as React.CSSProperties,
  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
  } as React.CSSProperties,
  sectionText: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#475569",
  } as React.CSSProperties,
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  } as React.CSSProperties,
  statCard: {
    borderRadius: "18px",
    padding: "16px",
  } as React.CSSProperties,
  formGrid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: "14px",
  } as React.CSSProperties,
  full: {
    gridColumn: "1 / -1",
  } as React.CSSProperties,
  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
  } as React.CSSProperties,
  buttonPrimary: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  buttonSecondary: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "8px 12px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
  } as React.CSSProperties,
  helperText: {
    margin: "10px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  } as React.CSSProperties,
  list: {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
  } as React.CSSProperties,
  taskCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "14px",
  } as React.CSSProperties,
  taskTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  } as React.CSSProperties,
  taskTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  } as React.CSSProperties,
  metaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px",
  } as React.CSSProperties,
  tag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#f1f5f9",
    color: "#334155",
  } as React.CSSProperties,
  empty: {
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "14px",
    color: "#64748b",
    background: "#f8fafc",
  } as React.CSSProperties,
};

export function TasksCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    void loadTasks();
    void loadMembers();
  }, []);

  async function loadMembers() {
    const { data } = await supabase.from("family_members").select("id,name");
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

  function getAssignedName(task: Task) {
    if (task.assigned_to_member_id) {
      const member = members.find((m) => m.id === task.assigned_to_member_id);
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

  function timingTag(task: Task) {
    if (task.status === "done") {
      return <span style={{ ...styles.tag, background: "#ecfdf5", color: "#065f46" }}>Done</span>;
    }
    const timing = getTiming(task);
    if (timing == "overdue") {
      return <span style={{ ...styles.tag, background: "#fef2f2", color: "#991b1b" }}>Overdue</span>;
    }
    if (timing == "today") {
      return <span style={{ ...styles.tag, background: "#fff7ed", color: "#9a3412" }}>Due today</span>;
    }
    return <span style={{ ...styles.tag, background: "#eff6ff", color: "#1d4ed8" }}>Upcoming</span>;
  }

  const summary = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let pending = 0;
    let done = 0;

    for (const task of tasks) {
      if (task.status === "done") {
        done++;
      } else {
        pending++;
        const timing = getTiming(task);
        if (timing === "overdue") overdue++;
        if (timing === "today") dueToday++;
      }
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
    if (filter === "pending") filtered = filtered.filter((t) => t.status !== "done");
    if (filter === "done") filtered = filtered.filter((t) => t.status === "done");
    if (selectedCategory) filtered = filtered.filter((t) => (t.category || "Other") === selectedCategory);
    return filtered;
  }, [tasks, filter, selectedCategory]);

  return (
    <div style={styles.page} id="tasks">
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Tasks</h2>
        <p style={styles.heroText}>
          Keep tasks readable, consistent, and easy to scan alongside the rest of the app.
        </p>
      </div>

      <div style={styles.statsGrid}>
        {[
          { label: "Overdue", value: summary.overdue, bg: "#fef2f2", color: "#991b1b" },
          { label: "Due today", value: summary.dueToday, bg: "#fff7ed", color: "#9a3412" },
          { label: "Pending", value: summary.pending, bg: "#eff6ff", color: "#1d4ed8" },
          { label: "Done", value: summary.done, bg: "#ecfdf5", color: "#065f46" },
        ].map((item) => (
          <div key={item.label} style={{ ...styles.statCard, background: item.bg }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: item.color }}>{item.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: item.color, marginTop: "8px" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Add task</h3>
        <p style={styles.sectionText}>Use the same clean flow and visual language as Members and 2FA.</p>

        <div style={styles.formGrid}>
          <div style={styles.full}>
            <label style={styles.label}>Task title</label>
            <input
              style={styles.input}
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Assign to</label>
            <select
              style={styles.input}
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">Assign member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Category</label>
            <select
              style={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Deadline</label>
            <input
              style={styles.input}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {selectedMemberId && (
          <p style={styles.helperText}>
            Assigned to: {members.find((m) => m.id === selectedMemberId)?.name}
          </p>
        )}

        <div style={{ marginTop: "14px" }}>
          <button style={styles.buttonPrimary} onClick={() => void addTask()}>
            Add Task
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Browse tasks</h3>
        <p style={styles.sectionText}>Filter without changing any task logic.</p>

        <div style={styles.filters}>
          {(["all", "pending", "done"] as FilterType[]).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                ...styles.buttonSecondary,
                background: filter === item ? "#0f172a" : "#ffffff",
                color: filter === item ? "#ffffff" : "#0f172a",
                borderColor: filter === item ? "#0f172a" : "#cbd5e1",
              }}
            >
              {item === "all" ? "All" : item === "pending" ? "Pending" : "Done"}
            </button>
          ))}
        </div>

        <div style={styles.filters}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              ...styles.buttonSecondary,
              background: selectedCategory === null ? "#0f172a" : "#ffffff",
              color: selectedCategory === null ? "#ffffff" : "#0f172a",
              borderColor: selectedCategory === null ? "#0f172a" : "#cbd5e1",
            }}
          >
            All Categories
          </button>

          {Object.entries(categorySummary).map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.buttonSecondary,
                background: selectedCategory === cat ? "#0f172a" : "#ffffff",
                color: selectedCategory === cat ? "#ffffff" : "#0f172a",
                borderColor: selectedCategory === cat ? "#0f172a" : "#cbd5e1",
              }}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Task list</h3>
        <p style={styles.sectionText}>A unified card style for pending and completed tasks.</p>

        <div style={styles.list}>
          {visibleTasks.length === 0 && <div style={styles.empty}>No tasks in this view.</div>}

          {visibleTasks.map((task) => (
            <div key={task.id} style={styles.taskCard}>
              <div style={styles.taskTop}>
                <p style={styles.taskTitle}>{task.title}</p>
                {timingTag(task)}
              </div>

              <div style={styles.metaRow}>
                <span style={styles.tag}>{task.category || "Other"}</span>
                <span style={styles.tag}>Assigned to: {getAssignedName(task)}</span>
                {task.current_deadline && (
                  <span style={styles.tag}>Due: {formatDate(task.current_deadline)}</span>
                )}
                {!!task.deadline_revision_count && task.deadline_revision_count > 0 && (
                  <span style={styles.tag}>Revised {task.deadline_revision_count} times</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
