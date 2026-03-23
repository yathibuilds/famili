"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type ProfileState = {
  display_name: string | null;
  email: string | null;
};

type MessageState =
  | { type: "success" | "error" | "warning"; text: string }
  | null;

type FamilyRecord = {
  id: string;
  name: string;
  created_by: string;
  parent_control_mode: "either_parent" | "both_parents" | "primary_parent";
  created_at: string;
};

type MembershipRecord = {
  id: string;
  family_id: string;
  user_id: string;
  role: "owner" | "parent" | "adult_member" | "child" | "delegated_admin";
  relationship: string;
  display_label: string | null;
  is_guardian: boolean;
  is_primary_parent: boolean;
};

type InviteRecord = {
  id: string;
  family_id: string;
  invited_email: string;
  invited_role: "owner" | "parent" | "adult_member" | "child" | "delegated_admin";
  invited_relationship: string;
  invited_display_label: string | null;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired" | "cancelled";
  invite_token: string;
  invited_by_user_id: string;
  expires_at: string;
  created_at: string;
};

const relationshipOptions = [
  { label: "Spouse / Partner", value: "spouse" },
  { label: "Parent", value: "parent" },
  { label: "Child", value: "child" },
  { label: "Sibling", value: "sibling" },
  { label: "In-law", value: "in_law" },
  { label: "Extended family", value: "extended_family" },
  { label: "Friend", value: "friend" },
  { label: "Coworker", value: "coworker" },
  { label: "Flatmate", value: "flatmate" },
  { label: "Neighbor", value: "neighbor" },
  { label: "Other", value: "other" },
] as const;

const roleOptions = [
  { label: "Parent", value: "parent" },
  { label: "Adult member", value: "adult_member" },
  { label: "Child", value: "child" },
  { label: "Delegated admin", value: "delegated_admin" },
] as const;

function buildInviteToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function messageClasses(type: "success" | "error" | "warning") {
  if (type === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (type === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export function FamilyAccessPanel({
  session,
  profile,
}: {
  session: Session;
  profile: ProfileState | null;
}) {
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [message, setMessage] = useState<MessageState>(null);
  const [loading, setLoading] = useState(false);

  const [familyName, setFamilyName] = useState("");
  const [parentControlMode, setParentControlMode] = useState<
    "either_parent" | "both_parents" | "primary_parent"
  >("either_parent");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "parent" | "adult_member" | "child" | "delegated_admin"
  >("adult_member");
  const [inviteRelationship, setInviteRelationship] = useState("other");
  const [inviteDisplayLabel, setInviteDisplayLabel] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [childGuardianConfirmed, setChildGuardianConfirmed] = useState(false);

  const primaryFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) ?? families[0] ?? null,
    [families, selectedFamilyId]
  );

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    if (!selectedFamilyId && families[0]) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  useEffect(() => {
    if (inviteRole !== "child") setChildGuardianConfirmed(false);
  }, [inviteRole]);

  async function refreshData() {
    setLoading(true);
    setMessage(null);

    const userId = session.user.id;
    const userEmail = session.user.email ?? profile?.email ?? "";

    const [familiesResult, membershipsResult, invitesResult] = await Promise.all([
      supabase
        .from("families")
        .select("*")
        .or(`created_by.eq.${userId},primary_parent_user_id.eq.${userId}`)
        .order("created_at", { ascending: true }),
      supabase
        .from("family_memberships")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("family_invites")
        .select("*")
        .or(`invited_email.eq.${userEmail},invited_user_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
    ]);

    if (familiesResult.error || membershipsResult.error || invitesResult.error) {
      setMessage({
        type: "error",
        text:
          familiesResult.error?.message ||
          membershipsResult.error?.message ||
          invitesResult.error?.message ||
          "Unable to load family access.",
      });
      setLoading(false);
      return;
    }

    const membershipFamilyIds = new Set(
      (membershipsResult.data ?? []).map((membership) => membership.family_id)
    );

    const extraFamilies =
      membershipFamilyIds.size > 0
        ? await supabase
            .from("families")
            .select("*")
            .in("id", Array.from(membershipFamilyIds))
            .order("created_at", { ascending: true })
        : { data: [], error: null };

    if (extraFamilies.error) {
      setMessage({ type: "error", text: extraFamilies.error.message });
      setLoading(false);
      return;
    }

    const familyMap = new Map<string, FamilyRecord>();
    for (const family of [...(familiesResult.data ?? []), ...(extraFamilies.data ?? [])]) {
      familyMap.set(family.id, family as FamilyRecord);
    }

    setFamilies(Array.from(familyMap.values()));
    setMemberships((membershipsResult.data ?? []) as MembershipRecord[]);
    setInvites((invitesResult.data ?? []) as InviteRecord[]);
    setLoading(false);
  }

  async function createFamily() {
    if (!familyName.trim()) {
      setMessage({ type: "warning", text: "Please enter a family name." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name: familyName.trim(),
        created_by: session.user.id,
        parent_control_mode: parentControlMode,
      })
      .select("*")
      .single();

    if (familyError || !family) {
      setMessage({ type: "error", text: familyError?.message ?? "Could not create family." });
      setLoading(false);
      return;
    }

    const { error: membershipError } = await supabase.from("family_memberships").insert({
      family_id: family.id,
      user_id: session.user.id,
      role: "owner",
      relationship: "self",
      display_label: "Self",
      is_guardian: false,
      is_primary_parent: false,
    });

    if (membershipError) {
      setMessage({ type: "error", text: membershipError.message });
      setLoading(false);
      return;
    }

    setFamilyName("");
    setMessage({ type: "success", text: "Family created. You can now invite people by email." });
    await refreshData();
  }

  async function sendInvite() {
    const familyId = primaryFamily?.id;
    if (!familyId) {
      setMessage({ type: "warning", text: "Create or select a family first." });
      return;
    }
    if (!inviteEmail.trim()) {
      setMessage({ type: "warning", text: "Please enter an email address." });
      return;
    }
    if (inviteRole === "child" && !childGuardianConfirmed) {
      setMessage({
        type: "warning",
        text: "Please confirm that you are this child's parent or authorized guardian before sending the invite.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    const inviteToken = buildInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase.from("family_invites").insert({
      family_id: familyId,
      invited_email: inviteEmail.trim().toLowerCase(),
      invited_user_id: null,
      invited_role: inviteRole,
      invited_relationship: inviteRelationship,
      invited_display_label: inviteDisplayLabel.trim() || null,
      status: "pending",
      invite_token: inviteToken,
      invited_by_user_id: session.user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    const response = await fetch("/api/invites/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invitedEmail: inviteEmail.trim().toLowerCase(),
        familyName: primaryFamily?.name ?? "Famili family",
        inviteToken,
        role: inviteRole,
        displayLabel: inviteDisplayLabel.trim() || null,
        inviterName: profile?.display_name || session.user.user_metadata?.display_name || "A family member",
      }),
    });

    let emailMessage = "Invite saved.";
    if (!response.ok) {
      try {
        const payload = await response.json();
        emailMessage = payload?.message || "Invite saved, but email was not sent.";
      } catch {
        emailMessage = "Invite saved, but email was not sent.";
      }
      setMessage({ type: "warning", text: emailMessage });
    } else {
      setMessage({ type: "success", text: "Invite saved and email delivery was attempted." });
    }

    setInviteEmail("");
    setInviteRole("adult_member");
    setInviteRelationship("other");
    setInviteDisplayLabel("");
    setChildGuardianConfirmed(false);
    await refreshData();
  }

  async function respondToInvite(invite: InviteRecord, nextStatus: "accepted" | "declined") {
    setLoading(true);
    setMessage(null);

    const { error: inviteError } = await supabase
      .from("family_invites")
      .update({
        status: nextStatus,
        invited_user_id: session.user.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (inviteError) {
      setMessage({ type: "error", text: inviteError.message });
      setLoading(false);
      return;
    }

    if (nextStatus === "accepted") {
      const { error: membershipError } = await supabase.from("family_memberships").upsert({
        family_id: invite.family_id,
        user_id: session.user.id,
        role: invite.invited_role,
        relationship: invite.invited_relationship,
        display_label: invite.invited_display_label,
        is_guardian: invite.invited_role === "parent",
        is_primary_parent: false,
      });

      if (membershipError) {
        setMessage({ type: "error", text: membershipError.message });
        setLoading(false);
        return;
      }
    }

    setMessage({
      type: "success",
      text: nextStatus === "accepted" ? "Invite accepted." : "Invite declined.",
    });
    await refreshData();
  }

  return (
    <section id="family" className="space-y-6">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
          Family access
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Invite-only family container</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-300">
          Individual accounts stay separate until someone creates a family or accepts an invite.
        </p>
      </div>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClasses(message.type)}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Create family</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Only create this when you want to open level 2 family access intentionally.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Family name</label>
              <input
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                placeholder="Example: The Rajan family"
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Parent control mode</label>
              <select
                value={parentControlMode}
                onChange={(event) =>
                  setParentControlMode(
                    event.target.value as "either_parent" | "both_parents" | "primary_parent"
                  )
                }
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                <option value="either_parent">Either parent can manage</option>
                <option value="both_parents">Both parents manage together</option>
                <option value="primary_parent">Primary parent controls</option>
              </select>
            </div>

            <button
              onClick={() => void createFamily()}
              disabled={loading || !familyName.trim()}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create family"}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Your access</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Families you own or belong to through accepted invites.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                Families: <span className="font-medium text-white">{families.length}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {families.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-5 text-sm text-neutral-400">
                  No family container yet. You are still operating as an individual only.
                </div>
              ) : null}

              {families.map((family) => {
                const membership = memberships.find((item) => item.family_id === family.id);

                return (
                  <article
                    key={family.id}
                    className={`rounded-2xl border p-4 ${
                      primaryFamily?.id === family.id
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-neutral-800 bg-neutral-950/70"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-white">{family.name}</h4>
                        <p className="mt-2 text-sm text-neutral-400">
                          Parent control: {family.parent_control_mode.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          Your role: {membership?.role?.replaceAll("_", " ") || "owner"}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedFamilyId(family.id)}
                        className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                      >
                        {primaryFamily?.id === family.id ? "Selected" : "Use this family"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <h3 className="text-lg font-semibold text-white">Invite by email</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Family members only join level 2 after they receive and accept an invite.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-200">Invite email</label>
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="person@example.com"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Role</label>
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(
                      event.target.value as "parent" | "adult_member" | "child" | "delegated_admin"
                    )
                  }
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {roleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Relationship type</label>
                <select
                  value={inviteRelationship}
                  onChange={(event) => setInviteRelationship(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {relationshipOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-200">Display label</label>
                <input
                  value={inviteDisplayLabel}
                  onChange={(event) => setInviteDisplayLabel(event.target.value)}
                  placeholder="Example: Brother, Mother, Daughter"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
              </div>
            </div>

            {inviteRole === "child" ? (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                <p className="font-medium text-amber-100">Child protection check</p>
                <p className="mt-2 leading-6">
                  Children are the most protected members in Famili. Please confirm that you are
                  this child&apos;s parent or an authorized guardian before continuing.
                </p>

                <label className="mt-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={childGuardianConfirmed}
                    onChange={(event) => setChildGuardianConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-cyan-400 focus:ring-cyan-400"
                  />
                  <span>
                    I confirm that I am this child&apos;s parent or authorized guardian, and I
                    understand child-related access must remain highly restricted.
                  </span>
                </label>
              </div>
            ) : null}

            <button
              onClick={() => void sendInvite()}
              disabled={
                loading ||
                !inviteEmail.trim() ||
                !primaryFamily ||
                (inviteRole === "child" && !childGuardianConfirmed)
              }
              className="mt-5 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save and send invite"}
            </button>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10">
            <h3 className="text-lg font-semibold text-white">Pending invites for you</h3>
            <div className="mt-5 grid gap-4">
              {invites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-5 text-sm text-neutral-400">
                  No invites yet.
                </div>
              ) : null}

              {invites.map((invite) => (
                <article
                  key={invite.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {invite.invited_display_label || invite.invited_relationship.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-400">Status: {invite.status}</p>
                      <p className="mt-1 text-sm text-neutral-500">Expires: {formatDate(invite.expires_at)}</p>
                    </div>

                    {invite.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void respondToInvite(invite, "accepted")}
                          disabled={loading}
                          className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => void respondToInvite(invite, "declined")}
                          disabled={loading}
                          className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
