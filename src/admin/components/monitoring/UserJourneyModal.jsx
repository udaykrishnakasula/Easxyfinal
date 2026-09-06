import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Search,
  X,
  Smartphone,
  Globe,
  Layers,
  ArrowRight,
  Shield,
  Activity,
} from "lucide-react";
import { useAdminUserJourney } from "@/admin/adminApi";
import { EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

dayjs.extend(relativeTime);

export default function UserJourneyModal({ isOpen, onClose, initialUserId = "" }) {
  const [searchInput, setSearchInput] = useState(initialUserId);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);

  const { data: journeyData, isLoading, isFetching, refetch } = useAdminUserJourney(selectedUserId);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedUserId(searchInput.trim());
    }
  };

  const timeline = journeyData?.timeline || [];
  const stats = journeyData?.stats || {
    totalEvents: 0,
    totalErrors: 0,
    rageClicks: 0,
    deadClicks: 0,
    failedActions: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-ex-card-bg border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ex-text flex items-center gap-2">
                User Activity Journey Inspector
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  Observability
                </span>
              </h3>
              <p className="text-xs text-ex-muted mt-0.5">
                Inspect step-by-step chronological user actions, sessions, failures, and friction hotspots.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ex-muted hover:text-white hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Search Bar */}
        <div className="p-4 border-b border-white/5 bg-black/20">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
              <input
                type="text"
                placeholder="Enter User ID (e.g. usr_1, admin_1) or email to inspect journey..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ex-text placeholder:text-ex-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-2"
            >
              <Search className="h-3.5 w-3.5" />
              Inspect
            </button>
          </form>

          {/* Quick User Suggestions */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-ex-muted overflow-x-auto pb-1">
            <span>Quick inspect:</span>
            {["usr_1", "usr_2", "usr_3", "admin_1", "anonymous"].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setSearchInput(id);
                  setSelectedUserId(id);
                }}
                className={`px-2 py-0.5 rounded-md border text-[10px] transition ${
                  selectedUserId === id
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                    : "bg-white/5 border-white/10 hover:border-white/20 text-ex-muted hover:text-white"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary Bar */}
        {selectedUserId && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-white/[0.01] border-b border-white/5 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-ex-muted uppercase block">Total Events</span>
              <span className="text-sm font-bold text-white mt-0.5">{stats.totalEvents}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-[10px] text-red-400 uppercase block">Errors Occurred</span>
              <span className="text-sm font-bold text-red-400 mt-0.5">{stats.totalErrors}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] text-amber-400 uppercase block">Failed Actions</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5">{stats.failedActions}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-[10px] text-orange-400 uppercase block">Rage Clicks</span>
              <span className="text-sm font-bold text-orange-400 mt-0.5">{stats.rageClicks}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-blue-400 uppercase block">Dead Clicks</span>
              <span className="text-sm font-bold text-blue-400 mt-0.5">{stats.deadClicks}</span>
            </div>
          </div>
        )}

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!selectedUserId ? (
            <EasyXEmptyState
              icon={User}
              title="Search for a User to Inspect"
              description="Enter a user identifier or click a quick suggestion above to see their full action timeline."
            />
          ) : isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <EasyXLoader size="lg" />
              <p className="text-xs text-ex-muted mt-3">Reconstructing user journey timeline...</p>
            </div>
          ) : timeline.length === 0 ? (
            <EasyXEmptyState
              icon={Activity}
              title="No Recorded Activity for this User"
              description="This user has not generated any telemetry events or error logs yet."
            />
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {timeline.map((item, idx) => {
                const isError = item.type === "error" || item.success === false;
                const isFriction = item.action === "RAGE_CLICK" || item.action === "DEAD_CLICK";
                const isFunnel = item.funnelName || item.action?.includes("FUNNEL");

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                        isError
                          ? "bg-red-500/20 border-red-500 text-red-400 ring-4 ring-red-500/10"
                          : isFriction
                          ? "bg-amber-500/20 border-amber-500 text-amber-400"
                          : isFunnel
                          ? "bg-purple-500/20 border-purple-500 text-purple-400"
                          : "bg-white/10 border-white/20 text-ex-muted group-hover:border-purple-400"
                      }`}
                    >
                      {isError ? (
                        <XCircle className="h-3 w-3" />
                      ) : isFriction ? (
                        <Flame className="h-3 w-3" />
                      ) : isFunnel ? (
                        <Layers className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </div>

                    {/* Timeline Card */}
                    <div
                      className={`p-3.5 rounded-xl border transition ${
                        isError
                          ? "bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40"
                          : isFriction
                          ? "bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40"
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                isError
                                  ? "bg-red-500/20 text-red-300"
                                  : isFriction
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {item.action || item.errorName || item.category || "ACTION"}
                            </span>

                            <span className="text-xs text-ex-text font-medium">
                              {item.route || item.page || "/"}
                            </span>

                            {item.funnelName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                Funnel: {item.funnelName} ({item.step || "step"})
                              </span>
                            )}
                          </div>

                          {/* Message or Details */}
                          {item.message && (
                            <p className="text-xs text-red-300 mt-1 font-mono break-all">
                              {item.message}
                            </p>
                          )}

                          {item.element && (
                            <p className="text-[11px] text-ex-muted mt-1">
                              Target: <code className="text-ex-text">{item.element}</code>{" "}
                              {item.elementText && `("${item.elementText}")`}
                            </p>
                          )}

                          {item.clickCount && item.clickCount > 1 && (
                            <p className="text-[11px] text-orange-300 mt-0.5">
                              Repeated click bursts: {item.clickCount} rapid clicks detected
                            </p>
                          )}
                        </div>

                        {/* Timestamp & Duration */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-ex-muted block font-mono">
                            {dayjs(item.timestamp).format("HH:mm:ss")}
                          </span>
                          <span className="text-[10px] text-ex-muted block">
                            {dayjs(item.timestamp).fromNow()}
                          </span>
                          {typeof item.durationSeconds === "number" && (
                            <span className="text-[10px] text-purple-300 block font-mono mt-0.5">
                              ⏱ {item.durationSeconds}s
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Device & Correlation Meta */}
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-ex-muted">
                        <div className="flex items-center gap-3">
                          {item.deviceType && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              {item.deviceType} • {item.browser || "Browser"}
                            </span>
                          )}
                          {item.sessionId && (
                            <span className="font-mono truncate max-w-[120px]">
                              Sess: {item.sessionId.slice(-8)}
                            </span>
                          )}
                        </div>
                        {item.correlationId && (
                          <span className="font-mono text-purple-400 truncate max-w-[140px]">
                            Corr: {item.correlationId.slice(-8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-ex-muted">
            Viewing telemetry timeline for <strong className="text-white">{selectedUserId || "none"}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-medium border border-white/10 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
