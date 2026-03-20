import { EnableTwoFactorCard } from "@/components/security/enable-two-factor-card";

export default function SecurityPage() {
  return (
    <main className="centerScreen" style={{ padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <EnableTwoFactorCard />
      </div>
    </main>
  );
}
