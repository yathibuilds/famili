"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
};

export function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");

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

  async function addMember() {
    if (!name.trim()) return;

    const familyId = await getFamilyId();
    if (!familyId) return;

    await supabase.from("family_members").insert({
      name,
      family_id: familyId,
    });

    setName("");
    await loadMembers();
  }

  return (
    <section id="family" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Family</p>
        <h2 className="mt-3 text-2xl font-semibold">Members and household circle</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Keep your family roster visible so assignments and shared planning stay easy.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Add member</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Add family members once so they can be used across tasks and future planning features.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Member name</label>
              <input
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                placeholder="Enter family member name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <button
              className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
              onClick={() => void addMember()}
            >
              Add Member
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Member list</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Everyone currently available for planning and task assignment.
          </p>

          <div className="mt-5 grid gap-4">
            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
                No family members added yet.
              </div>
            ) : null}

            {members.map((member) => (
              <article key={member.id} className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-200">
                  {member.name.trim().charAt(0).toUpperCase() || "F"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{member.name}</p>
                  <p className="mt-1 text-sm text-neutral-400">Available for task assignment</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
