"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";
import { summaryCards } from "@/lib/mock-data";
import { TasksCard } from "@/components/tasks/tasks-card";
import { MembersCard } from "@/components/family/members-card";

type AuthTab = "login" | "signup";

type MessageState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

async function ensureFamily() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return;

  const { data, error: familyLookupError } = await supabase
    .from("families")
    .select("id")
    .eq("created_by", user.id)
    .maybeSingle();

  if (familyLookupError) {
    throw familyLookupError;
  }

  if (!data) {
    const { error: insertError } = await supabase.from("families").insert({
      name: "My Family",
      created_by: user.id,
    });

    if (insertError) {
      throw insertError;
    }
  }
}

function Dashboard({ email }: { email: string }) {
  return (
    <main className="shell">
      <Sidebar />

      <section className="content">
        <header className="hero" id="dashboard">
          <div>
            <p className="eyebrow">Phase 1 starter</p>
            <h2>Your private family operations hub</h2>
            <p className="heroText">
              Logged in as <strong>{email}</strong>.
            </p>
          </div>
          <div className="heroActions">
            <a className="button primary" href="#tasks">
              Review tasks
            </a>
            <a className="button" href="/settings/security">
              Security
            </a>
            <button className="button" onClick={() => void supabase.auth.signOut()}>
              Log out
            </button>
          </div>
        </header>

        <TasksCard />
        <MembersCard />

        <section className="grid cards">
          {summaryCards.map((card) => (
            <article key={card.title} className="panel statCard">
              <p className="panelTitle">{card.title}</p>
              <h3>{card.value}</h3>
              <p className="muted">{card.note}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function AuthCard() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (tab === "signup" && password !== confirmPassword) return false;
    return true;
  }, [confirmPassword, email, password, tab]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (tab === "signup" && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Logged in successfully." });
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Account created. Check your email if Supabase asks you to confirm it.",
        });
      }
    }

    setLoading(false);
  }

  return (
    <div className="authShell">
      <div className="panel authCard">
        <div className="authTabs">
          <button className={tab === "login" ? "tabButton active" : "tabButton"} onClick={() => setTab("login")}>
            Login
          </button>
          <button className={tab === "signup" ? "tabButton active" : "tabButton"} onClick={() => setTab("signup")}>
            Sign up
          </button>
        </div>

        <form className="authForm" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {tab === "signup" ? (
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : null}

          {message ? (
            <div className={message.type === "error" ? "notice error" : "notice success"}>{message.text}</div>
          ) : null}

          <button className="button primary wideButton" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Please wait..." : tab === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncSession(nextSession: Session | null) {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        setRequiresMfa(false);
        setLoading(false);
        return;
      }

      try {
        await ensureFamily();

        const [{ data: factorsData, error: factorsError }, { data: aalData, error: aalError }] =
          await Promise.all([
            supabase.auth.mfa.listFactors(),
            supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          ]);

        if (!mounted) return;

        if (factorsError || aalError) {
          setRequiresMfa(false);
          return;
        }

        const verifiedTotpFactors = (factorsData?.totp ?? []).filter(
          (factor) => factor.status === "verified"
        );

        const mustVerifyMfa =
          verifiedTotpFactors.length > 0 &&
          aalData.nextLevel === "aal2" &&
          aalData.currentLevel !== "aal2";

        setRequiresMfa(mustVerifyMfa);

        if (mustVerifyMfa && typeof window !== "undefined" && window.location.pathname !== "/auth/mfa") {
          window.location.replace("/auth/mfa");
        }
      } catch (error) {
        console.error("Auth/session setup failed", error);
        setRequiresMfa(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main className="centerScreen">
        <div className="panel loadingPanel">
          <p className="eyebrow">Famli</p>
          <h2>Loading your session...</h2>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return <AuthCard />;
  }

  if (requiresMfa) {
    return (
      <main className="centerScreen">
        <div className="panel loadingPanel">
          <p className="eyebrow">Famli</p>
          <h2>Redirecting to two-factor verification...</h2>
        </div>
      </main>
    );
  }

  return <Dashboard email={session.user.email ?? "Signed in user"} />;
}
