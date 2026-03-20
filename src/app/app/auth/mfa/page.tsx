"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Factor = {
  id: string;
  friendly_name?: string;
  status: string;
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

    loadFactors();
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
    setMessage("Enter the code from your authenticator app.");
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
    <main className="min-h-screen bg-neutral-950 text-white p-6 md:p-10">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Two-factor verification</h1>
          <p className="mt-2 text-sm text-neutral-400">Complete sign-in with your authenticator app.</p>
        </div>

        {factors.length > 0 && (
          <select
            value={selectedFactorId}
            onChange={(e) => setSelectedFactorId(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
          >
            {factors.map((factor) => (
              <option key={factor.id} value={factor.id}>
                {factor.friendly_name || "Authenticator app"}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={createChallenge}
          disabled={loading || !selectedFactorId}
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? "Preparing..." : "Get code challenge"}
        </button>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          inputMode="numeric"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
        />

        <button
          onClick={verifyCode}
          disabled={loading || !challengeId || code.trim().length < 6}
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        {message && <p className="text-sm text-neutral-300">{message}</p>}
      </div>
    </main>
  );
}
