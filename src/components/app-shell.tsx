"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";
import { summaryCards } from "@/lib/mock-data";
import { TasksPanel } from "@/components/tasks/tasks-panel";
import { MembersPanel } from "@/components/family/members-panel";

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
    <main className="min-h-screen bg-neutral-950 text-white lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar />

      <section className="space-y-6 px-6 py-8 md:px-8 lg:px-10">
        <header
          id="dashboard"
          className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-6 shadow-2xl shadow-black/20"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                FamiliHub workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Your private family operations hub
              </h1>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                Signed in as <span className="font-medium text-white">{email}</span>. Keep
                tasks, members, and security in one clean workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#tasks"
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
              >
                Review tasks
              </a>
              <a
                href="/settings/security"
                className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Security
              </a>
              <button
                className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                onClick={() => void supabase.auth.signOut()}
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className="rounded-3xl border border-neutral-800 bg-neutral-900/75 p-5 shadow-xl shadow-black/10"
            >
              <p className="text-sm text-neutral-400">{card.title}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{card.value}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{card.note}</p>
            </article>
          ))}
        </section>

        <TasksPanel />
        <MembersPanel />
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
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            FamiliHub
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Shared family life, finally organised.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-300">
            Bring tasks, household planning, and personal coordination into one calm
            private workspace.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Tasks", "Shared ownership and deadline visibility"],
              ["Members", "One place to manage your family circle"],
              ["Security", "MFA protection for sensitive actions"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-950 p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                tab === "login" ? "bg-cyan-400 text-neutral-950" : "text-neutral-300 hover:bg-neutral-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                tab === "signup" ? "bg-cyan-400 text-neutral-950" : "text-neutral-300 hover:bg-neutral-900"
              }`}
            >
              Sign up
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
              />
            </div>

            {tab === "signup" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Confirm password</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
              </div>
            ) : null}

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  message.type === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <button
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!canSubmit || loading}
            >
              {loading ? "Please wait..." : tab === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export function AppShell() {
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
      <main className="grid min-h-screen place-items-center bg-neutral-950 px-6 py-8 text-white">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            FamiliHub
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Loading your session...</h2>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return <AuthCard />;
  }

  if (requiresMfa) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950 px-6 py-8 text-white">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            FamiliHub
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Redirecting to two-factor verification...</h2>
        </div>
      </main>
    );
  }

  return <Dashboard email={session.user.email ?? "Signed in user"} />;
}
