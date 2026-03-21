import { TwoFactorCard } from "@/components/security/two-factor-card";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Security
          </p>
          <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
            Protect your FamiliHub account
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Enable and manage two-factor authentication so sensitive actions stay protected.
          </p>
        </div>

        <TwoFactorCard />
      </div>
    </main>
  );
}
