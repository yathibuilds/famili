"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Factor = {
  id: string;
  friendly_name?: string;
  status: string;
};

const styles = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: "24px",
    color: "#0f172a",
  } as React.CSSProperties,
  wrap: {
    maxWidth: "520px",
    margin: "0 auto",
    display: "grid",
    gap: "16px",
  } as React.CSSProperties,
  hero: {
    borderRadius: "22px",
    padding: "22px",
    background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
    color: "#ffffff",
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
    lineHeight: 1.5,
  } as React.CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    background: "#ffffff",
    padding: "20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
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
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
  } as React.CSSProperties,
  primaryButton: {
    width: "100%",
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  secondaryButton: {
    width: "100%",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  note: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.5,
  } as React.CSSProperties,
  message: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#f8fafc",
    padding: "12px 14px",
    color: "#334155",
    fontSize: "14px",
  } as React.CSSProperties,
};

export default function MfaPage() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        setMessage(error.message);
        return;
      }

      const verified = (data?.totp ?? []).filter((factor) => factor.status === "verified");
      setFactors(verified);
      if (verified[0]) setSelectedFactorId(verified[0].id);
      if (verified.length === 0) setMessage("No verified authenticator app found for this account.");
    }

    void loadFactors();
  }, []);

  async function createChallenge() {
    if (!selectedFactorId) return;

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.mfa.challenge({ factorId: selectedFactorId });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setChallengeId(data.id);
    setMessage("Enter the current code from your authenticator app.");
  }

  async function verifyCode() {
    if (!selectedFactorId || !challengeId || code.trim().length < 6) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.verify({
      factorId: selectedFactorId,
      challengeId,
      code: code.trim(),
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/");
  }

  return (
    <main style={styles.shell}>
      <div style={styles.wrap}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Two-factor verification</h1>
          <p style={styles.heroText}>
            Complete sign-in with your authenticator app so your Famli workspace stays protected.
          </p>
        </div>

        <div style={styles.card}>
          <div style={{ display: "grid", gap: "14px" }}>
            {factors.length > 0 && (
              <div>
                <label style={styles.label}>Authenticator app</label>
                <select
                  value={selectedFactorId}
                  onChange={(e) => setSelectedFactorId(e.target.value)}
                  style={styles.input}
                >
                  {factors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || "Authenticator app"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p style={styles.note}>
              First request a code challenge, then enter the 6-digit code shown in your authenticator app.
            </p>

            <button
              onClick={createChallenge}
              disabled={loading || !selectedFactorId}
              style={{
                ...styles.secondaryButton,
                opacity: loading || !selectedFactorId ? 0.6 : 1,
                cursor: loading || !selectedFactorId ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Preparing..." : "Get code challenge"}
            </button>

            <div>
              <label style={styles.label}>Verification code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                style={styles.input}
              />
            </div>

            <button
              onClick={verifyCode}
              disabled={loading || !challengeId || code.trim().length < 6}
              style={{
                ...styles.primaryButton,
                opacity: loading || !challengeId || code.trim().length < 6 ? 0.6 : 1,
                cursor:
                  loading || !challengeId || code.trim().length < 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
          </div>
        </div>

        {message && <div style={styles.message}>{message}</div>}
      </div>
    </main>
  );
}
