"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Factor = {
  id: string;
  status: string;
  friendly_name?: string;
};

export function EnableTwoFactorCard() {
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

    const verified = data?.totp?.filter((f) => f.status === "verified") ?? [];
    setFactors(verified);
  }

  async function handleEnroll() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Famli Authenticator",
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

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
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

  function startRemove(nextFactorId: string) {
    setRemoveFactorId(nextFactorId);
    setShowRemoveVerify(true);
    setRemoveCode("");
    setMessage("Enter code to confirm removal");
  }

  async function confirmRemove() {
    if (!removeFactorId) return;

    setLoading(true);
    setMessage("");

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
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

    setMessage("2FA removed successfully");
    setShowRemoveVerify(false);
    setRemoveCode("");
    setRemoveFactorId(null);
    await loadFactors();
  }

  return (
    <div className="space-y-4">
      {factors.length > 0 && (
        <div className="space-y-4">
          <p>2FA is enabled on this account.</p>

          {factors.map((f) => (
            <div key={f.id} className="space-y-2">
              <p>{f.friendly_name || "Authenticator app"}</p>
              <p>Status: {f.status}</p>

              {!showRemoveVerify && (
                <button onClick={() => startRemove(f.id)}>Remove</button>
              )}
            </div>
          ))}

          {showRemoveVerify && (
            <div className="space-y-2">
              <input
                value={removeCode}
                onChange={(e) => setRemoveCode(e.target.value)}
                placeholder="Enter 6-digit code"
              />
              <button onClick={confirmRemove} disabled={loading || removeCode.length < 6}>
                Confirm removal
              </button>
            </div>
          )}

          <button onClick={handleEnroll} disabled={loading}>
            Add another authenticator
          </button>

          <div className="flex gap-2 mt-4">
            <a href="/">Go to dashboard</a>
            <a href="/settings/security">Stay on security page</a>
          </div>
        </div>
      )}

      {factors.length === 0 && !qrCode && (
        <button onClick={handleEnroll} disabled={loading}>
          Enable 2FA
        </button>
      )}

      {qrCode && (
        <div className="space-y-2">
          <img src={qrCode} alt="QR code" />
          <p>Manual key: {secret}</p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
          />

          <button onClick={handleVerify} disabled={loading || code.length < 6}>
            Verify
          </button>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}
