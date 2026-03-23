"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type ProfileState = {
  display_name: string | null;
  email: string | null;
};

type CircleRecord = {
  id: string;
  name: string;
  family_id: string | null;
  is_temporary: boolean;
};

type MembershipRecord = {
  family_id: string;
  user_id: string;
  display_label: string | null;
  role: string;
};

type CircleMemberRecord = {
  circle_id: string;
  user_id: string;
};

type MessageState =
  | { type: "success" | "error" | "warning"; text: string }
  | null;

function messageClasses(type: "success" | "error" | "warning") {
  if (type === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (type === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export function CirclesPanel({
  session,
}: {
  session: Session;
  profile: ProfileState | null;
}) {
  const [circles, setCircles] = useState<CircleRecord[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [circleMembers, setCircleMembers] = useState<CircleMemberRecord[]>([]);
  const [message, setMessage] = useState<MessageState>(null);
  const [loading, setLoading] = useState(false);

  const [circleName, setCircleName] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    void refreshData();
  }, [session.user.id]);

  async function refreshData() {
    setLoading(true);
    setMessage(null);

    const userId = session.user.id;
    const [circlesResult, membershipsResult, circleMembersResult] = await Promise.all([
      supabase.from("circles").select("id,name,family_id,is_temporary").eq("created_by_user_id", userId).order("created_at", { ascending: true }),
      supabase.from("family_memberships").select("family_id,user_id,display_label,role").eq("user_id", userId),
      supabase.from("circle_members").select("circle_id,user_id"),
    ]);

    if (circlesResult.error || membershipsResult.error || circleMembersResult.error) {
      setMessage({ type: "error", text: circlesResult.error?.message || membershipsResult.error?.message || circleMembersResult.error?.message || "Unable to load circles." });
      setLoading(false);
      return;
    }

    setCircles((circlesResult.data ?? []) as CircleRecord[]);
    setMemberships((membershipsResult.data ?? []) as MembershipRecord[]);
    setCircleMembers((circleMembersResult.data ?? []) as CircleMemberRecord[]);
    setLoading(false);
  }

  async function createCircle() {
    if (!circleName.trim()) {
      setMessage({ type: "warning", text: "Please enter a circle name." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const familyId = memberships[0]?.family_id ?? null;

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .insert({
        created_by_user_id: session.user.id,
        family_id: familyId,
        name: circleName.trim(),
        is_temporary: isTemporary,
      })
      .select("id")
      .single();

    if (circleError || !circle) {
      setMessage({ type: "error", text: circleError?.message ?? "Could not create circle." });
      setLoading(false);
      return;
    }

    const memberRows = [
      { circle_id: circle.id, user_id: session.user.id, added_by_user_id: session.user.id },
      ...selectedMemberIds
        .filter((userId) => userId !== session.user.id)
        .map((userId) => ({
          circle_id: circle.id,
          user_id: userId,
          added_by_user_id: session.user.id,
        })),
    ];

    const { error: memberError } = await supabase.from("circle_members").insert(memberRows);

    if (memberError) {
      setMessage({ type: "error", text: memberError.message });
      setLoading(false);
      return;
    }

    setCircleName("");
    setIsTemporary(false);
    setSelectedMemberIds([]);
    setMessage({ type: "success", text: "Circle created." });
    await refreshData();
  }

  const membershipsForSelection = useMemo(() => {
    const unique = new Map<string, MembershipRecord>();
    memberships.forEach((item) => unique.set(item.user_id, item));
    return Array.from(unique.values());
  }, [memberships]);

  return (
    <section id="circles" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Circles
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Reusable sharing groups</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Build circles like Goa Trip so mixed groups can be reused for calendar sharing.
        </p>
      </div>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClasses(message.type)}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Create circle</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Circle name</label>
              <input
                value={circleName}
                onChange={(event) => setCircleName(event.target.value)}
                placeholder="Goa Trip Circle"
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={isTemporary}
                onChange={(event) => setIsTemporary(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-cyan-400 focus:ring-cyan-400"
              />
              Temporary circle
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Add members</label>
              <div className="grid gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3">
                {membershipsForSelection.length === 0 ? (
                  <p className="text-sm text-neutral-500">Family members will appear here after invite acceptance.</p>
                ) : (
                  membershipsForSelection.map((member) => (
                    <label key={member.user_id} className="flex items-center gap-3 text-sm text-neutral-300">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.user_id)}
                        onChange={(event) =>
                          setSelectedMemberIds((prev) =>
                            event.target.checked
                              ? [...prev, member.user_id]
                              : prev.filter((id) => id !== member.user_id)
                          )
                        }
                        className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-cyan-400 focus:ring-cyan-400"
                      />
                      <span>{member.display_label || member.role}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => void createCircle()}
              disabled={loading || !circleName.trim()}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create circle"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Your circles</h3>
          <div className="mt-5 grid gap-4">
            {circles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-sm text-neutral-400">
                No circles yet.
              </div>
            ) : (
              circles.map((circle) => {
                const memberCount = circleMembers.filter((item) => item.circle_id === circle.id).length;
                return (
                  <article key={circle.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                    <h4 className="text-sm font-semibold text-white">{circle.name}</h4>
                    <p className="mt-1 text-sm text-neutral-400">
                      {circle.is_temporary ? "Temporary" : "Reusable"} • Members: {memberCount}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
