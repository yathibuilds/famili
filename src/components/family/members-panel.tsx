"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  role?: string | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("Member");

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

    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    setMembers(data || []);
  }

  function getRoleLabel(member: Member) {
    return member.role?.trim() || "Member";
  }

  function getRoleClass(role: string) {
    return (
      roleColors[role] ||
      "border-neutral-700 bg-neutral-900 text-neutral-300"
    );
  }

  function startEdit(member: Member) {
    setEditingId(member.id);
    setSelectedRole(getRoleLabel(member));
  }

  async function saveRole(memberId: string) {
    await supabase
      .from("family_members")
      .update({ role: selectedRole })
      .eq("id", memberId);

    setEditingId(null);
    await loadMembers();
  }

  async function removeMember(memberId: string) {
    const confirmDelete = confirm("Remove this member?");
    if (!confirmDelete) return;

    await supabase
      .from("family_members")
      .delete()
      .eq("id", memberId);

    await loadMembers();
  }

  return (
    <section id="family" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Family
        </p>
        <h2 className="mt-3 text-2xl font-semibold">
          Members and household circle
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Manage roles and keep your household structured.
        </p>
      </div>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-lg font-semibold text-white">Member Directory</h3>
            <p className="mt-2 text-sm text-neutral-400">
              Manage roles and permissions for each member.
            </p>
          </div>

          <div className="text-sm text-neutral-400">
            {members.length} members
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => {
            const roleLabel = getRoleLabel(member);

            return (
              <article
                key={member.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-200">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-sm text-neutral-400">
                        Available for tasks
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(member)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Manage
                  </button>
                </div>

                <div className="mt-4">
                  {editingId === member.id ? (
                    <div className="space-y-3">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
                      >
                        {roles.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveRole(member.id)}
                          className="flex-1 bg-cyan-400 text-black text-sm rounded-xl py-2"
                        >
                          Save
                        </button>

                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 border border-neutral-700 text-sm rounded-xl py-2"
                        >
                          Cancel
                        </button>
                      </div>

                      <button
                        onClick={() => removeMember(member.id)}
                        className="w-full text-red-400 text-xs mt-2"
                      >
                        Remove member
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs ${getRoleClass(
                        roleLabel
                      )}`}
                    >
                      {roleLabel}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
