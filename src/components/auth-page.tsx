"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";
import { calendarItems, financeQueue, household, summaryCards, tasks } from "@/lib/mock-data";

type AuthTab = "login" | "signup";

type MessageState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

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
              Logged in as <strong>{email}</strong>. Next we will connect real tasks, real family data,
              and real finance items to Supabase.
            </p>
          </div>
          <div className="heroActions">
            <a className="button primary" href="#tasks">
              Review tasks
            </a>
            <button className="button" onClick={() => void supabase.auth.signOut()}>
              Log out
            </button>
          </div>
        </header>

        <section className="grid cards">
          {summaryCards.map((card) => (
            <article key={card.title} className="panel statCard">
              <p className="panelTitle">{card.title}</p>
              <h3>{card.value}</h3>
              <p className="muted">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid twoCols">
          <article className="panel" id="tasks">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Tasks</p>
                <h3>Personal, household, and future circle planning</h3>
              </div>
              <span className="pill">Recurring ready</span>
            </div>
            <div className="list">
              {tasks.map((task) => (
                <div key={task.title} className="listRow">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">
                      {task.category} · {task.assignees}
                    </p>
                  </div>
                  <div className="rowMeta">
                    <span className="pill">{task.visibility}</span>
                    <span>{task.due}</span>
                    <span>{task.subtasks} subtasks</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="finance">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Finance</p>
                <h3>Email-driven finance queue</h3>
              </div>
              <span className="pill warning">No files stored in V1</span>
            </div>
            <div className="list">
              {financeQueue.map((item) => (
                <div key={item.issuer + item.type} className="listRow">
                  <div>
                    <strong>{item.issuer}</strong>
                    <p className="muted">{item.type}</p>
                  </div>
                  <div className="rowMeta">
                    <span>{item.amount}</span>
                    <span>{item.due}</span>
                    <span className="pill">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid twoCols">
          <article className="panel" id="calendar">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Calendar</p>
                <h3>Visibility-aware events</h3>
              </div>
              <span className="pill">Private / household / circle</span>
            </div>
            <div className="list">
              {calendarItems.map((item) => (
                <div key={item.title} className="listRow">
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">{item.date}</p>
                  </div>
                  <div className="rowMeta">
                    <span className="pill">{item.visibility}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="family">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Family</p>
                <h3>Household and future circles</h3>
              </div>
              <span className="pill">Location-ready</span>
            </div>
            <div className="list">
              {household.members.map((member) => (
                <div key={member.name} className="listRow">
                  <div>
                    <strong>{member.name}</strong>
                    <p className="muted">{member.role}</p>
                  </div>
                  <div className="rowMeta">
                    <span>{member.location}</span>
                    <span>{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel" id="settings">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Next build steps</p>
              <h3>What we plug in after auth</h3>
            </div>
          </div>
          <ol className="steps">
            <li>Turn mock tasks into real user tasks stored in Supabase.</li>
            <li>Create the household membership tables.</li>
            <li>Add Google and Microsoft email/calendar connection pages.</li>
            <li>Build the finance unlock queue for password-protected PDFs.</li>
            <li>Guide you through Google and Microsoft OAuth setup.</li>
          </ol>
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
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

  async function handleForgotPassword() {
    if (!email) {
      setMessage({ type: "info", text: "Enter your email first, then click Forgot password again." });
      return;
    }

    setLoading(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "Password reset email sent. Open the link in your email to set a new password.",
      });
    }

    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "azure") {
  setLoading(true);

  const options =
    provider === "azure"
      ? {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          scopes: "openid email profile User.Read",
        }
      : {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        };

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    setMessage({ type: "error", text: error.message });
    setLoading(false);
  }
}

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  }

  return (
    <div className="authShell">
      <div className="authIntro panel">
        <p className="eyebrow">Welcome to Famli</p>
        <h1>Private home hub, built one careful step at a time.</h1>
        <p className="heroText">
          Start with your own secure account. Next we will add forgot password, Google + Microsoft,
          and then guide you through 2FA setup with an authenticator app.
        </p>
        <div className="miniStats">
          <div className="miniStat">
            <strong>Auth first</strong>
            <span>Email, Google, Microsoft</span>
          </div>
          <div className="miniStat">
            <strong>Privacy-first</strong>
            <span>Private, household, future circles</span>
          </div>
          <div className="miniStat">
            <strong>Next milestone</strong>
            <span>Real tasks in Supabase</span>
          </div>
        </div>
      </div>

      <div className="panel authCard">
        <div className="authTabs">
          <button className={tab === "login" ? "tabButton active" : "tabButton"} onClick={() => setTab("login")}>
            Login
          </button>
          <button className={tab === "signup" ? "tabButton active" : "tabButton"} onClick={() => setTab("signup")}>
            Sign up
          </button>
        </div>

        <div className="socialButtons">
          <button className="button socialButton" onClick={() => void handleOAuth("google")} disabled={loading}>
            Continue with Google
          </button>
          <button className="button socialButton" onClick={() => void handleOAuth("azure")} disabled={loading}>
            Continue with Microsoft
          </button>
        </div>

        <div className="divider">
          <span>or use email</span>
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

        <button className="linkButton" onClick={() => void handleForgotPassword()} disabled={loading}>
          Forgot password?
        </button>

        <p className="tinyMuted">
          2FA will be added right after this auth step is working. We will guide you through it step by step.
        </p>
      </div>
    </div>
  );
}

export function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
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

  return <Dashboard email={session.user.email ?? "Signed in user"} />;
}
