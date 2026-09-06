import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Smartphone,
  ChevronRight,
  TrendingDown,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { useAdminFailedActions } from "@/admin/adminApi";
import { EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

dayjs.extend(relativeTime);

export default function FailedActionsTab({ onSelectUser }) {
  const { data: failedData, isLoading, refetch, isFetching } = useAdminFailedActions(40);

  const breakdown = failedData?.breakdown || [];
  const recentFailures = failedData?.recentFailures || [];
  const totalFailed = failedData?.totalFailedEvents || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-300">Total Failed Actions</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{totalFailed}</p>
          <span className="text-[11px] text-red-300/80 mt-1 block">
            Across KYC, Deposits, Auth & Investments
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ex-muted">Unique Failure Types</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{breakdown.length}</p>
          <span className="text-[11px] text-ex-muted mt-1 block">Aggregated action failure signatures</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ex-muted">Impacted Operations</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {new Set(recentFailures.map((f) => f.category)).size}
          </p>
          <span className="text-[11px] text-ex-muted mt-1 block">Distinct business domains</span>
        </div>
      </div>

      {/* Top Failure Types Breakdown */}
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-red-400" />
          Failure Frequency by Action
        </h3>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <EasyXLoader size="md" />
          </div>
        ) : breakdown.length === 0 ? (
          <EasyXEmptyState
            icon={Activity}
            title="Zero Action Failures"
            description="No failed user actions have been recorded yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-300 font-mono px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                      {item.action}
                    </span>
                    <span className="text-[11px] text-ex-muted font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-ex-muted">
                    <span>
                      Route: <strong className="text-white font-mono">{item.route}</strong>
                    </span>
                    <span>
                      Impacted: <strong className="text-white">{item.users?.length || 1} users</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-white font-mono">{item.count}</span>
                  <span className="text-[10px] text-red-400 block font-semibold">failures</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Failure Logs */}
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-purple-400" />
          Recent Failure Log Entries
        </h3>

        {recentFailures.length === 0 ? null : (
          <div className="space-y-2">
            {recentFailures.slice(0, 15).map((f, i) => (
              <div
                key={f.id || i}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-red-500/20 transition flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0 mt-0.5">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white font-mono">{f.action}</span>
                      <span className="text-[11px] text-ex-muted font-mono">{f.route}</span>
                      {f.user?.email && (
                        <button
                          onClick={() => onSelectUser && onSelectUser(f.user.id || f.user.email)}
                          className="text-[11px] text-purple-300 hover:underline flex items-center gap-0.5"
                        >
                          <span>{f.user.email}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {f.metadata?.errorMessage && (
                      <p className="text-xs text-red-300 mt-1 font-mono break-all">
                        {String(f.metadata.errorMessage)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-ex-muted block font-mono">
                    {dayjs(f.timestamp).format("HH:mm:ss")}
                  </span>
                  <span className="text-[10px] text-ex-muted block">
                    {dayjs(f.timestamp).fromNow()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
