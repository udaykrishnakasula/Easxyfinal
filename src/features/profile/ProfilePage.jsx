import React from "react";
import { User, Mail, Phone, Hash, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeading, EasyXCard } from "@/design/EasyX";

export default function ProfilePage() {
  const { user } = useAuth();
  const rows = [
    { icon: User, label: "Full name", value: user?.name },
    { icon: Mail, label: "Email", value: user?.email },
    { icon: Phone, label: "Phone", value: user?.phone },
    { icon: Hash, label: "Referral code", value: user?.referral_code },
    { icon: ShieldCheck, label: "KYC status", value: (user?.kyc_status || "none").toUpperCase() },
  ];
  return (
    <div data-testid="profile-page">
      <PageHeading title="Profile" subtitle="Your account details." icon={User} />
      <EasyXCard className="mt-6 max-w-lg p-0 overflow-hidden">
        <div className="divide-y divide-white/5">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-ex-ctrl bg-white/8"><Icon className="h-4 w-4 text-ex-lav-300" /></span>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ex-muted/70">{label}</div>
                <div className="font-medium text-ex-text">{value || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </EasyXCard>
    </div>
  );
}
