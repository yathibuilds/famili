"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Factor = {
  id: string;
  status: string;
  friendly_name?: string;
};

export function TwoFactorCard() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRemoveVerify, setShowRemoveVerify] = useState(false);
  const [removeCode, setRemoveCode] = useState("");
  const [removeFactorId, setRemoveFactorId] = useState<string | null>(null);

  useEffect(() => {
    void loadFactors();
  }, []);

  async function loadFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      setMessage(error.message);
      return;
    }

    const verified = data?.totp?.filter((factor) => factor.status === "verified") ?? [];
    setFactors(verified);
  }

  async function handleEnroll() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "FamiliHub Authenticator",
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data) {
      setMessage("Could not start 2FA setup.");
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function handleVerify() {
    if (!factorId) return;

    setLoading(true);
    setMessage("");

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setLoading(false);
      setMessage(challengeError.message);
      return;
    }

    if (!challengeData) {
      setLoading(false);
      setMessage("Could not create verification challenge.");
      return;
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Two-factor authentication is now enabled.");
    setQrCode(null);
    setSecret(null);
    setCode("");
    setFactorId(null);
    await loadFactors();
  }

  function startDisable(nextFactorId: string) {
    setRemoveFactorId(nextFactorId);
    setShowRemoveVerify(true);
    setRemoveCode("");
    setMessage("Enter a current authenticator code to confirm disabling 2FA.");
  }

  async function confirmDisable() {
    if (!removeFactorId) return;

    setLoading(true);
    setMessage("");

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: removeFactorId,
    });

    if (challengeError) {
      setLoading(false);
      setMessage(challengeError.message);
      return;
    }

    if (!challengeData) {
      setLoading(false);
      setMessage("Could not create removal challenge.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: removeFactorId,
      challengeId: challengeData.id,
      code: removeCode,
    });

    if (verifyError) {
      setLoading(false);
      setMessage(verifyError.message);
      return;
    }

    const { error: removeError } = await supabase.auth.mfa.unenroll({
      factorId: removeFactorId,
    });

    setLoading(false);

    if (removeError) {
      setMessage(removeError.message);
      return;
    }

    setMessage("2FA disabled successfully.");
    setShowRemoveVerify(false);
    setRemoveCode("");
    setRemoveFactorId(null);
    await loadFactors();
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Two-factor authentication
            </p>
            <h2 className="mt-2 text-xl font-semibold">Authenticator app protection</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Use an authenticator app to secure sign-in and future sensitive actions inside
              FamiliHub.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
            Status: <span className="font-medium text-white">{factors.length > 0 ? "Enabled" : "Not enabled"}</span>
          </div>
        </div>

        {factors.length > 0 ? (
          <div className="space-y-4">
            {factors.map((factor) => (
              <div key={factor.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{factor.friendly_name || "Authenticator app"}</p>
                    <p className="mt-1 text-sm text-neutral-400">Status: {factor.status}</p>
                  </div>

                  {!showRemoveVerify ? (
                    <button
                      onClick={() => startDisable(factor.id)}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                    >
                      Disable 2FA
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {showRemoveVerify ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-200">Confirm with current 6-digit code</label>
                  <input
                    value={removeCode}
                    onChange={(event) => setRemoveCode(event.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                  />
                  <button
                    onClick={confirmDisable}
                    disabled={loading || removeCode.length < 6}
                    className="rounded-2xl bg-red-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Disabling..." : "Confirm disable"}
                  </button>
                </div>
              </div>
            ) : null}

            <button
              onClick={handleEnroll}
              disabled={loading}
              className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Preparing..." : "Add another authenticator"}
            </button>
          </div>
        ) : null}

        {factors.length === 0 && !qrCode ? (
          <button
            onClick={handleEnroll}
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Preparing..." : "Enable 2FA"}
          </button>
        ) : null}

        {qrCode ? (
          <div className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-white p-3">
              <img src={qrCode} alt="QR code" className="h-full w-full" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white">Set up your authenticator app</p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Scan the QR code, or use the manual key below if scanning is unavailable.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
                Manual key: <span className="break-all font-medium text-white">{secret}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Verification code</label>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify authenticator"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-sm text-neutral-400">
          <Link href="/" className="transition hover:text-white">
            Go to dashboard
          </Link>
          <span className="text-neutral-700">•</span>
          <Link href="/settings/security" className="transition hover:text-white">
            Stay on security page
          </Link>
        </div>

        {message ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
