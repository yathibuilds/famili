"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";
import { FamilyAccessPanel } from "@/components/family/family-access-panel";
import { CalendarOverview } from "@/components/calendar/calendar-overview";

type AuthTab = "login" | "signup";

type MessageState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

type ProfileState = {
  display_name: string | null;
  email: string | null;
};

async function loadProfile(userId: string): Promise<ProfileState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }

  return data ?? null;
}

function Dashboard({
  session,
  profile,
}: {
  session: Session;
  profile: ProfileState | null;
}) {
  const displayName =
    profile?.display_name || session.user.user_metadata?.display_name || "there";

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
                Famili workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Welcome, {displayName}
              </h1>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                Your account stays individual by default. Family access only opens when you
                create or accept an invite. Calendar is now ready for personal planning and
                shared family scheduling foundations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#calendar"
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
              >
                Open calendar
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

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Individual first", "Your account starts private and separate by default."],
            ["Invite-only family", "Family membership now happens only through email invites."],
            ["Calendar ready", "Agenda, mini month view, native event creation, and task due surfacing are now connected."],
          ].map(([title, note]) => (
            <article
              key={title}
              className="rounded-3xl border border-neutral-800 bg-neutral-900/75 p-5 shadow-xl shadow-black/10"
            >
              <p className="text-sm font-medium text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{note}</p>
            </article>
          ))}
        </section>

        <CalendarOverview session={session} profile={profile} />
        <FamilyAccessPanel session={session} profile={profile} />
      </section>
    </main>
  );
}

function AuthCard() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthMonth, setBirthMonth] = useState("1");
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 18));
  const [message, setMessage] = useState<MessageState>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (tab === "signup") {
      if (!displayName.trim()) return false;
      if (password !== confirmPassword) return false;
      if (!birthMonth || !birthYear) return false;
    }
    return true;
  }, [birthMonth, birthYear, confirmPassword, displayName, email, password, tab]);

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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          display_name: displayName.trim(),
          birth_month: Number(birthMonth),
          birth_year: Number(birthYear),
          home_timezone: timezone,
          current_timezone: timezone,
        });

        if (profileError) {
          setMessage({ type: "error", text: profileError.message });
        } else {
          setMessage({
            type: "success",
            text: "Account created. Verify your email if prompted, then log in to continue.",
          });
        }
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-cyan-500/15 via-neutral-900 to-neutral-900 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Famili
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Life, gently organized.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-300">
            Start as an individual. Add family only by invite. Keep your private world
            separate until you choose to share it.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Private by default", "No family data is created or shared automatically."],
              ["Invite-only family", "Family members join your level 2 container by email invite."],
              ["Protected access", "Two-factor authentication remains available for security-sensitive actions."],
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
            {tab === "signup" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200">Display name</label>
                <input
                  type="text"
                  placeholder="How should Famili greet you?"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
              </div>
            ) : null}

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
              <>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Birth month</label>
                    <select
                      value={birthMonth}
                      onChange={(event) => setBirthMonth(event.target.value)}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200">Birth year</label>
                    <input
                      type="number"
                      min="1900"
                      max={String(new Date().getFullYear())}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    />
                  </div>
                </div>
              </>
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
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncSession(nextSession: Session | null) {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setRequiresMfa(false);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await loadProfile(nextSession.user.id);
        if (!mounted) return;
        setProfile(nextProfile);

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

        if (
          mustVerifyMfa &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/auth/mfa"
        ) {
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
            Famili
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
            Famili
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Redirecting to two-factor verification...</h2>
        </div>
      </main>
    );
  }

  return <Dashboard session={session} profile={profile} />;
}
