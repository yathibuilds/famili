"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";
import { calendarItems, financeQueue, household, summaryCards, tasks } from "@/lib/mock-data";
import { TasksCard } from "@/components/tasks/tasks-card";
import { MembersCard } from "@/components/family/members-card";

type AuthTab = "login" | "signup";

type MessageState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

// ✅ ADD THIS FUNCTION
async function ensureFamily() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("families")
    .select("id")
    .eq("created_by", user?.id)
    .maybeSingle();

  if (!data && user) {
    await supabase.from("families").insert({
      name: "My Family",
      created_by: user.id,
    });
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

    setLoading(true);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: "error", text: error.message });
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage({ type: "error", text: error.message });
    }

    setLoading(false);
  }

  return (
    <div className="authShell">
      <div className="panel authCard">
        <form onSubmit={handleSubmit}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}

export function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function syncSession(nextSession: Session | null) {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        setLoading(false);
        return;
      }

      // ✅ THIS IS THE CORRECT PLACE
      await ensureFamily();

      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        syncSession(nextSession);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!session?.user) return <AuthCard />;

  return <Dashboard email={session.user.email ?? ""} />;
}
