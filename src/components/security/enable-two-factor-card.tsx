"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Factor = {
  id: string;
  status: string;
  friendly_name?: string;
  factor_type?: string;
};

export function EnableTwoFactorCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifiedFactors, setVerifiedFactors] = useState<Factor[]>([]);

  async function loadFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage(error.message);
      return;
    }

    const verified = (data?.totp ?? []).filter((factor) => factor.status === "verified");
    setVerifiedFactors(verified);
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function handleEnroll() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Famli Authenticator",
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function handleVerify() {
    if (!factorId || code.trim().length < 6) return;

    setLoading(true);
    setMessage(null);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setLoading(false);
      setMessage(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.trim(),
    });

    setLoading(false);

    if (verifyError) {
      setMessage(verifyError.message);
      return;
    }

    setMessage("Two-factor authentication is now enabled.");
    setCode("");
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    loadFactors();
  }

  async function handleUnenroll(id: string) {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Two-factor authentication factor removed.");
    loadFactors();
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Authenticator app</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Use Google Authenticator, Microsoft Authenticator, 1Password, or any TOTP app.
        </p>
      </div>

      {verifiedFactors.length > 0 && (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 space-y-3">
          <p className="text-sm text-emerald-300">2FA is enabled on this account.</p>
          {verifiedFactors.map((factor) => (
            <div key={factor.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 p-3">
              <div>
                <p className="font-medium">{factor.friendly_name || "Authenticator app"}</p>
                <p className="text-xs text-neutral-400">Status: {factor.status}</p>
              </div>
              <button
                onClick={() => handleUnenroll(factor.id)}
                disabled={loading}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!qrCode && (
        <button
          onClick={handleEnroll}
          disabled={loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? "Preparing..." : verifiedFactors.length > 0 ? "Add another authenticator" : "Enable 2FA"}
        </button>
      )}

      {qrCode && (
        <div className="space-y-4 rounded-xl border border-neutral-800 p-4">
          <div>
            <p className="text-sm font-medium">Step 1: Scan this QR code</p>
            <p className="mt-1 text-xs text-neutral-400">If the QR code does not load, use the setup key below.</p>
          </div>

          <img src={qrCode} alt="TOTP QR code" className="h-52 w-52 rounded-lg bg-white p-2" />

          {secret && (
            <div>
              <p className="text-sm font-medium">Manual setup key</p>
              <p className="mt-1 break-all rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
                {secret}
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Step 2: Enter the 6-digit code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={loading || code.trim().length < 6}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify and finish"}
            </button>
            <button
              onClick={() => {
                setFactorId(null);
                setQrCode(null);
                setSecret(null);
                setCode("");
                setMessage(null);
              }}
              disabled={loading}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-neutral-300">{message}</p>}
    </section>
  );
}
