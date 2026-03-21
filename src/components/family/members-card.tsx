"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
};

export function MembersCard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    loadMembers();
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
      .eq("family_id", familyId);

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
    loadMembers();
  }

  return (
    <div className="space-y-4">
      <h2>Family Members</h2>

      <input
        placeholder="Member name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={addMember}>Add Member</button>

      <div>
        {members.map((m) => (
          <p key={m.id}>{m.name}</p>
        ))}
      </div>
    </div>
  );
}
