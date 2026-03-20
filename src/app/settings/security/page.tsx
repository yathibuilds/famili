import { EnableTwoFactorCard } from "@/components/security/enable-two-factor-card";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Security</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Protect your Famli account with two-factor authentication.
          </p>
        </div>

        <EnableTwoFactorCard />
      </div>
    </main>
  );
}
