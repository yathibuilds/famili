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
    loadFactors();
  }, []);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified =
      data?.totp?.filter((f) => f.status === "verified") ?? [];
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

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function handleVerify() {
    if (!factorId) return;

    setLoading(true);

    const { data: challengeData } = await supabase.auth.mfa.challenge({
      factorId,
    });

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
    loadFactors();
  }

  async function startRemove(factorId: string) {
    setRemoveFactorId(factorId);
    setShowRemoveVerify(true);
    setMessage("Enter code to confirm removal");
  }

  async function confirmRemove() {
    if (!removeFactorId) return;

    setLoading(true);

    const { data: challengeData } = await supabase.auth.mfa.challenge({
      factorId: removeFactorId,
    });

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
    loadFactors();
  }

  return (
    <div className="space-y-4">
      {factors.length > 0 && (
        <div>
          <p>2FA is enabled on this account.</p>

          {factors.map((f) => (
            <div key={f.id} className="space-y-2">
              <p>{f.friendly_name}</p>
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
              <button onClick={confirmRemove} disabled={loading}>
                Confirm removal
              </button>
            </div>
          )}

          <button onClick={handleEnroll}>Add another authenticator</button>

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

          <button onClick={handleVerify} disabled={loading}>
            Verify
          </button>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}
