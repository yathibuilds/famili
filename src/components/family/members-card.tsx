"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
};

const styles = {
  page: {
    display: "grid",
    gap: "16px",
    color: "#0f172a",
  } as React.CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    background: "#ffffff",
    padding: "18px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
  list: {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
  } as React.CSSProperties,
  memberCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1e3a8a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "15px",
    flexShrink: 0,
  } as React.CSSProperties,
  memberName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  } as React.CSSProperties,
  memberMeta: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
  } as React.CSSProperties,
  empty: {
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "14px",
    color: "#64748b",
    background: "#f8fafc",
    marginTop: "14px",
  } as React.CSSProperties,
};

export function MembersCard() {
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
    <div style={styles.page}>
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>Family Members</h2>
        <p style={styles.heroText}>
          Keep your circle visible so assignments and planning stay easy.
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Add member</h3>
        <p style={styles.sectionText}>
          Add family members once so they can be used across the app.
        </p>

        <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
          <div>
            <label style={styles.label}>Member name</label>
            <input
              style={styles.input}
              placeholder="Enter family member name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <button style={styles.buttonPrimary} onClick={() => void addMember()}>
              Add Member
            </button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Member list</h3>
        <p style={styles.sectionText}>
          Everyone currently available for planning and task assignment.
        </p>

        <div style={styles.list}>
          {members.length === 0 && (
            <div style={styles.empty}>No family members added yet.</div>
          )}

          {members.map((m) => (
            <div key={m.id} style={styles.memberCard}>
              <div style={styles.avatar}>
                {m.name.trim().charAt(0).toUpperCase() || "F"}
              </div>
              <div>
                <p style={styles.memberName}>{m.name}</p>
                <p style={styles.memberMeta}>Available for task assignment</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
