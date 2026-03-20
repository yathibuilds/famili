"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        setErrorMessage(
          "Open this page using the password reset link from your email. If the link has expired, request a new reset email from the login page.",
        );
      }
    });
  }, []);

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessage("Password updated successfully. Go back to the home page and log in.");
    }

    setLoading(false);
  }

  return (
    <main className="centerScreen">
      <div className="panel resetCard">
        <p className="eyebrow">Famli</p>
        <h1>Set a new password</h1>
        <p className="muted">Use a password you can remember. We will add 2FA after login is working.</p>

        {errorMessage ? <div className="notice error">{errorMessage}</div> : null}
        {message ? <div className="notice success">{message}</div> : null}

        <form className="authForm" onSubmit={handleReset}>
          <label>
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
            />
          </label>

          <label>
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
          </label>

          <button className="button primary wideButton" type="submit" disabled={!ready || loading || !password || !confirmPassword}>
            {loading ? "Updating..." : "Save new password"}
          </button>
        </form>

        <Link href="/" className="linkButton asLink">
          Back to login
        </Link>
      </div>
    </main>
  );
}
