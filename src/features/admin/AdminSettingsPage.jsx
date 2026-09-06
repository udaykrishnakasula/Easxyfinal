import React, { useEffect, useState } from "react";
import { Settings, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useAdminDepositSettings, useSaveDepositAddresses } from "./adminApi";
import { apiError } from "@/lib/api";
import { PageHeading, EasyXCard, EasyXButton, EasyXLoader } from "@/design/EasyX";

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useAdminDepositSettings();
  const save = useSaveDepositAddresses();

  const [trc20, setTrc20] = useState("");
  const [bep20, setBep20] = useState("");

  useEffect(() => {
    if (settings) {
      setTrc20(settings.addresses?.TRC20 || "");
      setBep20(settings.addresses?.BEP20 || "");
    }
  }, [settings]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ trc20: trc20.trim(), bep20: bep20.trim() });
      toast.success("Deposit addresses saved");
    } catch (err) {
      toast.error(apiError(err, "Could not save addresses"));
    }
  };

  const canSave = trc20.trim().length >= 6 && bep20.trim().length >= 6 && !save.isPending;

  return (
    <div data-testid="admin-settings-page">
      <PageHeading title="Deposit Settings" subtitle="Official USDT deposit addresses shown to users." icon={Settings} />

      {isLoading || !settings ? (
        <EasyXLoader />
      ) : (
        <EasyXCard className="mt-5 max-w-xl">
          {settings.configured ? (
            <div className="flex items-center gap-2 rounded-ex-ctrl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200" data-testid="settings-configured">
              <CheckCircle2 className="h-4 w-4" /> Addresses configured. Users can deposit.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-ex-ctrl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" data-testid="settings-not-configured">
              <AlertTriangle className="h-4 w-4" /> Placeholder addresses in use — set the real ones below.
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4" data-testid="admin-settings-form">
            <div>
              <label className="text-xs text-ex-muted">TRC20 (Tron) USDT address</label>
              <input
                value={trc20}
                onChange={(e) => setTrc20(e.target.value)}
                className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none font-mono"
                data-testid="settings-trc20"
              />
            </div>
            <div>
              <label className="text-xs text-ex-muted">BEP20 (BSC) USDT address</label>
              <input
                value={bep20}
                onChange={(e) => setBep20(e.target.value)}
                className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none font-mono"
                data-testid="settings-bep20"
              />
            </div>
            <EasyXButton type="submit" disabled={!canSave} loading={save.isPending} data-testid="settings-save">
              Save addresses
            </EasyXButton>
          </form>
        </EasyXCard>
      )}
    </div>
  );
}
