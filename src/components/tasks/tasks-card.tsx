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
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState("");
  const [editingAssignmentTaskId, setEditingAssignmentTaskId] = useState<string | null>(null);
  const [editingAssignedMemberId, setEditingAssignedMemberId] = useState("");
  const [editingCategoryTaskId, setEditingCategoryTaskId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("Other");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    void loadTasks();
    void loadMembers();
  }, []);

  async function getFamilyId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data, error } = await supabase
      .from("families")
      .select("id")
      .eq("created_by", user.id)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      return null;
    }

    return data?.id ?? null;
  }

  async function loadMembers() {
    const familyId = await getFamilyId();

    if (!familyId) {
      setMembers([]);
      return;
    }

    const { data, error } = await supabase
      .from("family_members")
      .select("id, name")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  }

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

    const payload = {
      title,
      original_deadline: deadline || null,
      current_deadline: deadline || null,
      category,
      created_by: user.id,
      assigned_to_member_id: selectedMemberId || null,
      assigned_to_label: null,
    };

    const { error } = await supabase.from("tasks").insert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setDeadline("");
    setCategory("Other");
    setSelectedMemberId("");
    setMessage("Task added.");

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

    setMessage("Task marked done.");
    await loadTasks();
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setNewDeadline(task.current_deadline || "");
  }

  async function saveNewDeadline(task: Task) {
    if (!newDeadline) {
      setMessage("Please choose a new deadline.");
      return;
    }

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

  function startAssignmentEdit(task: Task) {
    setEditingAssignmentTaskId(task.id);
    setEditingAssignedMemberId(task.assigned_to_member_id || "");
  }

  async function saveAssignment(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_to_member_id: editingAssignedMemberId || null,
        assigned_to_label: null,
      })
      .eq("id", taskId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingAssignmentTaskId(null);
    setEditingAssignedMemberId("");
    setMessage("Assignment updated.");
    await loadTasks();
  }

  function startCategoryEdit(task: Task) {
    setEditingCategoryTaskId(task.id);
    setEditingCategoryValue(task.category || "Other");
  }

  async function saveCategory(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .update({
        category: editingCategoryValue || "Other",
      })
      .eq("id", taskId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingCategoryTaskId(null);
    setEditingCategoryValue("Other");
    setMessage("Category updated.");
    await loadTasks();
  }

  function getTodayString() {
    return new Date().toISOString().split("T")[0];
  }

  function getTaskTiming(task: Task) {
    if (!task.current_deadline || task.status === "done") return "none";

    const today = getTodayString();

    if (task.current_deadline < today) return "overdue";
    if (task.current_deadline === today) return "today";
    return "upcoming";
  }

  function getCompletionLabel(task: Task) {
    if (task.status !== "done") return "";

    if (!task.completed_at) return "Completed";
    if (!task.current_deadline) return "Completed";

    const completedDate = task.completed_at.split("T")[0];

    if (completedDate < task.current_deadline) return "Completed before deadline";
    if (completedDate === task.current_deadline) return "Completed on time";
    return "Completed late";
  }

  function getSortRank(task: Task) {
    const timing = getTaskTiming(task);

    if (task.status !== "done" && timing === "overdue") return 1;
    if (task.status !== "done" && timing === "today") return 2;
    if (task.status !== "done" && timing === "upcoming") return 3;
    if (task.status !== "done") return 4;
    return 5;
  }

  function getAssignedName(task: Task) {
    if (task.assigned_to_member_id) {
      const member = members.find((item) => item.id === task.assigned_to_member_id);
      if (member?.name) return member.name;
    }

    if (task.assigned_to_label) return task.assigned_to_label;

    return "Unassigned";
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

  const insightSummary = useMemo(() => {
    let revised = 0;
    let completedOnTime = 0;
    let completedLate = 0;

    for (const task of tasks) {
      if ((task.deadline_revision_count || 0) > 0) {
        revised++;
      }

      const label = getCompletionLabel(task);
      if (label === "Completed before deadline" || label === "Completed on time") {
        completedOnTime++;
      }
      if (label === "Completed late") {
        completedLate++;
      }
    }

    return { revised, completedOnTime, completedLate };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    let filtered = tasks;

    if (filter === "pending") {
      filtered = filtered.filter((t) => t.status !== "done");
    } else if (filter === "done") {
      filtered = filtered.filter((t) => t.status === "done");
    }

    if (selectedCategory) {
      filtered = filtered.filter((t) => (t.category || "Other") === selectedCategory);
    }

    return [...filtered].sort((a, b) => {
      const rank = getSortRank(a) - getSortRank(b);
      if (rank !== 0) return rank;

      const aDeadline = a.current_deadline || "9999-12-31";
      const bDeadline = b.current_deadline || "9999-12-31";

      return aDeadline.localeCompare(bDeadline);
    });
  }, [tasks, filter, selectedCategory]);

  const pendingTasks = visibleTasks.filter((task) => task.status !== "done");
  const completedTasks = visibleTasks.filter((task) => task.status === "done");

  return (
    <div className="space-y-4" id="tasks">
      <h2>Tasks</h2>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div>Overdue: {summary.overdue}</div>
        <div>Today: {summary.dueToday}</div>
        <div>Pending: {summary.pending}</div>
        <div>Done: {summary.done}</div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div>Revised tasks: {insightSummary.revised}</div>
        <div>Completed on time: {insightSummary.completedOnTime}</div>
        <div>Completed late: {insightSummary.completedLate}</div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => setSelectedCategory(null)}>All Categories</button>

        {Object.entries(categorySummary).map(([cat, count]) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}>
            {cat} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />

        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }}
        >
          <option value="">Assign to member (optional)</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        {selectedMemberId && (
          <p style={{ fontSize: "14px" }}>
            Assigned to: {members.find((m) => m.id === selectedMemberId)?.name}
          </p>
        )}

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

        <button onClick={() => void addTask()}>Add Task</button>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("pending")}>Pending</button>
        <button onClick={() => setFilter("done")}>Done</button>
      </div>

      {message && <p>{message}</p>}

      <div className="space-y-2">
        <h3>Pending Tasks</h3>

        {pendingTasks.length === 0 && <p>No pending tasks in this view.</p>}

        {pendingTasks.map((task) => (
          <div key={task.id} className="border p-2 space-y-2">
            <p>{task.title}</p>

            {editingCategoryTaskId === task.id ? (
              <>
                <select value={editingCategoryValue} onChange={(e) => setEditingCategoryValue(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button onClick={() => void saveCategory(task.id)}>Save Category</button>
              </>
            ) : (
              <>
                <p>{task.category || "Other"}</p>
                <button onClick={() => startCategoryEdit(task)}>Edit Category</button>
              </>
            )}

            {editingAssignmentTaskId === task.id ? (
              <>
                <select
                  value={editingAssignedMemberId}
                  onChange={(e) => setEditingAssignedMemberId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => void saveAssignment(task.id)}>Save Assignment</button>
              </>
            ) : (
              <>
                <p>Assigned to: {getAssignedName(task)}</p>
                <button onClick={() => startAssignmentEdit(task)}>Edit Assignment</button>
              </>
            )}

            {task.current_deadline && <p>Due: {task.current_deadline}</p>}

            {task.deadline_revision_count > 0 && <p>Revised {task.deadline_revision_count} times</p>}

            {editingTaskId === task.id ? (
              <>
                <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
                <button onClick={() => void saveNewDeadline(task)}>Save Deadline</button>
              </>
            ) : (
              <button onClick={() => startEdit(task)}>Edit Deadline</button>
            )}

            <button onClick={() => void markDone(task.id)}>Done</button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3>Completed Tasks</h3>

        {completedTasks.length === 0 && <p>No completed tasks in this view.</p>}

        {completedTasks.map((task) => (
          <div key={task.id} className="border p-2 space-y-1">
            <p>{task.title}</p>
            <p>{task.category || "Other"}</p>
            <p>Assigned to: {getAssignedName(task)}</p>

            {task.current_deadline && <p>Due: {task.current_deadline}</p>}

            <p>{getCompletionLabel(task)}</p>

            {task.deadline_revision_count > 0 && <p>Revised {task.deadline_revision_count} times</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
