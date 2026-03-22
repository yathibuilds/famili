"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  role?: string | null;
  relationship?: string | null;
};

const roles = ["Admin", "Parent", "Member", "Child"];

const roleColors: Record<string, string> = {
  Admin: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
  Parent: "border-violet-500/20 bg-violet-500/10 text-violet-200",
  Child: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  Member: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
};

export function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [relationship, setRelationship] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("Member");
  const [editRelationship, setEditRelationship] = useState("");

  useEffect(() => {
    void loadMembers();
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

    return data?.id;
  }

  async function loadMembers() {
    const familyId = await getFamilyId();
    if (!familyId) return;

    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  }

  function getRoleLabel(member: Member) {
    return member.role?.trim() || "Member";
  }

  function getRelationshipLabel(member: Member) {
    return member.relationship?.trim() || "Family member";
  }

  function getRoleClass(nextRole: string) {
    return roleColors[nextRole] || "border-neutral-700 bg-neutral-900 text-neutral-300";
  }

  async function addMember() {
    if (!name.trim()) return;

    const familyId = await getFamilyId();
    if (!familyId) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from("family_members").insert({
      family_id: familyId,
      name: name.trim(),
      role,
      relationship: relationship.trim() || null,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setName("");
    setRole("Member");
    setRelationship("");
    setMessage("Member added.");
    await loadMembers();
  }

  function startEdit(member: Member) {
    setEditingId(member.id);
    setEditName(member.name || "");
    setEditRole(member.role?.trim() || "Member");
    setEditRelationship(member.relationship?.trim() || "");
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditRole("Member");
    setEditRelationship("");
  }

  async function saveMember(memberId: string) {
    if (!editName.trim()) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from("family_members")
      .update({
        name: editName.trim(),
        role: editRole,
        relationship: editRelationship.trim() || null,
      })
      .eq("id", memberId);

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    cancelEdit();
    setMessage("Member updated.");
    await loadMembers();
  }

  async function removeMember(memberId: string, memberName: string) {
    setLoading(true);
    setMessage(null);

    const { count, error: countError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to_member_id", memberId);

    if (countError) {
      setLoading(false);
      console.error("Task count failed:", countError);
      setMessage(countError.message);
      alert(`Could not check assigned tasks: ${countError.message}`);
      return;
    }

    const assignedCount = count ?? 0;
    const confirmMessage =
      assignedCount > 0
        ? `Remove ${memberName}? ${assignedCount} assigned task(s) will be unassigned.`
        : `Remove ${memberName}?`;

    const confirmed = confirm(confirmMessage);
    if (!confirmed) {
      setLoading(false);
      return;
    }

    if (assignedCount > 0) {
      const { error: unassignError } = await supabase
        .from("tasks")
        .update({ assigned_to_member_id: null })
        .eq("assigned_to_member_id", memberId);

      if (unassignError) {
        setLoading(false);
        console.error("Task unassign failed:", unassignError);
        setMessage(unassignError.message);
        alert(`Could not unassign tasks: ${unassignError.message}`);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("family_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      setLoading(false);
      console.error("Member delete failed:", deleteError);
      setMessage(deleteError.message);
      alert(`Could not remove member: ${deleteError.message}`);
      return;
    }

    setLoading(false);

    if (editingId === memberId) {
      cancelEdit();
    }

    setMessage("Member removed.");
    await loadMembers();
  }

  return (
    <section id="family" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Family
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Members and household circle</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Add, manage, and organise everyone in your household from one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Add member</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Create a complete family profile with role and relationship.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter family member name"
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Relationship</label>
              <input
                value={relationship}
                onChange={(event) => setRelationship(event.target.value)}
                placeholder="Examples: Wife, Son, Brother, Mother"
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <button
              onClick={() => void addMember()}
              disabled={loading || !name.trim()}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add Member"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Member Directory</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Manage names, roles, and relationship details for each member.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
              Total members: <span className="font-medium text-white">{members.length}</span>
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
              {message}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-5 text-sm text-neutral-400 md:col-span-2">
                <p className="font-medium text-white">No family members yet</p>
                <p className="mt-2 leading-6 text-neutral-400">
                  Add members here so they can be assigned to tasks and included in future planning.
                </p>
              </div>
            ) : null}

            {members.map((member) => {
              const roleLabel = getRoleLabel(member);
              const relationshipLabel = getRelationshipLabel(member);
              const isEditing = editingId === member.id;

              return (
                <article
                  key={member.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-200">
                        {member.name.trim().charAt(0).toUpperCase() || "F"}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">{member.name}</p>
                        <p className="mt-1 text-sm text-neutral-400">{relationshipLabel}</p>
                      </div>
                    </div>

                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(member)}
                        className="rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                      >
                        Manage
                      </button>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getRoleClass(
                          roleLabel
                        )}`}
                      >
                        {roleLabel}
                      </span>
                      <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                        Available for task assignment
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Name</label>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Role</label>
                        <select
                          value={editRole}
                          onChange={(event) => setEditRole(event.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          {roles.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-200">Relationship</label>
                        <input
                          value={editRelationship}
                          onChange={(event) => setEditRelationship(event.target.value)}
                          placeholder="Examples: Wife, Son, Brother, Mother"
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveMember(member.id)}
                          disabled={loading || !editName.trim()}
                          className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                        >
                          Cancel
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeMember(member.id, member.name)}
                        className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                      >
                        Remove member
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
