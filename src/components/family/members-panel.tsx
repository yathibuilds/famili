"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  role?: string | null;
};

const roleColors: Record<string, string> = {
  Admin: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
  Parent: "border-violet-500/20 bg-violet-500/10 text-violet-200",
  Child: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  Member: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
};

export function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);

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
          Keep your family roster visible so assignments and shared planning stay easy.
        </p>
      </div>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Member Directory</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Everyone currently available for planning and task assignment.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
            Total members: <span className="font-medium text-white">{members.length}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-5 text-sm text-neutral-400 md:col-span-2 xl:col-span-3">
              <p className="font-medium text-white">No family members yet</p>
              <p className="mt-2 leading-6 text-neutral-400">
                Add members from the Tasks section so they can be assigned work and included in future planning.
              </p>
            </div>
          ) : null}

          {members.map((member) => {
            const roleLabel = getRoleLabel(member);

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
                      <p className="mt-1 text-sm text-neutral-400">
                        Available for task assignment
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                  >
                    Manage
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getRoleClass(
                      roleLabel
                    )}`}
                  >
                    {roleLabel}
                  </span>
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
                    Family member
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
