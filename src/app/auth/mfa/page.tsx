"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

      if (verified[0]) {
        setSelectedFactorId(verified[0].id);
      } else {
        setMessage("No verified authenticator app found for this account.");
      }
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
    setMessage("Enter the current 6-digit code from your authenticator app.");
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
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto grid max-w-lg gap-6">
        <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Two-factor sign-in</p>
          <h1 className="mt-3 text-2xl font-semibold">Verify your identity</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Complete sign-in with your authenticator app before entering your Famli workspace.
          </p>
        </div>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="space-y-5">
            {factors.length > 0 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Authenticator app</label>
                <select
                  value={selectedFactorId}
                  onChange={(event) => setSelectedFactorId(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
                >
                  {factors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || "Authenticator app"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 text-sm leading-6 text-neutral-400">
              Request a challenge first, then enter the current 6-digit code shown by your authenticator app.
            </div>

            <button
              onClick={createChallenge}
              disabled={loading || !selectedFactorId}
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Preparing..." : "Get code challenge"}
            </button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Verification code</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <button
              onClick={verifyCode}
              disabled={loading || !challengeId || code.trim().length < 6}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
            {message}
          </div>
        ) : null}

        <div className="text-center text-sm text-neutral-500">
          <Link href="/settings/security" className="transition hover:text-neutral-300">
            Back to security settings
          </Link>
        </div>
      </div>
    </main>
  );
}
