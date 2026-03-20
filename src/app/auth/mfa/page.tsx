"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Notice = {
  type: "success" | "error" | "info";
  text: string;
} | null;

type FactorOption = {
  id: string;
  friendly_name?: string;
  status?: string;
};

export default function MfaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [factors, setFactors] = useState<FactorOption[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [code, setCode] = useState("");

  const hasFactors = useMemo(() => factors.length > 0, [factors]);

  useEffect(() => {
    async function loadPage() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.replace("/");
        return;
      }

      const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) {
        setNotice({ type: "error", text: factorError.message });
        setLoading(false);
        return;
      }

      const verifiedFactors = (factorData?.totp ?? []).filter((factor) => factor.status === "verified");
      setFactors(verifiedFactors);
      setSelectedFactorId(verifiedFactors[0]?.id ?? "");

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalError && aalData?.currentLevel === "aal2") {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    void loadPage();
  }, [router]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFactorId) {
      setNotice({ type: "error", text: "No verified authenticator is available on this account." });
      return;
    }

    if (code.trim().length !== 6) {
      setNotice({ type: "error", text: "Enter your 6-digit authenticator code." });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: selectedFactorId,
    });

    if (challengeError) {
      setSubmitting(false);
      setNotice({ type: "error", text: challengeError.message });
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: selectedFactorId,
      challengeId: challengeData.id,
      code: code.trim(),
    });

    setSubmitting(false);

    if (verifyError) {
      setNotice({ type: "error", text: verifyError.message });
      return;
    }

    router.replace("/");
  }

  if (loading) {
    return (
      <main className="centerScreen">
        <div className="panel loadingPanel">
          <p className="eyebrow">Famli Security</p>
          <h2>Preparing two-factor verification...</h2>
        </div>
      </main>
    );
  }

  return (
    <main className="centerScreen" style={{ padding: "24px 16px" }}>
      <div className="panel authCard" style={{ width: "100%", maxWidth: 520 }}>
        <p className="eyebrow">Famli Security</p>
        <h1>Enter your authenticator code</h1>
        <p className="heroText">Use the 6-digit code from the authenticator app linked to your account.</p>

        {!hasFactors ? (
          <div className="notice error">
            No verified authenticator is enabled on this account yet. Return to Settings and enable 2FA first.
          </div>
        ) : (
          <form className="authForm" onSubmit={handleVerify}>
            {factors.length > 1 ? (
              <label>
                <span>Choose authenticator</span>
                <select value={selectedFactorId} onChange={(event) => setSelectedFactorId(event.target.value)}>
                  {factors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || "Authenticator app"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label>
              <span>6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>

            {notice ? <div className={notice.type === "error" ? "notice error" : "notice success"}>{notice.text}</div> : null}

            <button className="button primary wideButton" type="submit" disabled={submitting || code.length !== 6}>
              {submitting ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
